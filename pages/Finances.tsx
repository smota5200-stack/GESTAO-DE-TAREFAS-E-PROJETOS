import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ProjectDemand, Project } from '../types';

const Finances: React.FC = () => {
  const [demands, setDemands] = useState<ProjectDemand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [demandsRes, projectsRes] = await Promise.all([
        supabase.from('project_demands').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('id, title').order('created_at', { ascending: false })
      ]);

      if (demandsRes.data) {
        setDemands(demandsRes.data.map((row: any) => ({
          id: row.id,
          projectId: row.project_id,
          priceItemId: row.price_item_id,
          title: row.title,
          type: row.type,
          amount: parseFloat(row.amount) || 0,
          dueDate: row.due_date || '',
          workStatus: row.work_status,
          paymentStatus: row.payment_status,
          description: row.description || '',
          driveLink: row.drive_link || '',
          externalSystemLink: row.external_system_link || '',
          totalQuantity: row.total_quantity || 1,
          completedQuantity: row.completed_quantity || 0
        })));
      }

      if (projectsRes.data) {
        setProjects(projectsRes.data.map((row: any) => ({
          id: row.id,
          title: row.title,
          client: '',
          priority: 'Média' as const,
          status: 'A Fazer' as const,
          progress: 0,
          dueDate: ''
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Aggregated calculations
  const totalBalance = demands.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingPayments = demands.filter(d => d.paymentStatus === 'Pendente').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = demands.filter(d => d.paymentStatus === 'Pendente').length;
  const completedPayments = demands.filter(d => d.paymentStatus === 'Pago').reduce((acc, curr) => acc + curr.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago': return 'bg-emerald-500/10 text-emerald-500';
      case 'Pendente': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'Pago': return 'bg-emerald-500';
      case 'Pendente': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getBillingTypeBadge = (type: string) => {
    switch (type) {
      case 'Pacote': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Avulso': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  }

  const handleAction = (msg: string) => {
    alert(msg);
  };

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.title || 'Projeto Desconhecido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Visão Financeira</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Consolidado de todas as demandas financeiras ativas por projeto.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleAction('Filtro de período (Ex: Último mês, Este Ano).')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/30 transition-colors text-slate-700 dark:text-slate-200">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            Consolidado Geral
          </button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative">
            <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-inner flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">account_balance</span>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">Gerado</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium relative">Valor Total Gerado (Todos os Projetos)</p>
          <h3 className="text-3xl font-black mt-1 text-slate-900 dark:text-white tracking-tight relative">R$ {totalBalance.toFixed(2)}</h3>
          <div className="mt-5 h-1.5 w-full bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden relative">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(completedPayments / totalBalance) * 100 || 0}%` }}></div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-amber-500/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 size-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium relative">A Receber / Pendente</p>
          <h3 className="text-3xl font-black mt-1 text-amber-500 tracking-tight relative">R$ {pendingPayments.toFixed(2)}</h3>
          <p className="text-xs font-medium text-slate-400 mt-3 flex items-center gap-1.5 relative">
            <span className="size-1.5 rounded-full bg-amber-500"></span> {pendingCount} demandas aguardando pagamento
          </p>
        </div>

        {/* Completed Payments */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-emerald-500/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 size-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium relative">Faturamento Concluído</p>
          <h3 className="text-3xl font-black mt-1 text-emerald-500 tracking-tight relative">R$ {completedPayments.toFixed(2)}</h3>
          <p className="text-xs font-medium text-slate-400 mt-3 flex items-center gap-1.5 relative">
            <span className="size-1.5 rounded-full bg-emerald-500"></span> Valor em caixa
          </p>
        </div>
      </div>

      {/* Demandas Financeiras Table */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-black/10">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Todas as Demandas Financeiras</h3>
          <span className="text-xs text-slate-500">Listagem de cobranças vinculadas aos projetos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-surface-dark border-b border-slate-200 dark:border-white/5 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Demanda (Serviço)</th>
                <th className="px-6 py-4">Projeto Relacionado</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {demands.map((demand) => (
                <tr key={demand.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-200">{demand.title}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    {getProjectName(demand.projectId)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getBillingTypeBadge(demand.type)}`}>
                      {demand.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-sm text-slate-900 dark:text-white">
                    R$ {demand.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    {demand.dueDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${getStatusColor(demand.paymentStatus)}`}>
                      <span className={`size-1.5 rounded-full ${getStatusDot(demand.paymentStatus)}`}></span>
                      {demand.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {demands.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-surface-dark">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-black/40 flex items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-300 dark:border-white/10">
                <span className="material-symbols-outlined text-3xl">payments</span>
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white">Nenhuma demanda financeira</h4>
              <p className="text-slate-500 text-sm max-w-xs text-center mt-2">Acesse seus projetos para adicionar itens da sua Tabela de Preços.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Finances;