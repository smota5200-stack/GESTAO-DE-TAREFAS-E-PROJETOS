import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { supabase } from '../lib/supabaseClient';
import { Client } from '../types';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { clients, loading, createClient, deleteClient } = useClients();
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para o Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Estados para o Modal de Novo Cliente
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    cpfCnpj: '',
    notes: '',
    contractUrl: ''
  });

  // Totais reais das demandas por cliente
  const [clientTotals, setClientTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchTotals = async () => {
      if (clients.length === 0) return;
      const clientIds = clients.map(c => c.id);

      const { data: projects } = await supabase
        .from('projects')
        .select('id, client_id')
        .in('client_id', clientIds);

      if (!projects || projects.length === 0) return;

      const projectIds = projects.map(p => p.id);
      const projectToClient: Record<string, string> = {};
      projects.forEach((p: any) => { projectToClient[p.id] = p.client_id; });

      const { data: demands } = await supabase
        .from('project_demands')
        .select('project_id, amount')
        .in('project_id', projectIds);

      if (!demands) return;

      const totals: Record<string, number> = {};
      demands.forEach((d: any) => {
        const cId = projectToClient[d.project_id];
        if (cId) {
          totals[cId] = (totals[cId] || 0) + parseFloat(d.amount);
        }
      });
      setClientTotals(totals);
    };

    fetchTotals();
  }, [clients]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.cpfCnpj || '').includes(searchTerm)
    );
  }, [clients, searchTerm]);

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient(clientToDelete.id);
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name || !newClientForm.company || !newClientForm.email) {
      alert('Por favor, preencha Nome, Empresa e E-mail.');
      return;
    }

    await createClient({
      name: newClientForm.name,
      company: newClientForm.company,
      email: newClientForm.email,
      phone: newClientForm.phone,
      cpfCnpj: newClientForm.cpfCnpj,
      notes: newClientForm.notes,
      contractUrl: newClientForm.contractUrl
    });

    setIsNewModalOpen(false);
    setNewClientForm({ name: '', company: '', email: '', phone: '', cpfCnpj: '', notes: '', contractUrl: '' });
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie seus relacionamentos e contatos profissionais.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsNewModalOpen(true)} className="bg-primary hover:bg-primary/90 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 dark:bg-black/10 gap-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Todos os Clientes</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Nome, empresa ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-500 text-slate-900 dark:text-white w-full sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-surface-dark border-b border-slate-200 dark:border-white/5 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Info do Cliente</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">CPF/CNPJ</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Total Gasto</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => navigate(`/clientes/${client.id}`)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-slate-900 dark:text-slate-200 group-hover:text-primary transition-colors truncate">{client.name}</span>
                        <span className="text-xs text-slate-500 truncate">{client.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{client.company}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{client.cpfCnpj || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${client.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                    R$ {(clientTotals[client.id] || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        title="Ver Detalhes"
                        onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${client.id}`); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm block">visibility</span>
                      </button>
                      <button
                        title="Editar Cliente"
                        onClick={(e) => { e.stopPropagation(); alert(`Abrir modal de edição para ${client.name}`); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm block">edit</span>
                      </button>
                      <button
                        title="Excluir Cliente"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(client); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum cliente encontrado com "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && clientToDelete && (
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
                    Tem certeza que deseja excluir o cliente <strong>{clientToDelete.name}</strong>? Esta ação apagará permanentemente os dados do cliente e não poderá ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:hover:border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
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

      {/* Modal de Novo Cliente */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                Novo Cliente
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newClientForm.name}
                  onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Empresa *</label>
                <input
                  type="text"
                  required
                  value={newClientForm.company}
                  onChange={e => setNewClientForm({ ...newClientForm, company: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Ex: Tech Solutions Ltda"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={newClientForm.email}
                    onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                    placeholder="email@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={newClientForm.phone}
                    onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">CPF/CNPJ</label>
                <input
                  type="text"
                  value={newClientForm.cpfCnpj}
                  onChange={e => setNewClientForm({ ...newClientForm, cpfCnpj: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Link do Contrato (Drive, PDF, etc.)</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">link</span>
                  <input
                    type="url"
                    value={newClientForm.contractUrl}
                    onChange={e => setNewClientForm({ ...newClientForm, contractUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Notas</label>
                <textarea
                  value={newClientForm.notes}
                  onChange={e => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-y custom-scrollbar"
                  placeholder="Observações sobre o cliente, preferências de comunicação..."
                ></textarea>
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
                  Criar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;