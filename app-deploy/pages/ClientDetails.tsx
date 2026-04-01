import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Client, Project, ServiceInvoice } from '../types';
import { useServiceInvoices } from '../hooks/useServiceInvoices';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [clientData, setClientData] = useState<Client | null>(null);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [demandCounts, setDemandCounts] = useState<Record<string, number>>({});

  // Notas Fiscais
  const { invoices, fetchInvoices, createInvoice, deleteInvoice } = useServiceInvoices(id);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: '', description: '', amount: '', issueDate: '', fileUrl: '' });

  // Estado local para permitir edição da nota do cliente
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // Estado para edição do cliente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', company: '', email: '', phone: '', cpfCnpj: '', contractUrl: '' });

  // Estado para exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Buscar cliente
      const { data: cData, error: cError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (cError || !cData) {
        setLoading(false);
        return;
      }

      const client: Client = {
        id: cData.id,
        name: cData.name,
        company: cData.company,
        email: cData.email,
        phone: cData.phone || '',
        cpfCnpj: cData.cpf_cnpj || '',
        status: cData.status,
        totalSpent: parseFloat(cData.total_spent) || 0,
        notes: cData.notes || '',
        contractUrl: cData.contract_url || ''
      };

      setClientData(client);
      setNotes(client.notes);

      // Buscar projetos do cliente
      const { data: pData } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (pData) {
        setClientProjects(pData.map((row: any) => ({
          id: row.id,
          title: row.title,
          client: row.client_name,
          clientId: row.client_id,
          priority: row.priority,
          status: row.status,
          progress: row.progress || 0,
          dueDate: row.due_date || '',
          description: row.description || ''
        })));

        // Buscar todas as demandas dos projetos deste cliente
        const projectIds = pData.map((p: any) => p.id);
        if (projectIds.length > 0) {
          const { data: demandsData } = await supabase
            .from('project_demands')
            .select('project_id, amount, payment_status')
            .in('project_id', projectIds);

          if (demandsData) {
            const paid = demandsData.filter((d: any) => d.payment_status === 'Pago').reduce((acc: number, d: any) => acc + parseFloat(d.amount), 0);
            const pending = demandsData.filter((d: any) => d.payment_status !== 'Pago').reduce((acc: number, d: any) => acc + parseFloat(d.amount), 0);
            setTotalPaid(paid);
            setTotalPending(pending);

            // Contar demandas por projeto
            const counts: Record<string, number> = {};
            demandsData.forEach((d: any) => {
              counts[d.project_id] = (counts[d.project_id] || 0) + 1;
            });
            setDemandCounts(counts);
          }
        }
      }

      setLoading(false);
    };

    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (id) fetchInvoices();
  }, [id, fetchInvoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Cliente Não Encontrado</h2>
        <button onClick={() => navigate('/clientes')} className="text-primary hover:underline">Voltar para Clientes</button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  const saveNotes = async () => {
    await supabase.from('clients').update({ notes }).eq('id', clientData.id);
    setIsEditingNotes(false);
  };

  const openEditModal = () => {
    setEditForm({
      name: clientData.name,
      company: clientData.company,
      email: clientData.email,
      phone: clientData.phone,
      cpfCnpj: clientData.cpfCnpj || '',
      contractUrl: clientData.contractUrl || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.email) {
      alert('Nome e E-mail são obrigatórios.');
      return;
    }
    await supabase.from('clients').update({
      name: editForm.name,
      company: editForm.company,
      email: editForm.email,
      phone: editForm.phone,
      cpf_cnpj: editForm.cpfCnpj,
      contract_url: editForm.contractUrl
    }).eq('id', clientData.id);

    setClientData({ ...clientData, ...editForm });
    setIsEditModalOpen(false);
  };

  const handleDeleteClient = async () => {
    await supabase.from('clients').delete().eq('id', clientData.id);
    navigate('/clientes');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors w-fit"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Voltar para Clientes
        </button>

        <button
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}#/painel/${clientData.id}`;
            navigator.clipboard.writeText(url);
            alert('Link do painel copiado!\n\n' + url);
          }}
          className="flex items-center gap-2 text-xs font-bold bg-primary text-slate-900 px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">share</span>
          Painel do Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Contact & Notes */}
        <div className="col-span-1 lg:col-span-4 space-y-6">

          {/* Main Profile Card */}
          <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/20 to-transparent"></div>

            <div className="size-20 rounded-full bg-surface-dark border-4 border-white dark:border-background-dark shadow-xl flex items-center justify-center font-black text-2xl text-primary mt-4 relative z-10">
              {getInitials(clientData.name)}
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-4">{clientData.name}</h2>
            <p className="text-sm font-medium text-slate-500 mb-3">{clientData.company}</p>

            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${clientData.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
              }`}>
              Cliente {clientData.status}
            </span>

            <div className="w-full border-t border-slate-100 dark:border-white/5 mt-6 pt-6 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="size-8 rounded-lg bg-slate-50 dark:bg-black/20 text-slate-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm">mail</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</p>
                  <a href={`mailto:${clientData.email}`} className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate hover:text-primary transition-colors block">
                    {clientData.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left">
                <div className="size-8 rounded-lg bg-slate-50 dark:bg-black/20 text-slate-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm">phone</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                  <a href={`tel:${clientData.phone}`} className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate hover:text-primary transition-colors block">
                    {clientData.phone}
                  </a>
                </div>
              </div>

              {clientData.cpfCnpj && (
                <div className="flex items-center gap-3 text-left">
                  <div className="size-8 rounded-lg bg-slate-50 dark:bg-black/20 text-slate-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm">badge</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPF/CNPJ</p>
                    <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-200">{clientData.cpfCnpj}</p>
                  </div>
                </div>
              )}

              {clientData.contractUrl && (
                <div className="flex items-center gap-3 text-left">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm">description</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contrato</p>
                    <a href={clientData.contractUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-0.5">
                      Abrir Contrato Anexado
                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="w-full border-t border-slate-100 dark:border-white/5 mt-4 pt-4 flex gap-2">
              <button
                onClick={openEditModal}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors border border-slate-200 dark:border-white/10"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/20"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Excluir
              </button>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Notas do Cliente</h3>
              {!isEditingNotes ? (
                <button onClick={() => setIsEditingNotes(true)} className="text-primary hover:bg-primary/10 rounded-md p-1 transition-colors">
                  <span className="material-symbols-outlined text-sm block">edit</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingNotes(false)} className="text-slate-500 hover:text-red-500 rounded-md p-1 transition-colors">
                    <span className="material-symbols-outlined text-sm block">close</span>
                  </button>
                  <button onClick={saveNotes} className="text-primary hover:bg-primary/10 rounded-md p-1 transition-colors">
                    <span className="material-symbols-outlined text-sm block">check</span>
                  </button>
                </div>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-white dark:bg-black/40 border border-primary/50 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 custom-scrollbar min-h-[120px]"
                placeholder="Adicione informações vitais sobre o cliente..."
                autoFocus
              />
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                {notes ? notes : <span className="italic opacity-50">Nenhuma nota disponível.</span>}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Projects */}
        <div className="col-span-1 lg:col-span-8 space-y-6">

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receita Recebida</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">R$ {totalPaid.toFixed(2)}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">pending</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Pendente</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">R$ {totalPending.toFixed(2)}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">work_history</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Projetos</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{clientProjects.length}</h3>
              </div>
            </div>
          </div>

          {/* Projects History */}
          <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Histórico de Projetos</h3>
              <button
                onClick={() => navigate('/projetos', { state: { openNewModal: true, defaultClientId: clientData.id } })}
                className="text-xs font-bold text-slate-900 bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Novo Projeto
              </button>
            </div>

            <div className="p-6 space-y-4">
              {clientProjects.length > 0 ? (
                clientProjects.map((project) => (
                  <div key={project.id} className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/projetos/${project.id}`)}>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">{project.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">{project.client}</p>
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">list_alt</span>
                          {demandCounts[project.id] || 0} demanda{(demandCounts[project.id] || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wide mb-1 ${project.status === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500' :
                        project.status === 'Em Revisão' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-primary/10 text-primary'
                        }`}>
                        {project.status}
                      </span>
                      <p className="text-[10px] font-medium text-slate-500">
                        {project.status === 'Entregue' ? 'Finalizado' : `Prazo: ${project.dueDate}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="size-12 bg-slate-100 dark:bg-black/20 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <span className="material-symbols-outlined">inbox</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">Nenhum projeto vinculado a este cliente ainda.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Notas Fiscais de Serviço */}
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
              Notas Fiscais de Serviço
            </h3>
            <button
              onClick={() => { setInvoiceForm({ invoiceNumber: '', description: '', amount: '', issueDate: '', fileUrl: '' }); setIsInvoiceModalOpen(true); }}
              className="text-xs font-bold text-slate-900 bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nova NF
            </button>
          </div>
          <div className="p-6 space-y-3">
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <div key={inv.id} className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">NF {inv.invoiceNumber}</span>
                      <span className="text-xs text-slate-400">{inv.issueDate}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 truncate">{inv.description || 'Sem descrição'}</p>
                    {inv.fileUrl && (
                      <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block truncate">
                        {inv.fileUrl}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {inv.amount.toFixed(2)}</span>
                    <button
                      title="Excluir NF"
                      onClick={() => deleteInvoice(inv.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="size-12 bg-slate-100 dark:bg-black/20 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <p className="text-sm font-medium text-slate-500">Nenhuma nota fiscal cadastrada.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Editar Cliente
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Empresa</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CPF/CNPJ</label>
                  <input
                    type="text"
                    value={editForm.cpfCnpj}
                    onChange={e => setEditForm({ ...editForm, cpfCnpj: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link do Contrato</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">link</span>
                  <input
                    type="url"
                    value={editForm.contractUrl}
                    onChange={e => setEditForm({ ...editForm, contractUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check</span>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="size-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Excluir Cliente</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Tem certeza que deseja excluir <strong>{clientData.name}</strong>? Esta ação é permanente e não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteClient}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Excluir Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Nota Fiscal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                Nova Nota Fiscal
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!invoiceForm.invoiceNumber || !invoiceForm.issueDate) {
                  alert('Número da NF e Data de Emissão são obrigatórios.');
                  return;
                }
                await createInvoice({
                  invoiceNumber: invoiceForm.invoiceNumber,
                  description: invoiceForm.description,
                  amount: parseFloat(invoiceForm.amount) || 0,
                  issueDate: invoiceForm.issueDate,
                  fileUrl: invoiceForm.fileUrl
                });
                setIsInvoiceModalOpen(false);
              }}
              className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número da NF *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNumber}
                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="Ex: 00001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data de Emissão *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.issueDate}
                    onChange={e => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição do Serviço</label>
                <textarea
                  value={invoiceForm.description}
                  onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all min-h-[80px] resize-y custom-scrollbar"
                  placeholder="Descrição do serviço prestado..."
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL do Arquivo</label>
                  <input
                    type="text"
                    value={invoiceForm.fileUrl}
                    onChange={e => setInvoiceForm({ ...invoiceForm, fileUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  Cadastrar NF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;