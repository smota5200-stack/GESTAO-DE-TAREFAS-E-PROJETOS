import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { supabase } from '../lib/supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loading } = useProjects();
  const activeProjects = projects.filter(p => p.status === 'A Fazer').slice(0, 4);

  // Dados reais de demandas
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyPaid, setMonthlyPaid] = useState(0);
  const [monthlyPending, setMonthlyPending] = useState(0);
  const [totalDemands, setTotalDemands] = useState(0);
  const [completedDemands, setCompletedDemands] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<{ title: string; dueDate: string; projectTitle: string; workStatus: string }[]>([]);
  const [projectProgress, setProjectProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Buscar todos os projetos
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, title');

      if (!allProjects || allProjects.length === 0) return;

      const projectIds = allProjects.map(p => p.id);
      const projectMap: Record<string, string> = {};
      allProjects.forEach((p: any) => { projectMap[p.id] = p.title; });

      // Buscar todas as demandas
      const { data: demands } = await supabase
        .from('project_demands')
        .select('*')
        .in('project_id', projectIds);

      if (!demands) return;

      setTotalDemands(demands.length);
      setCompletedDemands(demands.filter((d: any) => d.work_status === 'Entregue' && d.payment_status === 'Pago').length);

      // Progresso por projeto (demandas concluídas / total)
      const progressCounts: Record<string, { total: number; done: number }> = {};
      demands.forEach((d: any) => {
        if (!progressCounts[d.project_id]) progressCounts[d.project_id] = { total: 0, done: 0 };
        progressCounts[d.project_id].total++;
        if (d.work_status === 'Entregue' && d.payment_status === 'Pago') progressCounts[d.project_id].done++;
      });
      const prog: Record<string, number> = {};
      Object.entries(progressCounts).forEach(([pid, c]) => {
        prog[pid] = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
      });
      setProjectProgress(prog);

      // Calcular receita do mês atual
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let paid = 0;
      let pending = 0;

      demands.forEach((d: any) => {
        const amount = parseFloat(d.amount) || 0;
        // Verificar se a demanda tem prazo neste mês
        const parts = (d.due_date || '').split('/');
        let isCurrentMonth = false;
        if (parts.length === 3) {
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          isCurrentMonth = month === currentMonth && year === currentYear;
        }

        if (isCurrentMonth) {
          if (d.payment_status === 'Pago') {
            paid += amount;
          } else {
            pending += amount;
          }
        }
      });

      setMonthlyRevenue(paid + pending);
      setMonthlyPaid(paid);
      setMonthlyPending(pending);

      // Próximos prazos — demandas não concluídas com data
      const upcoming = demands
        .filter((d: any) => d.work_status !== 'Entregue' && d.due_date)
        .map((d: any) => ({
          title: d.title,
          dueDate: d.due_date,
          projectTitle: projectMap[d.project_id] || '',
          workStatus: d.work_status
        }))
        .sort((a: any, b: any) => {
          // Ordenar por data mais próxima
          const parseDate = (s: string) => {
            const p = s.split('/');
            if (p.length !== 3) return 99999999;
            return parseInt(p[2]) * 10000 + parseInt(p[1]) * 100 + parseInt(p[0]);
          };
          return parseDate(a.dueDate) - parseDate(b.dueDate);
        })
        .slice(0, 5);

      setUpcomingDeadlines(upcoming);
    };

    fetchDashboardData();
  }, []);

  const handleAlert = (msg: string) => alert(msg);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Painel de Controle</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">Bem-vindo de volta. Aqui está o resumo das suas demandas hoje.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Widget */}
        <div className="col-span-1 lg:col-span-8 bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Receita Mensal</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ganhos do mês atual</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary">R$ {monthlyRevenue.toFixed(2)}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pago</p>
              </div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">R$ {monthlyPaid.toFixed(2)}</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-amber-500 text-sm">pending</span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendente</p>
              </div>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">R$ {monthlyPending.toFixed(2)}</p>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-500 text-sm">list_alt</span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demandas</p>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{totalDemands}</p>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">task_alt</span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Concluídas</p>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{completedDemands}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Widget */}
        <div className="col-span-1 lg:col-span-4 bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <button onClick={() => navigate('/financas')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-black/20 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all group border border-transparent hover:border-primary/30">
              <span className="material-symbols-outlined text-3xl mb-3 text-primary group-hover:scale-110 transition-transform">receipt_long</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary">Criar Fatura</span>
            </button>
            <button onClick={() => navigate('/projetos', { state: { openNewModal: true } })} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-black/20 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all group border border-transparent hover:border-primary/30">
              <span className="material-symbols-outlined text-3xl mb-3 text-primary group-hover:scale-110 transition-transform">assignment_add</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary">Novo Projeto</span>
            </button>
            <button onClick={() => navigate('/clientes')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-black/20 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all group border border-transparent hover:border-primary/30">
              <span className="material-symbols-outlined text-3xl mb-3 text-primary group-hover:scale-110 transition-transform">person_add</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary">Novo Cliente</span>
            </button>
            <button onClick={() => navigate('/precos')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-black/20 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all group border border-transparent hover:border-primary/30">
              <span className="material-symbols-outlined text-3xl mb-3 text-primary group-hover:scale-110 transition-transform">sell</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary">Tabela Preços</span>
            </button>
          </div>
        </div>

        {/* Active Projects */}
        <div className="col-span-1 lg:col-span-7 bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Projetos Ativos</h3>
            <button onClick={() => navigate('/projetos')} className="text-xs font-bold text-primary hover:underline uppercase tracking-wider">Ver Todos</button>
          </div>
          <div className="space-y-4">
            {activeProjects.length > 0 ? (
              activeProjects.map((project, i) => (
                <div key={i} onClick={() => navigate(`/projetos/${project.id}`)} className="cursor-pointer p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{project.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{project.client}</p>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wide ${project.status === 'Em Revisão' ? 'bg-amber-500/10 text-amber-500' :
                      project.status === 'A Fazer' ? 'bg-slate-100 dark:bg-white/10 text-slate-500' : 'bg-primary/10 text-primary'
                      }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden mt-4">
                    <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${projectProgress[project.id] || 0}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[10px] font-medium text-slate-500">{projectProgress[project.id] || 0}% Entregue</p>
                    <p className="text-[10px] font-medium text-slate-500">{project.dueDate}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="size-12 bg-slate-100 dark:bg-black/20 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <span className="material-symbols-outlined">work</span>
                </div>
                <p className="text-sm font-medium text-slate-500">Nenhum projeto ativo no momento.</p>
                <button onClick={() => navigate('/projetos', { state: { openNewModal: true } })} className="text-xs font-bold text-primary hover:underline mt-2">Criar primeiro projeto</button>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="col-span-1 lg:col-span-5 bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Próximos Prazos</h3>
          {upcomingDeadlines.length > 0 ? (
            <div className="space-y-3 flex-1">
              {upcomingDeadlines.map((d, i) => {
                // Calcular dias restantes
                const parts = d.dueDate.split('/');
                const dueMs = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
                const diffDays = Math.ceil((dueMs - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isUrgent = diffDays >= 0 && diffDays <= 3;

                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                    <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-500/10 text-red-500' :
                      isUrgent ? 'bg-amber-500/10 text-amber-500' :
                        'bg-primary/10 text-primary'
                      }`}>
                      <span className="material-symbols-outlined text-sm">{isOverdue ? 'warning' : 'event'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{d.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{d.projectTitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-500'
                        }`}>
                        {d.dueDate}
                      </p>
                      <p className={`text-[9px] font-bold ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                        {isOverdue ? `${Math.abs(diffDays)}d atrasado` : diffDays === 0 ? 'Hoje!' : `${diffDays}d restantes`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="size-12 bg-slate-100 dark:bg-black/20 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <span className="material-symbols-outlined">event</span>
                </div>
                <p className="text-sm font-medium text-slate-500">Nenhum prazo pendente.</p>
                <p className="text-xs text-slate-400 mt-1">Todas as demandas estão concluídas!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;