import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

type KanbanStatus = 'Novos ou parados' | 'Em andamento' | 'Aguardando informações' | 'Aguardando aprovação' | 'Concluído';

interface KanbanTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  kanbanStatus: KanbanStatus;
}

const Kanban: React.FC = () => {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Statuses list
  const statuses: KanbanStatus[] = [
    'Novos ou parados',
    'Em andamento',
    'Aguardando informações',
    'Aguardando aprovação',
    'Concluído'
  ];

  const statusColors: Record<KanbanStatus, string> = {
    'Novos ou parados': 'bg-red-500',
    'Em andamento': 'bg-primary',
    'Aguardando informações': 'bg-amber-400',
    'Aguardando aprovação': 'bg-amber-500',
    'Concluído': 'bg-blue-500'
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    // Fetch demands
    const { data: demands } = await supabase
      .from('project_demands')
      .select('id, title, project_id, due_date, work_status');

    // Fetch projects to get names
    const { data: projects } = await supabase.from('projects').select('id, title');
    const projMap: Record<string, string> = {};
    if (projects) {
      projects.forEach(p => projMap[p.id] = p.title);
    }

    // Load custom kanban states from localStorage
    const savedStatesStr = localStorage.getItem('kanban_states');
    const savedStates: Record<string, KanbanStatus> = savedStatesStr ? JSON.parse(savedStatesStr) : {};

    if (demands) {
      const mappedTasks: KanbanTask[] = demands.map((d: any) => {
        // Obter status salvo ou calcular baseado no supabase
        let status: KanbanStatus = savedStates[d.id] || (d.work_status === 'Entregue' ? 'Concluído' : 'Novos ou parados');
        
        return {
          id: d.id,
          title: d.title,
          projectId: d.project_id,
          projectName: projMap[d.project_id] || 'Projeto Desconhecido',
          dueDate: d.due_date,
          kanbanStatus: status
        };
      });
      setTasks(mappedTasks);
    }
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    // Atualiza estado local
    setTasks(prev => prev.map(t => t.id === id ? { ...t, kanbanStatus: targetStatus } : t));

    // Salva no LocalStorage
    const savedStatesStr = localStorage.getItem('kanban_states');
    const savedStates = savedStatesStr ? JSON.parse(savedStatesStr) : {};
    savedStates[id] = targetStatus;
    localStorage.setItem('kanban_states', JSON.stringify(savedStates));

    // Opcional: Atualizar no banco de dados para "Concluído"
    if (targetStatus === 'Concluído') {
      await supabase.from('project_demands').update({ work_status: 'Entregue' }).eq('id', id);
    } else if (targetStatus === 'Novos ou parados') {
      await supabase.from('project_demands').update({ work_status: 'A Fazer' }).eq('id', id);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">view_kanban</span>
            Pauta de atividades
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 pb-2">Minhas atividades — organize o fluxo arrastando os cards.</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
        <div className="flex gap-6 h-full min-w-max items-start">
          {statuses.map(status => (
            <div 
              key={status} 
              className="w-80 h-full flex flex-col bg-slate-50/80 dark:bg-black/10 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Header da Coluna */}
              <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-surface-dark/50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{status}</h3>
                </div>
                <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  {tasks.filter(t => t.kanbanStatus === status).length}
                </span>
              </div>

              {/* Lista de Cards */}
              <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {tasks.filter(t => t.kanbanStatus === status).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors group relative"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity ${statusColors[task.kanbanStatus]}`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight pr-4">{task.title}</h4>
                      <span className="material-symbols-outlined text-[14px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">drag_indicator</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mb-3 truncate">{task.projectName}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                      <div className="flex -space-x-1">
                        <div className="size-6 rounded-full bg-slate-200 dark:bg-black/30 border border-white dark:border-surface-dark flex items-center justify-center text-[8px] font-bold text-slate-500">
                          <span className="material-symbols-outlined text-[12px]">person</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${task.dueDate ? 'text-slate-500' : 'text-slate-300'}`}>
                        <span className="material-symbols-outlined text-[12px]">event</span>
                        {task.dueDate || 'Sem prazo'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {tasks.filter(t => t.kanbanStatus === status).length === 0 && !loading && (
                   <div className="h-24 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center">
                     <p className="text-xs text-slate-400 font-medium">Solte atividades aqui</p>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Kanban;
