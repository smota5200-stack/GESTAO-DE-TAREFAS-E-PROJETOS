import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePriceTable } from '../hooks/usePriceTable';
import { useClients } from '../hooks/useClients';
import { useProjectDemands } from '../hooks/useProjectDemands';
import { useAsana } from '../hooks/useAsana';
import { useDemandComments } from '../hooks/useDemandComments';
import { useAttachments } from '../hooks/useAttachments';
import { Project, Client, ProjectDemand, SubDemand, PriceTableItem, ProjectAttachment } from '../types';

const formatDisplayDate = (dateStr: string) => {
   if (!dateStr || dateStr === '—' || dateStr === 'Sem prazo') return dateStr;
   if (/^\d{2} [A-Z]/i.test(dateStr)) return dateStr;
   
   try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
         const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
         const day = String(date.getUTCDate()).padStart(2, '0');
         return `${day} ${months[date.getUTCMonth()]}`;
      }
   } catch (e) {}
   return dateStr;
};

const ProjectDetails: React.FC = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();

   const { items: priceTableItems } = usePriceTable();
   const { clients: allClients } = useClients();
   const { demands, setDemands, loading: demandsLoading, fetchDemands, createDemand, updateDemand, updateSubDemand, deleteDemands } = useProjectDemands(id);
   const { updateTaskStatus, uploadAttachment, getProjectTasks, updateTask: asanaUpdateTask } = useAsana();
   const { attachments, loading: attachmentsLoading, uploadFile, deleteAttachment } = useAttachments(id || '');

   const [project, setProject] = useState<Project | null>(null);
   const [client, setClient] = useState<Client | null>(null);
   const [pageLoading, setPageLoading] = useState(true);

   useEffect(() => {
      const load = async () => {
         if (!id) return;
         setPageLoading(true);

         // Buscar projeto
         const { data: pData } = await supabase.from('projects').select('*').eq('id', id).single();
         if (pData) {
            const proj: Project = {
               id: pData.id, title: pData.title, client: pData.client_name,
               clientId: pData.client_id, priority: pData.priority, status: pData.status,
               progress: pData.progress || 0, dueDate: pData.due_date || '',
               description: pData.description || '', driveLink: pData.drive_link || '',
               externalSystemLink: pData.external_system_link || '',
               asanaProjectId: pData.asana_project_id || '',
               figmaLink: pData.figma_link || '',
               githubRepo: pData.github_repo || '',
               notionLink: pData.notion_link || '',
               zoomLink: pData.zoom_link || '',
               teamsLink: pData.teams_link || ''
            };
            setProject(proj);

            // Buscar cliente
            if (pData.client_id) {
               const { data: cData } = await supabase.from('clients').select('*').eq('id', pData.client_id).single();
               if (cData) {
                  setClient({ id: cData.id, name: cData.name, company: cData.company, email: cData.email, phone: cData.phone || '', status: cData.status, totalSpent: parseFloat(cData.total_spent) || 0, notes: cData.notes || '' });
               }
            }
         }

         // Buscar demandas
         await fetchDemands(id);
         setPageLoading(false);
      };
      load();
   }, [id]);

   // Modals
   const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
   const [selectedPriceItem, setSelectedPriceItem] = useState<string>('');
   const [newDemandForm, setNewDemandForm] = useState({ title: '', dueDate: '', cost: 0 });

   const [activeDemand, setActiveDemand] = useState<ProjectDemand | null>(null);
   const [isViewingDemand, setIsViewingDemand] = useState(false);

   // Edição de Demanda
   const [isEditingMainTitle, setIsEditingMainTitle] = useState(false);
   const [mainTitleInput, setMainTitleInput] = useState('');

   const [isEditingDemandDesc, setIsEditingDemandDesc] = useState(false);
   const [demandDescInput, setDemandDescInput] = useState('');
   const [isEditingDemandLinks, setIsEditingDemandLinks] = useState(false);
   const [demandDriveInput, setDemandDriveInput] = useState('');
   const [demandExternalInput, setDemandExternalInput] = useState('');

   // Estado para expandir uma SubDemanda específica
   const [expandedSubDemandId, setExpandedSubDemandId] = useState<string | null>(null);

   // Estado para edição de prazo e serviço no detalhe da demanda
   const [isEditingDemandDate, setIsEditingDemandDate] = useState(false);
   const [isEditingDemandCost, setIsEditingDemandCost] = useState(false);
   const [demandCostInput, setDemandCostInput] = useState(0);
   const [demandDateInput, setDemandDateInput] = useState('');
   const [isEditingDemandService, setIsEditingDemandService] = useState(false);
   const [demandServiceInput, setDemandServiceInput] = useState('');
   const [isEditingDemandExtra, setIsEditingDemandExtra] = useState(false);
   const [demandPriorityInput, setDemandPriorityInput] = useState('');
   const [demandPostingInput, setDemandPostingInput] = useState('');
   const [demandFormatInput, setDemandFormatInput] = useState('');
   const [demandDeliveryInput, setDemandDeliveryInput] = useState('');
   const [asanaFields, setAsanaFields] = useState<any[]>([]);

   // Edição do projeto
   const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
   const [editProjectForm, setEditProjectForm] = useState({ 
      title: '', 
      clientId: '', 
      dueDate: '', 
      asanaProjectId: '',
      figmaLink: '',
      githubRepo: '',
      notionLink: '',
      zoomLink: '',
      teamsLink: '',
      driveLink: '',
      dropboxLink: '',
      meetLink: '',
      adobeStudioLink: '',
      gmailLink: '',
      outlookLink: '',
      category: ''
   });

   // Resumo financeiro do projeto deletado daqui pois já existe na linha 340+
   
   // Seleção de demandas para exclusão
   const [selectedDemandIds, setSelectedDemandIds] = useState<Set<string>>(new Set());

   const [isImportingAsana, setIsImportingAsana] = useState(false);
   const [filterAssignee, setFilterAssignee] = useState<string>('all');
   const [newCommentInput, setNewCommentInput] = useState('');
   const [activeTab, setActiveTab] = useState<'geral' | 'lista' | 'quadro' | 'cronograma' | 'painel' | 'calendario'>(() => {
      const prefsStr = localStorage.getItem('freela_user_prefs');
      if (prefsStr) {
         try {
            const prefs = JSON.parse(prefsStr);
            if (prefs.defaultView) return prefs.defaultView;
         } catch (e) {}
      }
      return 'geral';
   });

   const { updateTask, getTaskComments, addTaskComment, getTaskDetails, updateCustomField } = useAsana();
   const { comments, fetchComments, addComment, loading: commentsLoading } = useDemandComments(activeDemand?.id, activeDemand?.asanaTaskId);

   const renderDescription = (text: string) => {
      if (!text) return null;
      
      // 1. Limpar menções do Asana no formato HTML (vindo de html_text)
      // Ex: <a href="https://app.asana.com/0/user/123" data-asana-gid="123">Nome</a> -> @Nome
      let cleanText = text.replace(/<a[^>]+data-asana-gid="[^"]+"[^>]*>([^<]+)<\/a>/g, '@$1');

      // 2. Limpar menções do Asana no formato Markdown (vindo de text)
      // Ex: [Nome](https://app.asana.com/0/123/list) -> @Nome
      cleanText = cleanText.replace(/\[([^\]]+)\]\(https?:\/\/app\.asana\.com\/[^)]+\)/g, '@$1');

      // 3. Remover outras tags HTML básicas (Asana envia <body> e <p> no html_text)
      cleanText = cleanText.replace(/<[^>]+>/g, '');

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = cleanText.split(urlRegex);
      return parts.map((part, i) => {
         if (part.match(urlRegex)) {
            return (
               <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                  {part}
               </a>
            );
         }
         return part;
      });
   };

   const handleImportFromAsana = async () => {
      if (!project?.asanaProjectId) {
         alert('Este projeto não está vinculado a um ID do Asana.');
         return;
      }

      setIsImportingAsana(true);
      try {
         console.log('Iniciando importação do Asana para o projeto:', project.asanaProjectId);
         const tasks = await getProjectTasks(project.asanaProjectId);
         console.log('Tarefas recebidas do Asana:', tasks);
         let importedCount = 0;

         for (const task of tasks) {
            console.log('Processando tarefa Asana:', task.gid, task.name);
            // Verificar se já existe
            const exists = demands.some(d => d.asanaTaskId === task.gid);
            if (exists) console.log('Tarefa já existe no FreelaOS:', task.gid);
            if (!exists) {
               const findCustomField = (name: string) => {
                  const field = task.custom_fields?.find((f: any) => f.name.toLowerCase().includes(name.toLowerCase()));
                  if (!field) return '';
                  if (field.type === 'enum') return field.enum_value?.name || '';
                  if (field.type === 'date' && field.date_value) {
                     const dateStr = field.date_value.date || field.date_value.date_time;
                     if (dateStr) {
                        const parts = dateStr.split('T')[0].split('-');
                        if (parts.length === 3) {
                           const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                           const day = parts[2].padStart(2, '0');
                           return `${day} ${months[parseInt(parts[1]) - 1]}`;
                        }
                     }
                  }
                  return field.display_value || field.text_value || '';
               };

               const dueDate = task.due_on ? task.due_on.split('-').reverse().join('/') : 'Sem prazo';
               await createDemand({
                  projectId: project.id,
                  asanaTaskId: task.gid,
                  title: task.name,
                  type: 'Avulso',
                  amount: 0,
                  dueDate: dueDate,
                  workStatus: task.completed ? 'Entregue' : 'A Fazer',
                  description: task.notes || '',
                  totalQuantity: 1,
                  completedQuantity: task.completed ? 1 : 0,
                  paymentStatus: 'Pendente',
                  assigneeName: task.assignee?.name || '',
                  priority: findCustomField('Prioridade'),
                  postingDate: findCustomField('Postagem'),
                  format: findCustomField('Formato'),
                  deliveryDate: findCustomField('Entrega')
               });
               importedCount++;
            } else {
               // Se já existe, vamos atualizar as informações extras (puxar do Asana)
               const findCustomField = (name: string) => {
                  const field = task.custom_fields?.find((f: any) => f.name.toLowerCase().includes(name.toLowerCase()));
                  if (!field) return '';
                  if (field.type === 'enum') return field.enum_value?.name || '';
                  if (field.type === 'date' && field.date_value) {
                     const dateStr = field.date_value.date || field.date_value.date_time;
                     if (dateStr) {
                        const parts = dateStr.split('T')[0].split('-');
                        if (parts.length === 3) {
                           const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                           const day = parts[2].padStart(2, '0');
                           return `${day} ${months[parseInt(parts[1]) - 1]}`;
                        }
                     }
                  }
                  return field.display_value || field.text_value || '';
               };

               const existingDemand = demands.find(d => d.asanaTaskId === task.gid);
               if (existingDemand) {
                  await updateDemand(existingDemand.id, {
                     priority: findCustomField('Prioridade'),
                     postingDate: findCustomField('Postagem'),
                     format: findCustomField('Formato'),
                     deliveryDate: findCustomField('Entrega'),
                     assigneeName: task.assignee?.name || existingDemand.assigneeName
                  });
               }
            }
         }
         
         if (importedCount > 0) {
            alert(`${importedCount} demandas importadas com sucesso!`);
            fetchDemands(id);
         } else {
            alert('Nenhuma demanda nova encontrada no Asana.');
         }
      } catch (error) {
         console.error('Erro ao importar do Asana:', error);
         alert('Erro ao importar do Asana. Verifique suas configurações e o ID do projeto.');
      } finally {
         setIsImportingAsana(false);
      }
   };

   // Helper para buscar nome do serviço vinculado
   const getServiceName = (priceItemId?: string) => {
      if (!priceItemId) return null;
      return priceTableItems.find(pt => pt.id === priceItemId) || null;
   };

   // Recalcular o progresso do projeto baseado nas demandas (inteligente)
   // IMPORTANTE: Este useEffect DEVE ficar antes dos returns condicionais
   useEffect(() => {
      if (!project || demands.length === 0) return;

      const sum = demands.reduce((acc, d) => {
         let pct = 0;
         if (d.totalQuantity > 1) {
            pct = (d.completedQuantity / d.totalQuantity) * 100;
         } else {
            // Só conta como concluído se Entregue E Pago
            pct = (d.workStatus === 'Entregue' && d.paymentStatus === 'Pago') ? 100
                : d.workStatus === 'Entregue' ? 50 : 0;
         }
         return acc + pct;
      }, 0);

      const calcProgress = Math.round(sum / demands.length);

      if (calcProgress !== project.progress) {
         let newStatus = project.status;
         if (calcProgress === 100) newStatus = 'Entregue';
         
         else if (calcProgress < 100 && newStatus === 'Entregue') newStatus = 'A Fazer';

         setProject(prev => prev ? { ...prev, progress: calcProgress, status: newStatus } : prev);
         // Persiste no Supabase
         supabase.from('projects').update({ progress: calcProgress, status: newStatus }).eq('id', project.id);
      }
   }, [demands, project?.id, project?.progress, project?.status]);

   if (pageLoading) {
      return (
         <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
               <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm text-slate-500">Carregando projeto...</p>
            </div>
         </div>
      );
   }

   if (!project) {
      return (
         <div className="flex flex-col items-center justify-center h-64">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Projeto Não Encontrado</h2>
            <button onClick={() => navigate('/projetos')} className="text-primary hover:underline">Voltar aos Projetos</button>
         </div>
      );
   }

   const totalProjectValue = demands.reduce((acc, curr) => acc + (curr.amount || 0), 0);
   const totalPaid = demands.filter(d => d.paymentStatus === 'Pago').reduce((acc, curr) => acc + (curr.amount || 0), 0);
   const totalPending = demands.filter(d => d.paymentStatus !== 'Pago').reduce((acc, curr) => acc + (curr.amount || 0), 0);
   const totalCost = demands.reduce((acc, curr) => acc + (curr.cost || 0), 0);
   const grossProfit = totalProjectValue - totalCost;
   const profitMargin = totalProjectValue > 0 ? (grossProfit / totalProjectValue) * 100 : 0;

   const handleAdvanceProjectStatus = () => {
      const flow: typeof project.status[] = ['A Fazer', 'Entregue'];
      const currentIdx = flow.indexOf(project.status);

      if (currentIdx < flow.length - 1) {
         const newStatus = flow[currentIdx + 1];
         if (newStatus === 'Entregue') {
            // Conclui projeto, conclui todas as demandas
            setDemands(demands.map(d => ({
               ...d,
               workStatus: 'Entregue',
               completedQuantity: d.totalQuantity,
               subDemands: d.subDemands ? d.subDemands.map(sd => ({ ...sd, workStatus: 'Entregue' })) : undefined
            })));
         } else {
            setProject({ ...project, status: newStatus, progress: project.progress === 0 ? 15 : project.progress });
         }
      }
   };

   const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedPriceItem(val);
      const service = priceTableItems.find(pt => pt.id === val);
      if (service && !newDemandForm.title) {
         setNewDemandForm(prev => ({ ...prev, title: service.title }));
      }
   };

   const handleCreateDemand = async (e: React.FormEvent) => {
      e.preventDefault();
      const priceItem = priceTableItems.find(pt => pt.id === selectedPriceItem);
      if (!priceItem) return;

      const subTitles = priceItem.type === 'Pacote'
         ? Array.from({ length: priceItem.quantity || 1 }).map((_, i) => `Item ${i + 1}`)
         : undefined;

      await createDemand({
         projectId: project.id,
         priceItemId: priceItem.id,
         title: newDemandForm.title || priceItem.title,
         type: priceItem.type,
         amount: priceItem.price,
         cost: newDemandForm.cost || 0,
         dueDate: newDemandForm.dueDate ? newDemandForm.dueDate.split('-').reverse().join('/') : 'Sem prazo',
         workStatus: 'A Fazer',
         paymentStatus: 'Pendente',
         totalQuantity: priceItem.type === 'Pacote' ? (priceItem.quantity || 1) : 1,
         completedQuantity: 0,
         subDemands: undefined
      }, subTitles);

      setIsDemandModalOpen(false);
      setSelectedPriceItem('');
      setNewDemandForm({ title: '', dueDate: '' });
   };

   // Status avulso rápido via tabela
   const toggleWorkStatusAvulso = async (demandId: string) => {
      const d = demands.find(d => d.id === demandId);
      if (!d || d.totalQuantity !== 1) return;
      const nextStatus: 'A Fazer' | 'Entregue' = d.workStatus === 'A Fazer' ? 'Entregue' : 'A Fazer';
      const completedQ = nextStatus === 'Entregue' ? 1 : 0;
      await updateDemand(demandId, { workStatus: nextStatus, completedQuantity: completedQ });
      
      // Sincronizar com Asana se houver ID
      if (d.asanaTaskId) {
         updateTaskStatus(d.asanaTaskId, nextStatus === 'Entregue');
      }
   };

   // Status financeiro rápido via tabela
   const togglePaymentStatus = async (demandId: string) => {
      const d = demands.find(d => d.id === demandId);
      if (!d) return;
      const flow: ('Pendente' | 'A Pagar' | 'Pago')[] = ['Pendente', 'A Pagar', 'Pago'];
      const idx = flow.indexOf(d.paymentStatus as any);
      const newStatus = flow[(idx + 1) % flow.length];
      await updateDemand(demandId, { paymentStatus: newStatus });
   };

   const openDemandDetails = (demand: ProjectDemand) => {
      setActiveDemand(demand);
      setMainTitleInput(demand.title);
      setDemandDescInput(demand.description || '');
      setDemandDriveInput(demand.driveLink || '');
      setDemandExternalInput(demand.externalSystemLink || '');
      setDemandPriorityInput(demand.priority || '');
      setDemandPostingInput(demand.postingDate || '');
      setDemandFormatInput(demand.format || '');
      setDemandDeliveryInput(demand.deliveryDate || '');
      setDemandCostInput(demand.cost || 0);
      setIsViewingDemand(true);
      fetchComments(demand.id, demand.asanaTaskId);
      
      // Carregar opções de campos do Asana se disponível
      if (demand.asanaTaskId) {
         setAsanaFields([]); // Reset
         getTaskDetails(demand.asanaTaskId).then(details => {
            if (details?.custom_fields) {
               setAsanaFields(details.custom_fields);
            }
         });
      }

      setIsEditingMainTitle(false);
      setIsEditingDemandDesc(false);
      setIsEditingDemandLinks(false);
      setExpandedSubDemandId(null);
   };

   const handlePostComment = async () => {
      if (!newCommentInput.trim()) return;
      await addComment(newCommentInput, 'Eu', activeDemand?.asanaTaskId);
      setNewCommentInput('');
   };

   const saveDemandEdits = async () => {
      if (!activeDemand) return;
      const updates = {
         title: mainTitleInput,
         description: demandDescInput,
         driveLink: demandDriveInput,
         externalSystemLink: demandExternalInput,
         priority: demandPriorityInput,
         postingDate: demandPostingInput,
         format: demandFormatInput,
         deliveryDate: demandDeliveryInput,
         cost: Number(demandCostInput) || 0
      };
      await updateDemand(activeDemand.id, updates);
      
      // Sincronização Instantânea com Asana
      if (activeDemand.asanaTaskId) {
         updateTask(activeDemand.asanaTaskId, {
            name: updates.title,
            notes: updates.description
         });
      }

      setActiveDemand({ ...activeDemand, ...updates });

      setIsEditingMainTitle(false);
      setIsEditingDemandDesc(false);
      setIsEditingDemandLinks(false);
      setIsEditingDemandExtra(false);
   };

   // Funções exclusivas para gerenciar Itens do Pacote (SubDemandas)
   const toggleSubDemandStatus = async (subId: string) => {
      if (!activeDemand || activeDemand.type !== 'Pacote' || !activeDemand.subDemands) return;

      const sd = activeDemand.subDemands.find(s => s.id === subId);
      if (!sd) return;
      const nextStatus: 'A Fazer' | 'Entregue' = sd.workStatus === 'A Fazer' ? 'Entregue' : 'A Fazer';

      await updateSubDemand(subId, activeDemand.id, { workStatus: nextStatus });

      // Atualizar estado local do activeDemand
      const updatedSubs = activeDemand.subDemands.map(s => s.id === subId ? { ...s, workStatus: nextStatus } : s);
      const completed = updatedSubs.filter(s => s.workStatus === 'Entregue').length;
      let parentStatus: ProjectDemand['workStatus'] = 'A Fazer';
      if (completed === 0) parentStatus = 'A Fazer';
      if (completed === activeDemand.totalQuantity) parentStatus = 'Entregue';

      const updatedDemand = { ...activeDemand, subDemands: updatedSubs, completedQuantity: completed, workStatus: parentStatus };
      setActiveDemand(updatedDemand);
      await updateDemand(activeDemand.id, { completedQuantity: completed, workStatus: parentStatus });

      // Sincronizar com Asana se houver ID
      if (activeDemand.asanaTaskId) {
         updateTaskStatus(activeDemand.asanaTaskId, parentStatus === 'Entregue');
      }
   };

   const renameSubDemand = async (subId: string, newTitle: string) => {
      if (!activeDemand || !activeDemand.subDemands) return;
      await updateSubDemand(subId, activeDemand.id, { title: newTitle });
      const updatedSubs = activeDemand.subDemands.map(sd => sd.id === subId ? { ...sd, title: newTitle } : sd);
      setActiveDemand({ ...activeDemand, subDemands: updatedSubs });
   };

   const updateSubDemandLinkFn = async (subId: string, field: 'driveLink' | 'externalSystemLink', value: string) => {
      if (!activeDemand || !activeDemand.subDemands) return;
      await updateSubDemand(subId, activeDemand.id, { [field]: value } as Partial<SubDemand>);
      const updatedSubs = activeDemand.subDemands.map(sd => sd.id === subId ? { ...sd, [field]: value } : sd);
      setActiveDemand({ ...activeDemand, subDemands: updatedSubs });
   };

   const getTypeStyle = (type: string) => {
      return type === 'Avulso'
         ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
         : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
   };

   const openEditProject = () => {
      // Converter DD/MM/YYYY para YYYY-MM-DD para o input date
      let dateVal = '';
      if (project.dueDate && project.dueDate !== 'Sem prazo definido') {
         const parts = project.dueDate.split('/');
         if (parts.length === 3) dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      setEditProjectForm({
         title: project.title,
         clientId: project.clientId || '',
         dueDate: dateVal,
         asanaProjectId: project.asanaProjectId || '',
         figmaLink: project.figmaLink || '',
         githubRepo: project.githubRepo || '',
         notionLink: project.notionLink || '',
         zoomLink: project.zoomLink || '',
         teamsLink: project.teamsLink || '',
         driveLink: project.driveLink || '',
         dropboxLink: project.dropboxLink || '',
         meetLink: project.meetLink || '',
         adobeStudioLink: project.adobeStudioLink || '',
         gmailLink: project.gmailLink || '',
         outlookLink: project.outlookLink || '',
         category: project.category || 'Design'
      });
      setIsEditProjectOpen(true);
   };

   const handleSaveProject = async () => {
      if (!editProjectForm.title) { alert('Título é obrigatório.'); return; }
      
      const sanitizeAsanaId = (input: string) => {
         if (!input) return '';
         // Se for URL completa, extrai o ID
         const projectMatch = input.match(/\/project\/(\d+)/);
         if (projectMatch) return projectMatch[1];
         
         // Se colarem o link da lista/board que termina no ID
         const lastSegment = input.split('/').pop();
         if (lastSegment && /^\d+$/.test(lastSegment)) return lastSegment;

         // Fallback: remove tudo que não for número (GID do Asana é apenas números)
         return input.replace(/\D/g, '');
      };

      const cleanAsanaId = sanitizeAsanaId(editProjectForm.asanaProjectId);
      const selectedClient = allClients.find(c => c.id === editProjectForm.clientId);
      let formattedDate = project.dueDate;
      if (editProjectForm.dueDate) {
         const [y, m, d] = editProjectForm.dueDate.split('-');
         formattedDate = `${d}/${m}/${y}`;
      }

      await supabase.from('projects').update({
         title: editProjectForm.title,
         client_id: editProjectForm.clientId || null,
         client_name: selectedClient ? selectedClient.name : project.client,
         due_date: formattedDate,
         asana_project_id: cleanAsanaId,
         figma_link: editProjectForm.figmaLink,
         github_repo: editProjectForm.githubRepo,
         notion_link: editProjectForm.notionLink,
         zoom_link: editProjectForm.zoomLink,
         teams_link: editProjectForm.teamsLink,
         drive_link: editProjectForm.driveLink,
         dropbox_link: editProjectForm.dropboxLink,
         meet_link: editProjectForm.meetLink,
         adobe_studio_link: editProjectForm.adobeStudioLink,
         gmail_link: editProjectForm.gmailLink,
         outlook_link: editProjectForm.outlookLink,
         category: editProjectForm.category
      }).eq('id', project.id);

      setProject({
         ...project,
         title: editProjectForm.title,
         clientId: editProjectForm.clientId,
         client: selectedClient ? selectedClient.name : project.client,
         dueDate: formattedDate,
         asanaProjectId: cleanAsanaId,
         figmaLink: editProjectForm.figmaLink,
         githubRepo: editProjectForm.githubRepo,
         notionLink: editProjectForm.notionLink,
         zoomLink: editProjectForm.zoomLink,
         teamsLink: editProjectForm.teamsLink,
         driveLink: editProjectForm.driveLink,
         dropboxLink: editProjectForm.dropboxLink,
         meetLink: editProjectForm.meetLink,
         adobeStudioLink: editProjectForm.adobeStudioLink,
         gmailLink: editProjectForm.gmailLink,
         outlookLink: editProjectForm.outlookLink,
         category: editProjectForm.category
      });
      if (selectedClient) {
         setClient({ ...selectedClient });
      }
      setIsEditProjectOpen(false);
   };

   const handleDeleteProject = async () => {
      if (!confirm(`Tem certeza que deseja excluir o projeto "${project.title}"? Todas as demandas serão perdidas.`)) return;
      await supabase.from('projects').delete().eq('id', project.id);
      navigate('/projetos');
   };

   const handleDeleteSelectedDemands = async () => {
      if (selectedDemandIds.size === 0) return;
      if (!confirm(`Excluir ${selectedDemandIds.size} demanda(s) selecionada(s)?`)) return;
      await deleteDemands(Array.from(selectedDemandIds));
      setSelectedDemandIds(new Set());
   };

   return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
         <button
            onClick={() => navigate('/projetos')}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-2 w-fit"
         >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar ao Quadro
         </button>

         <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Section */}
            <div className="p-8 border-b border-slate-100 dark:border-white/5 relative">
               {project.status === 'Entregue' && <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>}
               {project.status === 'Entregue' && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}

               <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1">
                     <div className="flex items-center gap-3 mb-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
                           {project.priority} Prioridade
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-transparent transition-colors bg-slate-100 dark:bg-slate-800`}>
                           {project.status}
                        </span>
                        {project.category && (
                           <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-primary/20 bg-primary/5 text-primary">
                              {project.category}
                           </span>
                        )}
                     </div>
                     <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{project.title}</h1>
                     <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-lg">domain</span>
                           <span className="font-medium">{project.client}</span>
                        </div>
                        {project.asanaProjectId && (
                           <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-primary">link</span>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Asana:</span>
                              <span className="font-mono text-[11px] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">{project.asanaProjectId}</span>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="flex gap-3 shrink-0">
                     <button onClick={openEditProject} className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">edit</span> Editar
                     </button>
                     <button onClick={handleDeleteProject} className="px-4 py-2 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/10 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">delete</span> Excluir
                     </button>
                     {project.status !== 'Entregue' && (
                        <button onClick={handleAdvanceProjectStatus} className="px-4 py-2 bg-primary text-slate-900 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                           <span className="material-symbols-outlined text-sm">check</span> Avançar Projeto
                        </button>
                     )}
                  </div>
               </div>
            </div>

            {/* Tabs Interface Asana */}
            <div className="border-b border-slate-200 dark:border-white/5 flex gap-6 px-8 overflow-x-auto custom-scrollbar bg-white dark:bg-surface-dark mt-4">
               {[
                  { id: 'geral', label: 'Visão geral' },
                  { id: 'lista', label: 'Lista' },
                  { id: 'quadro', label: 'Quadro' },
                  { id: 'cronograma', label: 'Cronograma' },
                  { id: 'painel', label: 'Painel' },
                  { id: 'calendario', label: 'Calendário' }
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                     {tab.label}
                  </button>
               ))}
               <button className="py-3 text-sm font-semibold text-slate-400 border-transparent hover:text-slate-600 border-b-2 ml-2 mb-1 flex items-center justify-center">
                 <span className="material-symbols-outlined text-sm">add</span>
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/5">

               {/* Main Content Column: Demandas */}
               <div className="lg:col-span-8 flex flex-col h-[700px] overflow-y-auto custom-scrollbar">

                  <div className="p-8 bg-slate-50/30 dark:bg-black/20 min-h-full">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                           <span className="material-symbols-outlined text-lg text-primary">view_list</span> Demandas do Projeto
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-3">
                           {/* Filtro de Responsável */}
                           <div className="flex items-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-lg text-xs">
                              <span className="text-slate-500 font-bold uppercase tracking-tighter">Resp:</span>
                              <select 
                                 value={filterAssignee}
                                 onChange={(e) => setFilterAssignee(e.target.value)}
                                 className="bg-transparent border-none outline-none font-bold text-slate-900 dark:text-white cursor-pointer"
                              >
                                 <option value="all">Todos</option>
                                 {Array.from(new Set(demands.map(d => d.assigneeName).filter(Boolean))).map(name => (
                                    <option key={name} value={name}>{name}</option>
                                 ))}
                              </select>
                           </div>

                           {project?.asanaProjectId && (
                              <button
                                 onClick={handleImportFromAsana}
                                 disabled={isImportingAsana}
                                 className="text-xs font-bold border border-primary text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                 <span className="material-symbols-outlined text-sm">{isImportingAsana ? 'sync' : 'download'}</span> 
                                 {isImportingAsana ? 'Importando...' : 'Importar do Asana'}
                              </button>
                           )}
                           <button
                              onClick={() => setIsDemandModalOpen(true)}
                              className="text-xs font-bold bg-primary text-slate-900 px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1"
                           >
                              <span className="material-symbols-outlined text-sm">add</span> Adicionar Demanda
                           </button>
                         </div>
                      </div>
                       {activeTab === 'geral' && (
                        <div className="space-y-8">
                            {/* Resumo Financeiro */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                               <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                                  <div className="size-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                     <span className="material-symbols-outlined text-2xl">payments</span>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Orçado</p>
                                     <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat( 'pt-BR' , { style:  'currency' , currency:  'BRL'  }).format(totalProjectValue)}
                                     </h4>
                                  </div>
                               </div>
                               <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                                  <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                     <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Recebido</p>
                                     <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat( 'pt-BR' , { style:  'currency' , currency:  'BRL'  }).format(totalPaid)}
                                     </h4>
                                  </div>
                               </div>
                               <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                                  <div className="size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                     <span className="material-symbols-outlined text-2xl">pending_actions</span>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">A Receber</p>
                                     <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat( 'pt-BR' , { style:  'currency' , currency:  'BRL'  }).format(totalPending)}
                                     </h4>
                                  </div>
                               </div>
                            </div>
                           {/* Descrição e Status */}
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                                 <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">description</span> Descrição do Projeto
                                 </h4>
                                 <div className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-300">
                                    {project.description ? (
                                       <p className="whitespace-pre-wrap">{project.description}</p>
                                    ) : (
                                       <p className="italic text-slate-400">Nenhuma descrição definida para este projeto.</p>
                                    )}
                                 </div>
                              </div>
                              <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                                 <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Status Geral</h4>
                                 <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${project.status === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                                    {project.status || 'Em Andamento'}
                                 </span>
                                 <div className="mt-4 w-full">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                       <span>Progresso</span>
                                       <span>{project.progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                       <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Ferramentas e Integrações */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Figma Embed */}
                              {project.figmaLink ? (
                                 <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col h-[450px]">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                       <span className="material-symbols-outlined text-[#F24E1E] text-lg">figma</span> Design (Figma)
                                    </h4>
                                    <iframe 
                                       className="w-full flex-1 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20"
                                       src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(project.figmaLink)}`}
                                       allowFullScreen
                                    ></iframe>
                                 </div>
                              ) : (
                                 <div className="bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors cursor-pointer" onClick={openEditProject}>
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 group-hover:scale-110 transition-transform">brush</span>
                                    <h5 className="font-bold text-slate-600 dark:text-slate-300">Nenhum Design Vinculado</h5>
                                    <p className="text-xs text-slate-400 mt-1">Cole o link do Figma para visualizar o board aqui.</p>
                                 </div>
                              )}

                              {/* GitHub Commits */}
                              {project.githubRepo ? (
                                 <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col h-[450px]">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                       <span className="material-symbols-outlined text-[#333] dark:text-white text-lg">code</span> Últimos Commits (GitHub)
                                    </h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                       {[1,2,3,4,5].map(i => (
                                          <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-white/5">
                                             <div className="size-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-sm text-slate-500">commit</span>
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">feat: implementação do componente de commits #{i}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                   <span className="text-[10px] font-black text-primary uppercase">main</span>
                                                   <span className="text-[10px] text-slate-400 italic">há {i} horas por @dev</span>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                    <button 
                                       onClick={() => window.open(`https://github.com/${project.githubRepo}`, '_blank')}
                                       className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-black transition-colors flex items-center justify-center gap-2"
                                    >
                                       <span className="material-symbols-outlined text-[16px]">open_in_new</span> Ver no Repositório
                                    </button>
                                 </div>
                              ) : (
                                 <div className="bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors cursor-pointer" onClick={openEditProject}>
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 group-hover:scale-110 transition-transform">terminal</span>
                                    <h5 className="font-bold text-slate-600 dark:text-slate-300">Repositório não vinculado</h5>
                                    <p className="text-xs text-slate-400 mt-1">Vincule um repositório GitHub para acompanhar o código.</p>
                                 </div>
                              )}
                           </div>

                           {/* Links Rápidos e Ações de Comunicação */}
                            {/* Hub de Conexões e Ferramentas (11 Ferramentas) */}
                            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-8 shadow-sm">
                               <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                     <span className="material-symbols-outlined text-primary text-xl">hub</span> Hub de Conexões
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">11 Ferramentas Integradas</p>
                               </div>

                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                  {[
                                     { id: 'gmail', label: 'Gmail', icon: 'mail', color: '#EA4335', link: project.gmailLink || (client?.email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${client.email}&su=Acompanhamento: ${project.title}` : '') },
                                     { id: 'outlook', label: 'Outlook', icon: 'alternate_email', color: '#0078D4', link: project.outlookLink || (client?.email ? `mailto:${client.email}?subject=Acompanhamento: ${project.title}` : '') },
                                     { id: 'drive', label: 'GDrive', icon: 'add_to_drive', color: '#34A853', link: project.driveLink },
                                     { id: 'dropbox', label: 'Dropbox', icon: 'cloud', color: '#0061FF', link: project.dropboxLink },
                                     { id: 'notion', label: 'Notion', icon: 'notes', color: '#000000', link: project.notionLink },
                                     { id: 'zoom', label: 'Zoom', icon: 'videocam', color: '#2D8CFF', link: project.zoomLink },
                                     { id: 'teams', label: 'Teams', icon: 'groups', color: '#444791', link: project.teamsLink },
                                     { id: 'meet', label: 'GMeet', icon: 'video_chat', color: '#00897B', link: project.meetLink },
                                     { id: 'github', label: 'GitHub', icon: 'code', color: '#333333', link: project.githubRepo ? `https://github.com/${project.githubRepo}` : '' },
                                     { id: 'figma', label: 'Figma', icon: 'brush', color: '#F24E1E', link: project.figmaLink },
                                     { id: 'adobe', label: 'Adobe', icon: 'edit_square', color: '#FA0F00', link: project.adobeStudioLink },
                                  ].map((tool) => (
                                     <button
                                        key={tool.id}
                                        onClick={() => tool.link ? window.open(tool.link, '_blank') : openEditProject()}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all group relative ${tool.link ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-primary/50 hover:shadow-md' : 'bg-transparent border-dashed border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100'}`}
                                     >
                                        <div className="size-12 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110" style={{ backgroundColor: tool.link ? `${tool.color}15` : 'transparent' }}>
                                           <span className="material-symbols-outlined text-2xl" style={{ color: tool.link ? tool.color : 'currentColor' }}>{tool.icon}</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{tool.label}</span>
                                        {!tool.link && (
                                           <div className="absolute top-2 right-2 size-4 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                              <span className="material-symbols-outlined text-[10px]">add</span>
                                           </div>
                                        )}
                                     </button>
                                  ))}
                               </div>
                            </div>
                        </div>
                     )}

                     {activeTab === 'lista' && (
                        <div className="space-y-6">
                           {['A Fazer', 'Em execução', 'Entregue'].map(statusGroup => {
                              const groupDemands = demands.filter(d => 
                                 (statusGroup === 'A Fazer' && d.workStatus === 'A Fazer') ||
                                 (statusGroup === 'Em execução' && d.workStatus === 'Em Execução') ||
                                 (statusGroup === 'Entregue' && d.workStatus === 'Entregue')
                              );

                              return (
                                 <div key={statusGroup} className="space-y-2">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                       <span>{statusGroup}</span>
                                       <span className="text-xs font-normal text-slate-400">{groupDemands.length} tarefas</span>
                                    </h4>
                                    
                                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm">
                                       {groupDemands.length > 0 ? (
                                          <table className="w-full text-left">
                                             <thead>
                                                <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] uppercase text-slate-500">
                                                   <th className="px-4 py-2 font-medium w-1/2">Nome</th>
                                                   <th className="px-4 py-2 font-medium">Responsável</th>
                                                   <th className="px-4 py-2 font-medium">Data de Conclusão</th>
                                                   <th className="px-4 py-2 font-medium">Prioridade</th>
                                                   <th className="px-4 py-2 font-medium">Status</th>
                                                </tr>
                                             </thead>
                                             <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                                {groupDemands.map(d => (
                                                   <tr key={d.id} onClick={() => openDemandDetails(d)} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group">
                                                      <td className="px-4 py-3">
                                                         <div className="flex items-center gap-3">
                                                            <div onClick={(e) => { e.stopPropagation(); toggleWorkStatusAvulso(d.id); }} className={`size-5 min-w-[20px] rounded-full border-2 flex items-center justify-center cursor-pointer ${d.workStatus === 'Entregue' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                               {d.workStatus === 'Entregue' && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-primary transition-colors">{d.title}</span>
                                                         </div>
                                                      </td>
                                                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                                         {d.assigneeName ? (
                                                            <div className="flex items-center gap-1.5 object-contain">
                                                               <div className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                                                  {d.assigneeName.charAt(0)}
                                                               </div>
                                                               {d.assigneeName}
                                                            </div>
                                                         ) : <span className="text-slate-300 border border-dashed border-slate-300 rounded-full px-2 py-0.5 text-[10px]">Atribuir</span>}
                                                      </td>
                                                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                                         {d.dueDate !== 'Sem prazo' ? formatDisplayDate(d.dueDate) : '-'}
                                                      </td>
                                                      <td className="px-4 py-3">
                                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            d.priority === 'High' || d.priority === 'Alta' ? 'bg-red-500/10 text-red-500' :
                                                            d.priority === 'Medium' || d.priority === 'Média' ? 'bg-amber-500/10 text-amber-500' :
                                                            d.priority === 'Low' || d.priority === 'Baixa' ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                         }`}>
                                                            {d.priority || 'Baixa'}
                                                         </span>
                                                      </td>
                                                      <td className="px-4 py-3">
                                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${d.workStatus === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                            {d.workStatus === 'A Fazer' ? 'Em dia' : (d.workStatus === 'Entregue' ? 'Concluído' : 'A Fazer')}
                                                         </span>
                                                      </td>
                                                   </tr>
                                                ))}
                                             </tbody>
                                          </table>
                                       ) : (
                                          <div className="p-4 text-center text-slate-400 text-xs py-8">
                                             Nenhuma tarefa nesta seção.
                                          </div>
                                       )}
                                       <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
                                          <button onClick={() => setIsDemandModalOpen(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary font-medium px-2 py-1 rounded w-full">
                                             <span className="material-symbols-outlined text-sm">add</span> Adicionar tarefa...
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}

                     {activeTab === 'quadro' && (
                        <div className="flex gap-4 overflow-x-auto h-[600px] pb-4 items-start pb-6 custom-scrollbar">
                           {['A Fazer', 'Em execução', 'Entregue'].map(statusGroup => {
                              const groupDemands = demands.filter(d => 
                                 (statusGroup === 'A Fazer' && d.workStatus === 'A Fazer') ||
                                 (statusGroup === 'Em execução' && d.workStatus === 'Em Execução') ||
                                 (statusGroup === 'Entregue' && d.workStatus === 'Entregue')
                              );

                              return (
                                 <div key={statusGroup} className="bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl w-[280px] shrink-0 p-3 flex flex-col max-h-full">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                       <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{statusGroup}</h4>
                                       <button className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-sm">more_horiz</span></button>
                                    </div>
                                    
                                    <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-2">
                                       {groupDemands.map(d => (
                                          <div key={d.id} onClick={() => openDemandDetails(d)} className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 p-3 rounded-lg shadow-sm hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group">
                                             <div className="flex flex-wrap gap-1.5 mb-2">
                                                {d.priority && (
                                                   <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                      d.priority === 'High' || d.priority === 'Alta' ? 'bg-red-500/10 text-red-500' :
                                                      d.priority === 'Medium' || d.priority === 'Média' ? 'bg-amber-500/10 text-amber-500' :
                                                      'bg-blue-500/10 text-blue-500'
                                                   }`}>
                                                      {d.priority}
                                                   </span>
                                                )}
                                             </div>
                                             <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">{d.title}</h5>
                                             <div className="flex items-center justify-between mt-auto">
                                                {d.assigneeName ? (
                                                      <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold" title={d.assigneeName}>
                                                         {d.assigneeName.charAt(0)}
                                                      </div>
                                                ) : <div className="size-6 border border-dashed border-slate-300 rounded-full"></div>}
                                                <div className="flex items-center gap-1 text-slate-400 text-xs">
                                                   <span className="material-symbols-outlined text-[13px]">event</span>
                                                   {d.dueDate !== 'Sem prazo' ? formatDisplayDate(d.dueDate) : '-'}
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>

                                    <button onClick={() => setIsDemandModalOpen(true)} className="mt-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:bg-white/5 text-sm font-medium flex items-center justify-center gap-1 w-full py-2 rounded-lg transition-colors">
                                       <span className="material-symbols-outlined text-[16px]">add</span> Adicionar tarefa
                                    </button>
                                 </div>
                              );
                           })}
                        </div>
                     )}

                     {activeTab === 'cronograma' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 text-center">
                           <span className="material-symbols-outlined text-4xl mb-4">view_timeline</span>
                           <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">Cronograma</h4>
                           <p className="text-sm">Recurso Premium Asana.</p>
                        </div>
                     )}

                     {activeTab === 'painel' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 text-center">
                           <span className="material-symbols-outlined text-4xl mb-4">monitoring</span>
                           <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">Painel</h4>
                           <p className="text-sm">Desenvolvimento em andamento.</p>
                        </div>
                     )}

                     {activeTab === 'calendario' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 text-center">
                           <span className="material-symbols-outlined text-4xl mb-4">calendar_month</span>
                           <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">Calendário</h4>
                           <p className="text-sm">Integração futura.</p>
                        </div>
                     )}

                     {/* Barra flutuante de exclusão */}
                     {selectedDemandIds.size > 0 && (
                        <div className="mt-4 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 animate-in slide-in-from-bottom-2 duration-200">
                           <span className="text-sm font-bold text-red-500">
                              {selectedDemandIds.size} demanda(s) selecionada(s)
                           </span>
                           <div className="flex items-center gap-3">
                              <button onClick={() => setSelectedDemandIds(new Set())} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                 Limpar
                              </button>
                              <button onClick={handleDeleteSelectedDemands} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5 shadow-sm">
                                 <span className="material-symbols-outlined text-[14px]">delete</span>
                                 Excluir Selecionadas
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>

               {/* Sidebar Info Column: Resumo Geral */}
               <div className="lg:col-span-4 bg-slate-50/50 dark:bg-black/10 p-8 space-y-8 flex flex-col h-full">

                  <div>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Progresso do Projeto</p>
                     <div className="flex items-end justify-between mb-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white transition-all">{project.progress}%</span>
                     </div>
                     <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${project.progress}%` }}></div>
                     </div>
                     <p className="text-xs text-slate-400 mt-2">Calculado com base nas entregas das demandas.</p>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-3">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Resumo Financeiro</p>
                     <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 p-4 rounded-xl shadow-sm flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Valor Total</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">R$ {totalProjectValue.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm px-2">
                        <span className="text-slate-500">Valor Pago:</span>
                        <span className="font-bold text-emerald-500">R$ {totalPaid.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm px-2">
                        <span className="text-slate-500">A Receber:</span>
                        <span className="font-bold text-amber-500">R$ {totalPending.toFixed(2)}</span>
                     </div>
                  </div>

                  {/* NOVO: Seção de Anexos */}
                  <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arquivos e Anexos</p>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{attachments.length}</span>
                     </div>

                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {attachmentsLoading ? (
                           <div className="flex justify-center py-4">
                              <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                           </div>
                        ) : attachments.length === 0 ? (
                           <div className="text-center py-8 bg-white/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                              <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">upload_file</span>
                              <p className="text-[10px] text-slate-400">Nenhum arquivo anexado</p>
                           </div>
                        ) : (
                           attachments.map(file => (
                              <div key={file.id} className="group relative flex items-center gap-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 p-2 rounded-xl hover:border-primary/30 transition-all">
                                 <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${file.type.startsWith('image/') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    <span className="material-symbols-outlined text-xl">
                                       {file.type.startsWith('image/') ? 'image' : 'description'}
                                    </span>
                                 </div>
                                 <div className="flex-1 min-w-0 pr-6">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                    <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                 </div>
                                 
                                 <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="size-7 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-primary hover:text-slate-900 transition-all">
                                       <span className="material-symbols-outlined text-sm">download</span>
                                    </a>
                                    <button onClick={() => deleteAttachment(file.id, file.url)} className="size-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                                       <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>

                     {/* Upload Area */}
                     <label className="block w-full cursor-pointer group">
                        <input 
                           type="file" 
                           className="hidden" 
                           disabled={attachmentsLoading}
                           accept="image/png,image/jpeg,application/pdf"
                           onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                 if (file.size > 5 * 1024 * 1024) {
                                    alert('Arquivo muito grande! Limite de 5MB.');
                                    return;
                                 }
                                 await uploadFile(file);
                                 e.target.value = '';
                              }
                           }}
                        />
                        <div className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl group-hover:border-primary/50 group-hover:bg-primary/5 transition-all text-slate-400 group-hover:text-primary">
                           <span className="material-symbols-outlined text-sm">add_circle</span>
                           <span className="text-xs font-bold uppercase tracking-wider">Anexar Arquivo</span>
                        </div>
                     </label>
                  </div>
               </div>
            </div>
         </div>

         {/* Modal Nova Demanda */}
         {isDemandModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
               <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span> Adicionar Demanda
                     </h3>
                     <button onClick={() => setIsDemandModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                     </button>
                  </div>
                  <form onSubmit={handleCreateDemand} className="p-6 space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Serviço / Item da Tabela</label>
                        <div className="relative">
                           <select
                              required
                              value={selectedPriceItem}
                              onChange={handleServiceChange}
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none appearance-none cursor-pointer"
                           >
                              <option value="" disabled>Escolha um serviço base...</option>
                              <optgroup label="🎨 Criação">
                                 {priceTableItems.filter(i => i.status === 'Criação').map(item => (
                                    <option key={item.id} value={item.id}>{item.title} - R$ {item.price.toFixed(2)}</option>
                                 ))}
                              </optgroup>
                              <optgroup label="🔁 Recriação">
                                 {priceTableItems.filter(i => i.status === 'Recriação').map(item => (
                                    <option key={item.id} value={item.id}>{item.title} - R$ {item.price.toFixed(2)}</option>
                                 ))}
                              </optgroup>
                           </select>
                           <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título da Demanda</label>
                        <input
                           required
                           type="text"
                           value={newDemandForm.title}
                           onChange={e => setNewDemandForm({ ...newDemandForm, title: e.target.value })}
                           className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none placeholder:text-slate-400"
                           placeholder="Nomeie esta demanda específica..."
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Entrega</label>
                        <input type="date" value={newDemandForm.dueDate} onChange={e => setNewDemandForm({ ...newDemandForm, dueDate: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Custo Freelancer/Ferramenta</label>
                        <div className="relative">
                           <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">payments</span>
                           <input
                              type="number"
                              step="0.01"
                              value={newDemandForm.cost || ''}
                              onChange={e => setNewDemandForm({ ...newDemandForm, cost: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none placeholder:text-slate-400"
                              placeholder="0.00"
                           />
                        </div>
                     </div>

                     {selectedPriceItem && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm flex items-center gap-3">
                           <span className="material-symbols-outlined text-primary">info</span>
                           <div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs">Valor Cobrado: R$ {priceTableItems.find(pt => pt.id === selectedPriceItem)?.price.toFixed(2)}</p>
                           </div>
                        </div>
                     )}

                     <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsDemandModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 shadow-sm shadow-primary/20 transition-colors">Criar Demanda</button>
                     </div>
                  </form>
               </div>
            </div>
         )}


         {/* Modal Visualizacao da Demanda (Pacote e Avulso) */}
         {isViewingDemand && activeDemand && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
               <div className={`bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full ${activeDemand.type === 'Avulso' ? 'max-w-4xl' : 'max-w-3xl'} overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10`}>

                  {/* --- HEADER --- */}
                  <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between bg-slate-50/50 dark:bg-black/20 shrink-0">
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                           <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(activeDemand.type)}`}>
                              {activeDemand.type}
                           </span>
                           <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${activeDemand.workStatus === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                              {activeDemand.workStatus}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 pr-4 group/title mt-1">
                           {isEditingMainTitle ? (
                              <div className="flex items-center gap-2 w-full max-w-md">
                                 <input
                                    value={mainTitleInput}
                                    onChange={e => setMainTitleInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-primary/50 rounded-lg px-3 py-1.5 text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveDemandEdits(); }}
                                 />
                                 <button onClick={saveDemandEdits} className="text-emerald-500 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-sm block">check</span>
                                 </button>
                                 <button onClick={() => { setIsEditingMainTitle(false); setMainTitleInput(activeDemand.title); }} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-sm block">close</span>
                                 </button>
                              </div>
                           ) : (
                              <>
                                 <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">{activeDemand.title}</h2>
                                 <button onClick={() => setIsEditingMainTitle(true)} className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-primary transition-opacity p-1" title="Editar Titulo">
                                    <span className="material-symbols-outlined text-sm block">edit</span>
                                 </button>
                              </>
                           )}
                        </div>
                     </div>
                     <button onClick={() => setIsViewingDemand(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 shrink-0">
                        <span className="material-symbols-outlined">close</span>
                     </button>
                  </div>

                  {/* --- BODY --- */}
                  <div className="overflow-y-auto custom-scrollbar flex-1 p-6">

                     {/* Informacoes Adicionais (apenas se vinculado ao Asana) */}
                     {activeDemand && activeDemand.asanaTaskId && (
                        <div className="mb-8 p-5 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                           <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                 <span className="material-symbols-outlined text-lg text-primary">analytics</span> Informacoes Adicionais
                              </h3>
                              {!isEditingDemandExtra ? (
                                 <button onClick={() => setIsEditingDemandExtra(true)} className="text-[10px] font-black uppercase tracking-tighter text-primary hover:underline">Editar</button>
                              ) : (
                                 <button onClick={saveDemandEdits} className="text-[10px] font-black uppercase tracking-tighter text-emerald-500 hover:underline">Salvar</button>
                              )}
                           </div>
                           <div className="space-y-6">
                              <div className="grid grid-cols-1 gap-4 max-w-2xl px-1">
                                 {/* Servico */}
                                 <div className="flex items-center gap-3 group/svc min-h-8">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase w-32 flex items-center gap-1.5 shrink-0">
                                       <span className="material-symbols-outlined text-sm">sell</span> Servico
                                    </span>
                                    <div className="flex-1">
                                       {isEditingDemandService ? (
                                          <div className="flex items-center gap-1">
                                             <select
                                                value={demandServiceInput}
                                                onChange={e => setDemandServiceInput(e.target.value)}
                                                className="flex-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                                autoFocus
                                             >
                                                <option value="" disabled>Selecione...</option>
                                                <optgroup label="Criacao">
                                                   {priceTableItems.filter(i => i.status === 'Criacao').map(item => (
                                                      <option key={item.id} value={item.id}>{item.title} - R$ {item.price.toFixed(2)}</option>
                                                   ))}
                                                </optgroup>
                                                <optgroup label="Recriacao">
                                                   {priceTableItems.filter(i => i.status === 'Recriacao').map(item => (
                                                      <option key={item.id} value={item.id}>{item.title} - R$ {item.price.toFixed(2)}</option>
                                                   ))}
                                                </optgroup>
                                             </select>
                                             <button onClick={async () => {
                                                const newSvc = priceTableItems.find(pt => pt.id === demandServiceInput);
                                                if (!newSvc) return;
                                                await updateDemand(activeDemand.id, { priceItemId: newSvc.id, amount: newSvc.price });
                                                setActiveDemand({ ...activeDemand, priceItemId: newSvc.id, amount: newSvc.price });
                                                setIsEditingDemandService(false);
                                             }} className="text-emerald-500 p-1">
                                                <span className="material-symbols-outlined text-sm block font-bold">check</span>
                                             </button>
                                             <button onClick={() => setIsEditingDemandService(false)} className="text-slate-400 p-1">
                                                <span className="material-symbols-outlined text-sm block font-bold">close</span>
                                             </button>
                                          </div>
                                       ) : (
                                          <div
                                             className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 py-1 px-2 rounded -ml-2 transition-colors"
                                             onClick={() => {
                                                setDemandServiceInput(activeDemand.priceItemId || '');
                                                setIsEditingDemandService(true);
                                             }}
                                          >
                                             <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{getServiceName(activeDemand.priceItemId)?.title || '—'}</span>
                                             {getServiceName(activeDemand.priceItemId) && <span className={`text-[9px] font-black px-1 py-0.5 rounded ${getServiceName(activeDemand.priceItemId)?.status === 'Criação' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>{getServiceName(activeDemand.priceItemId)?.status}</span>}
                                          </div>
                                       )}
                                    </div>
                                 </div>

                                 {/* Dynamic Fields from Asana */}
                                 {asanaFields.map(field => (
                                    <div key={field.gid} className="flex items-center gap-3 group/field min-h-8">
                                       <span className="text-[11px] font-bold text-slate-400 uppercase w-32 flex items-center gap-1.5 shrink-0">
                                          <span className="material-symbols-outlined text-sm">{field.name.toLowerCase().includes('priorid') ? 'priority' : field.name.toLowerCase().includes('status') ? 'stars' : 'info'}</span> {field.name}
                                       </span>
                                       <div className="flex-1">
                                          {field.type === 'enum' ? (
                                             <select
                                                value={field.enum_value?.gid || ''}
                                                onChange={async (e) => {
                                                   const gid = e.target.value;
                                                   const option = field.enum_options.find((o: any) => o.gid === gid);
                                                   if (!option) return;
                                                   await updateCustomField(activeDemand.asanaTaskId!, field.gid, { gid });
                                                   const updatePayload: any = {};
                                                   if (field.name.toLowerCase().includes('priorid')) updatePayload.priority = option.name;
                                                   if (field.name.toLowerCase().includes('status')) updatePayload.workStatus = option.name;
                                                   if (Object.keys(updatePayload).length > 0) {
                                                      await updateDemand(activeDemand.id, updatePayload);
                                                      setActiveDemand(prev => prev ? { ...prev, ...updatePayload } : prev);
                                                   }
                                                   setAsanaFields(prev => prev.map(f => f.gid === field.gid ? { ...f, enum_value: option } : f));
                                                }}
                                                className="w-full sm:w-auto min-w-[120px] bg-transparent border-none text-xs font-black uppercase text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 rounded py-1 px-2 -ml-2 transition-colors"
                                             >
                                                <option value="" disabled>Escolha...</option>
                                                {field.enum_options.map((opt: any) => (
                                                   <option key={opt.gid} value={opt.gid}>{opt.name}</option>
                                                ))}
                                             </select>
                                          ) : (
                                             <div className="text-xs font-bold text-slate-700 dark:text-slate-200 py-1 px-2 -ml-2">{field.display_value || '—'}</div>
                                          )}
                                       </div>
                                    </div>
                                 ))}

                                 {/* Valor (visualizacao) */}
                                 <div className="flex items-center gap-3 min-h-8">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase w-32 flex items-center gap-1.5 shrink-0">
                                       <span className="material-symbols-outlined text-sm">payments</span> Valor
                                    </span>
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 py-1 px-2 -ml-2">R$ {activeDemand.amount.toFixed(2)}</div>
                                 </div>

                                 {/* Custo (edicao) */}
                                 <div className="flex items-center gap-3 min-h-8 group/cost">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase w-32 flex items-center gap-1.5 shrink-0">
                                       <span className="material-symbols-outlined text-sm">payments</span> Custo
                                    </span>
                                    <div className="flex-1">
                                       {isEditingDemandCost ? (
                                          <div className="flex items-center gap-1">
                                             <input
                                                type="number"
                                                step="0.01"
                                                value={demandCostInput}
                                                onChange={e => setDemandCostInput(parseFloat(e.target.value) || 0)}
                                                className="w-24 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                                autoFocus
                                                onKeyDown={(e) => { if (e.key === 'Enter') saveDemandEdits(); }}
                                             />
                                             <button onClick={saveDemandEdits} className="text-emerald-500 p-1">
                                                <span className="material-symbols-outlined text-sm block font-bold">check</span>
                                             </button>
                                             <button onClick={() => setIsEditingDemandCost(false)} className="text-slate-400 p-1">
                                                <span className="material-symbols-outlined text-sm block font-bold">close</span>
                                             </button>
                                          </div>
                                       ) : (
                                          <div 
                                             className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 py-1 px-2 rounded -ml-2 transition-colors"
                                             onClick={() => {
                                                setDemandCostInput(activeDemand.cost || 0);
                                                setIsEditingDemandCost(true);
                                             }}
                                          >
                                             <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {(activeDemand.cost || 0).toFixed(2)}</span>
                                             <span className="material-symbols-outlined text-[10px] text-slate-400 opacity-0 group-hover/cost:opacity-100 transition-opacity">edit</span>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              {/* Projeto breadcrumb */}
                              <div className="flex items-center gap-3 py-4 border-y border-slate-100 dark:border-white/5">
                                 <span className="text-[11px] font-bold text-slate-400 uppercase w-32">Projetos</span>
                                 <div className="flex items-center gap-2">
                                    <div className="size-2 rounded bg-orange-500"></div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{project.title}</span>
                                    <span className="text-[10px] text-slate-400 shadow-sm px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 italic">Anuncios</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Descricao */}
                     <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                           <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                              Descricao
                           </h3>
                           {!isEditingDemandDesc ? (
                              <button onClick={() => setIsEditingDemandDesc(true)} className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Editar</button>
                           ) : (
                              <button onClick={saveDemandEdits} className="text-xs font-bold text-emerald-500 hover:underline">Salvar</button>
                           )}
                        </div>

                        {isEditingDemandDesc ? (
                           <textarea
                              value={demandDescInput}
                              onChange={(e) => setDemandDescInput(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none min-h-[120px] resize-y custom-scrollbar"
                              placeholder="Descreva os detalhes desta demanda..."
                              autoFocus
                           />
                        ) : (
                           <div className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-300 leading-relaxed min-h-[80px]">
                              {activeDemand.description ? (
                                 <div className="whitespace-pre-wrap">{renderDescription(activeDemand.description)}</div>
                              ) : (
                                 <p className="italic opacity-50 text-slate-400">Nenhuma descricao fornecida para esta demanda.</p>
                              )}
                           </div>
                        )}
                     </div>

                     {/* Acesso Rapido */}
                     <div className="space-y-4 pt-8">
                        <div className="flex items-center justify-between">
                           <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                              Acesso Rapido
                           </h3>
                           {!isEditingDemandLinks ? (
                              <button onClick={() => setIsEditingDemandLinks(true)} className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Editar</button>
                           ) : (
                              <button onClick={saveDemandEdits} className="text-xs font-bold text-emerald-500 hover:underline">Salvar</button>
                           )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <button
                              onClick={() => activeDemand.driveLink ? window.open(activeDemand.driveLink, '_blank') : alert('Link nao configurado.')}
                              className={`py-3 px-4 rounded-xl text-xs font-bold flex justify-center items-center gap-2 shadow-sm transition-colors border ${activeDemand.driveLink ? 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5 hover:border-primary/50 text-slate-700 dark:text-slate-200' : 'bg-transparent border-dashed border-slate-300 dark:border-white/10 text-slate-400'}`}
                           >
                              <span className="material-symbols-outlined text-sm">add_to_drive</span>
                              {activeDemand.driveLink ? 'Acessar Drive' : 'Adicionar Drive'}
                           </button>
                           <button
                              onClick={() => activeDemand.externalSystemLink ? window.open(activeDemand.externalSystemLink, '_blank') : alert('Link nao configurado.')}
                              className={`py-3 px-4 rounded-xl text-xs font-bold flex justify-center items-center gap-2 shadow-sm transition-colors border ${activeDemand.externalSystemLink ? 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5 hover:border-primary/50 text-slate-700 dark:text-slate-200' : 'bg-transparent border-dashed border-slate-300 dark:border-white/10 text-slate-400'}`}
                           >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              {activeDemand.externalSystemLink ? 'Sistema Externo' : 'Adicionar Link'}
                           </button>
                        </div>

                        {isEditingDemandLinks && (
                           <div className="space-y-3 p-4 bg-slate-50 dark:bg-black/20 border border-primary/50 rounded-xl mt-2 animate-in slide-in-from-top-2 duration-200">
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Link do Drive</label>
                                 <input
                                    type="url"
                                    value={demandDriveInput}
                                    onChange={e => setDemandDriveInput(e.target.value)}
                                    className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                    placeholder="https://drive.google..."
                                 />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sistema Externo</label>
                                 <input
                                    type="url"
                                    value={demandExternalInput}
                                    onChange={e => setDemandExternalInput(e.target.value)}
                                    className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                    placeholder="https://trello.com/..."
                                 />
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Itens do Pacote */}
                     {activeDemand.type === 'Pacote' && activeDemand.subDemands && (
                        <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-white/5">
                           <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                 Itens do Pacote
                              </h3>
                              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                                 {activeDemand.completedQuantity} / {activeDemand.totalQuantity} Entregues
                              </span>
                           </div>

                           <div className="space-y-3">
                              {activeDemand.subDemands.map((sd, index) => (
                                 <div key={sd.id} className="flex flex-col p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 group hover:border-primary/30 transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                       <div className="flex items-center gap-3 flex-1">
                                          <button
                                             onClick={() => toggleSubDemandStatus(sd.id)}
                                             className={`size-6 rounded-md flex items-center justify-center border transition-all shrink-0 ${sd.workStatus === 'Entregue' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/20 text-transparent'}`}
                                          >
                                             <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                          </button>
                                          <input
                                             type="text"
                                             value={sd.title}
                                             onChange={(e) => renameSubDemand(sd.id, e.target.value)}
                                             className={`bg-transparent border-none outline-none text-sm font-bold w-full p-0 focus:ring-0 ${sd.workStatus === 'Entregue' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}
                                          />
                                       </div>
                                       <button
                                          onClick={() => setExpandedSubDemandId(expandedSubDemandId === sd.id ? null : sd.id)}
                                          className={`p-1 rounded ${expandedSubDemandId === sd.id ? 'text-primary bg-primary/10' : 'text-slate-400'}`}
                                       >
                                          <span className="material-symbols-outlined text-sm block">link</span>
                                       </button>
                                    </div>
                                    {expandedSubDemandId === sd.id && (
                                       <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div>
                                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Link Drive</label>
                                             <input
                                                type="url"
                                                value={sd.driveLink || ''}
                                                onChange={(e) => updateSubDemandLinkFn(sd.id, 'driveLink', e.target.value)}
                                                className="w-full bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                             />
                                          </div>
                                          <div>
                                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Externo</label>
                                             <input
                                                type="url"
                                                value={sd.externalSystemLink || ''}
                                                onChange={(e) => updateSubDemandLinkFn(sd.id, 'externalSystemLink', e.target.value)}
                                                className="w-full bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                             />
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Comentarios */}
                     <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                           Comentarios
                        </h3>

                        <div className="space-y-4">
                           {commentsLoading && comments.length === 0 ? (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                 <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                 Carregando...
                              </div>
                           ) : comments.length === 0 ? (
                              <div className="text-center py-6 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                 <p className="text-xs text-slate-400 italic">Nenhum comentario ainda.</p>
                              </div>
                           ) : (
                              comments.map((comment) => (
                                 comment.type === 'system' ? (
                                    <div key={comment.id} className="flex gap-3 items-center py-2 px-1 text-slate-400">
                                       <div className="size-6 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                          <span className="material-symbols-outlined text-[14px]">info</span>
                                       </div>
                                       <span className="text-[11px] font-medium leading-tight italic">
                                          {renderDescription(comment.content)} &bull; {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                       </span>
                                    </div>
                                 ) : (
                                    <div key={comment.id} className="flex gap-3 group/comment py-2">
                                       <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                          <span className="text-[10px] font-black text-primary uppercase">{comment.userName?.charAt(0) || 'U'}</span>
                                       </div>
                                       <div className="flex-1 space-y-0.5">
                                          <div className="flex items-center gap-2">
                                             <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">{comment.userName}</span>
                                             <span className="text-[10px] text-slate-400 font-bold">
                                                &bull; {new Date(comment.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short' })}
                                             </span>
                                          </div>
                                          <div className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                             {renderDescription(comment.content)}
                                          </div>
                                       </div>
                                    </div>
                                 )
                              ))
                           )}
                        </div>

                        <div className="relative group">
                           <textarea
                              value={newCommentInput}
                              onChange={(e) => setNewCommentInput(e.target.value)}
                              placeholder="Escreva um comentario..."
                              className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 pb-12 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all min-h-[100px] resize-none hover:border-primary/30 shadow-sm"
                           />
                           <div className="absolute bottom-3 right-3">
                              <button
                                 onClick={handlePostComment}
                                 disabled={!newCommentInput.trim()}
                                 className="bg-primary text-slate-900 p-2 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                              >
                                 <span className="material-symbols-outlined block">send</span>
                              </button>
                           </div>
                        </div>
                     </div>

                  </div>
               </div>
            </div>
         )}

         {/* Modal Editar Projeto */}
         {isEditProjectOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
               <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">edit</span>
                        Editar Projeto
                     </h3>
                     <button onClick={() => setIsEditProjectOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                     </button>
                  </div>
                  <div className="p-6 space-y-5">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título *</label>
                        <input
                           type="text"
                           value={editProjectForm.title}
                           onChange={e => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
                           className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cliente</label>
                        <select
                           value={editProjectForm.clientId}
                           onChange={e => setEditProjectForm({ ...editProjectForm, clientId: e.target.value })}
                           className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        >
                           <option value="">Selecione um cliente</option>
                           {allClients.map(c => (
                              <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                           ))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data de Entrega</label>
                        <input
                           type="date"
                           value={editProjectForm.dueDate}
                           onChange={e => setEditProjectForm({ ...editProjectForm, dueDate: e.target.value })}
                           className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                     </div>
                     <div className="max-h-[450px] overflow-y-auto custom-scrollbar pr-2 space-y-5">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Função / Categoria do Trabalho *</label>
                           <div className="relative">
                             <select
                               required
                               value={editProjectForm.category}
                               onChange={e => setEditProjectForm({ ...editProjectForm, category: e.target.value })}
                               className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none cursor-pointer"
                             >
                               <option value="Design">🎨 Design</option>
                               <option value="Marketing">📈 Marketing</option>
                               <option value="Planejamento de criação">📝 Planejamento de criação</option>
                               <option value="Sprints de design">⚡ Sprints de design</option>
                               <option value="Criação de ativo">💎 Criação de ativo</option>
                               <option value="Calendário de conteúdo">🗓️ Calendário de conteúdo</option>
                               <option value="Planejamento estratégico">🎯 Planejamento estratégico</option>
                               <option value="Gestão de projetos">📂 Gestão de projetos</option>
                               <option value="Tecnologia da informação (TI)">💻 TI / Desenvolvimento</option>
                               <option value="Outros">⚙️ Outros</option>
                             </select>
                             <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link Gmail</label>
                              <input
                                 type="text"
                                 value={editProjectForm.gmailLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, gmailLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                 placeholder="https://mail.google.com/..."
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link Outlook</label>
                              <input
                                 type="text"
                                 value={editProjectForm.outlookLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, outlookLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                 placeholder="https://outlook.office.com/..."
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Drive</label>
                              <input
                                 type="text"
                                 value={editProjectForm.driveLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, driveLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                 placeholder="https://drive.google.com/..."
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dropbox</label>
                              <input
                                 type="text"
                                 value={editProjectForm.dropboxLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, dropboxLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                 placeholder="https://www.dropbox.com/..."
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Figma</label>
                              <input
                                 type="text"
                                 value={editProjectForm.figmaLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, figmaLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                 placeholder="https://www.figma.com/..."
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notion</label>
                              <input
                                 type="text"
                                 value={editProjectForm.notionLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, notionLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                 placeholder="https://notion.so/..."
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Zoom</label>
                              <input
                                 type="text"
                                 value={editProjectForm.zoomLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, zoomLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teams</label>
                              <input
                                 type="text"
                                 value={editProjectForm.teamsLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, teamsLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Meet</label>
                              <input
                                 type="text"
                                 value={editProjectForm.meetLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, meetLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GitHub (User/Repo)</label>
                              <input
                                 type="text"
                                 value={editProjectForm.githubRepo}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, githubRepo: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adobe Acrobat Studio</label>
                              <input
                                 type="text"
                                 value={editProjectForm.adobeStudioLink}
                                 onChange={e => setEditProjectForm({ ...editProjectForm, adobeStudioLink: e.target.value })}
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                              />
                           </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 opacity-80">
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ID Asana (Opcional)</label>
                           <input
                              type="text"
                              value={editProjectForm.asanaProjectId}
                              onChange={e => setEditProjectForm({ ...editProjectForm, asanaProjectId: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                           />
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button onClick={() => setIsEditProjectOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                           Cancelar
                        </button>
                        <button onClick={handleSaveProject} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
                           <span className="material-symbols-outlined text-sm">check</span>
                           Salvar
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

export default ProjectDetails;