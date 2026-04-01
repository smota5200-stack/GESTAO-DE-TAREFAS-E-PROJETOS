import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useClients } from '../hooks/useClients';
import { supabase } from '../lib/supabaseClient';
import { Project } from '../types';

const Projects: React.FC = () => {
  const { projects, loading, createProject } = useProjects();
  const { clients } = useClients();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados para o Modal de Novo Projeto
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    title: '',
    clientId: '',
    dueDate: '',
    description: '',
    asanaProjectId: ''
  });

  // Checar se a rota solicitou a abertura do modal (ex: clicando no header)
  useEffect(() => {
    if (location.state?.openNewModal) {
      setIsNewModalOpen(true);
      if (location.state?.defaultClientId) {
        setNewProjectForm(prev => ({ ...prev, clientId: location.state.defaultClientId }));
      }
      // Limpa o estado da rota para não reabrir o modal se der refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Progresso real baseado nas demandas
  const [projectProgress, setProjectProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchProgress = async () => {
      if (projects.length === 0) return;
      const projectIds = projects.map(p => p.id);
      const { data: demands } = await supabase
        .from('project_demands')
        .select('project_id, work_status, payment_status')
        .in('project_id', projectIds);

      if (!demands) return;

      const counts: Record<string, { total: number; done: number }> = {};
      demands.forEach((d: any) => {
        if (!counts[d.project_id]) counts[d.project_id] = { total: 0, done: 0 };
        counts[d.project_id].total++;
        if (d.work_status === 'Entregue' && d.payment_status === 'Pago') counts[d.project_id].done++;
      });

      const progress: Record<string, number> = {};
      Object.entries(counts).forEach(([pid, c]) => {
        progress[pid] = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
      });
      setProjectProgress(progress);
    };
    fetchProgress();
  }, [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.title || !newProjectForm.clientId) {
      alert("Por favor, preencha o Título e selecione um Cliente.");
      return;
    }

    const selectedClient = clients.find(c => c.id === newProjectForm.clientId);

    // Formatando a data de 'YYYY-MM-DD' para 'DD/MM/YYYY'
    let formattedDate = 'Sem prazo definido';
    if (newProjectForm.dueDate) {
      const [year, month, day] = newProjectForm.dueDate.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    await createProject({
      title: newProjectForm.title,
      client: selectedClient ? selectedClient.name : 'Cliente Desconhecido',
      clientId: newProjectForm.clientId,
      priority: 'Média',
      status: 'A Fazer',
      dueDate: formattedDate,
      description: newProjectForm.description,
      asanaProjectId: newProjectForm.asanaProjectId
    });

    // Fecha e reseta
    setIsNewModalOpen(false);
    setNewProjectForm({ title: '', clientId: '', dueDate: '', description: '', asanaProjectId: '' });
  };


  const handleFilterClick = (filterName: string) => {
    alert(`Menu de filtro para "${filterName}" será aberto.`);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 relative">
      {/* Page Title & Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Projetos & Demandas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe e gerencie seu fluxo de trabalho.</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Novo Projeto
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-8 flex flex-wrap items-center gap-3 shrink-0">
        {['Status', 'Prioridade', 'Cliente'].map((filter) => (
          <div key={filter} onClick={() => handleFilterClick(filter)} className="flex items-center gap-2 rounded-lg border border-primary/20 bg-white/50 dark:bg-surface-dark/80 px-3 py-1.5 text-sm cursor-pointer hover:bg-white dark:hover:bg-surface-dark hover:border-primary/50 transition-colors">
            <span className="text-slate-500">{filter}:</span>
            <span className="font-bold text-slate-900 dark:text-white">Todos</span>
            <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
          </div>
        ))}
        <button onClick={() => alert('Filtros resetados.')} className="ml-auto text-sm font-bold text-primary hover:underline">Limpar filtros</button>
      </div>

      {/* Lista de Projetos */}
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Projeto</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Progresso</th>
                <th className="px-6 py-4">Prazo</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {projects.map((project) => (
                <tr key={project.id} onClick={() => navigate(`/projetos/${project.id}`)} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{project.title}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{project.client}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      
                      project.status === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500' :
                      
                      'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                    }`}>{project.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${projectProgress[project.id] || 0}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{projectProgress[project.id] || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{project.dueDate}</td>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => navigate(`/projetos/${project.id}`)}
                        className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Abrir"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Excluir projeto "${project.title}"?`)) {
                            await supabase.from('projects').delete().eq('id', project.id);
                            window.location.reload();
                          }
                        }}
                        className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">folder_off</span>
                    Nenhum projeto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação de Projeto */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_task</span>
                Novo Projeto
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Título do Projeto *</label>
                <input
                  type="text"
                  required
                  value={newProjectForm.title}
                  onChange={e => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Ex: Redesign Landing Page"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cliente *</label>
                  <div className="relative">
                    <select
                      required
                      value={newProjectForm.clientId}
                      onChange={e => setNewProjectForm({ ...newProjectForm, clientId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione um cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={newProjectForm.dueDate}
                    onChange={e => setNewProjectForm({ ...newProjectForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Descrição</label>
                <textarea
                  value={newProjectForm.description}
                  onChange={e => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 min-h-[100px] resize-y custom-scrollbar"
                  placeholder="Breve resumo sobre o que deve ser feito neste projeto..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ID do Projeto no Asana</label>
                <input
                  type="text"
                  value={newProjectForm.asanaProjectId}
                  onChange={e => setNewProjectForm({ ...newProjectForm, asanaProjectId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Ex: 1213200206518330"
                />
                <p className="text-[10px] text-slate-400 mt-1">O ID é o número após "/project/" na URL do Asana.</p>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;