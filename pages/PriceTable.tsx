import React, { useState } from 'react';
import { usePriceTable } from '../hooks/usePriceTable';
import { PriceTableItem, PriceItemType } from '../types';

const PriceTable: React.FC = () => {
  const { items, loading, createItem, updateItem, deleteItem, markup, setMarkup } = usePriceTable();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PriceItemType>('Avulso');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [form, setForm] = useState<{ title: string; type: PriceItemType; price: string; description: string; quantity: string; status: 'Criação' | 'Recriação' }>({
    title: '',
    type: 'Avulso',
    price: '',
    description: '',
    quantity: '1',
    status: 'Criação'
  });

  const handleEdit = (item: PriceTableItem) => {
    setForm({
      title: item.title,
      type: item.type,
      price: item.price.toString(),
      description: item.description || '',
      quantity: item.quantity?.toString() || '1',
      status: item.status || 'Criação'
    });
    setEditingItemId(item.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      title: form.title,
      type: form.type,
      price: parseFloat(form.price) || 0,
      description: form.description,
      quantity: form.type === 'Pacote' ? parseInt(form.quantity) || 1 : 1,
      status: form.status
    };

    if (editingItemId) {
      await updateItem(editingItemId, itemData);
    } else {
      await createItem(itemData);
    }

    setIsModalOpen(false);
    setEditingItemId(null);
    setForm({ title: '', type: 'Avulso', price: '', description: '', quantity: '1', status: 'Criação' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este item da tabela de preços?')) {
      await deleteItem(id);
    }
  };


  const openNewModal = () => {
    setEditingItemId(null);
    setForm({ title: '', type: activeTab, price: '', description: '', quantity: '1', status: 'Criação' });
    setIsModalOpen(true);
  };

  const displayItems = items.filter(item => item.type === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Tabela de Preços</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os valores padronizados dos seus serviços avulsos e pacotes.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">percent</span>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Markup Tabela Sinapro:</label>
            <div className="flex items-center">
              <input 
                 type="number" 
                 min="0" 
                 max="100" 
                 value={markup || 0} 
                 onChange={e => setMarkup(Number(e.target.value) || 0)} 
                 className="w-12 bg-transparent text-sm font-black text-primary focus:ring-0 outline-none text-right"
              />
              <span className="text-sm font-black text-primary">%</span>
            </div>
          </div>
          <button
            onClick={openNewModal}
            className="bg-primary hover:bg-primary/90 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Novo Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10">
        {(['Avulso', 'Pacote'] as PriceItemType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            {tab === 'Avulso' ? 'Serviços Avulsos' : 'Pacotes Completos'}
          </button>
        ))}
      </div>

      {/* List / Table Mode */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {displayItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{item.title}</span>
                      {item.type === 'Pacote' && item.quantity && (
                        <span className="text-[10px] text-slate-500 mt-1 font-medium">{item.quantity} Entregáveis</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-sm xl:max-w-md truncate" title={item.description}>
                    {item.description || <span className="italic opacity-50">Sem descrição</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${item.status === 'Recriação' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                      {item.status || 'Criação'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white">R$ {item.price.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        title="Editar Item"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] block">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Excluir Item"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum {activeTab.toLowerCase()} cadastrado na tabela de preços.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo/Editar Preço */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">{editingItemId ? 'edit' : 'sell'}</span>
                {editingItemId ? 'Editar Item' : 'Adicionar à Tabela'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingItemId(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título do Serviço</label>
                <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none" placeholder="Ex: Criação de Logo" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Serviço</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as PriceItemType })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none">
                    <option value="Avulso">Avulso</option>
                    <option value="Pacote">Pacote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Base</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'Criação' | 'Recriação' })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none">
                    <option value="Criação">Criação</option>
                    <option value="Recriação">Recriação</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preço Padrão (R$)</label>
                  <input required type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none" placeholder="0.00" />
                </div>
                {form.type === 'Pacote' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Entregáveis</label>
                    <input required type="number" min="2" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none" placeholder="Qtd. de artes" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary/50 outline-none min-h-[80px] resize-y custom-scrollbar" placeholder="Descreva o que está incluso no valor..."></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-200 dark:border-white/10">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingItemId(null); }} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90">
                  {editingItemId ? 'Salvar Alterações' : 'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTable;