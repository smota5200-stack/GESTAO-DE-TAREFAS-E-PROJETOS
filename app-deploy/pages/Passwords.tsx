import React, { useState, useMemo } from 'react';
import { usePasswords } from '../hooks/usePasswords';
import { Password } from '../types';

const categoryOptions = ['Geral', 'E-mail', 'Redes Sociais', 'Banco', 'Servidor', 'Hospedagem', 'Outros'];

const Passwords: React.FC = () => {
    const { passwords, loading, createPassword, updatePassword, deletePassword } = usePasswords();
    const [searchTerm, setSearchTerm] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        url: '',
        username: '',
        password: '',
        notes: '',
        category: 'Geral'
    });

    // Delete modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pwToDelete, setPwToDelete] = useState<string | null>(null);

    const filteredPasswords = useMemo(() => {
        return passwords.filter(p =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [passwords, searchTerm]);

    const toggleVisibility = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        // Simple feedback
        const el = document.createElement('div');
        el.textContent = `${label} copiado!`;
        el.className = 'fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    };

    const openNewModal = () => {
        setEditingId(null);
        setForm({ title: '', url: '', username: '', password: '', notes: '', category: 'Geral' });
        setIsModalOpen(true);
    };

    const openEditModal = (pw: Password) => {
        setEditingId(pw.id);
        setForm({
            title: pw.title,
            url: pw.url,
            username: pw.username,
            password: pw.password,
            notes: pw.notes,
            category: pw.category
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert('O título é obrigatório.');
            return;
        }

        if (editingId) {
            await updatePassword(editingId, form);
        } else {
            await createPassword(form);
        }

        setIsModalOpen(false);
        setEditingId(null);
    };

    const confirmDelete = async () => {
        if (pwToDelete) {
            await deletePassword(pwToDelete);
            setIsDeleteModalOpen(false);
            setPwToDelete(null);
        }
    };

    const getCategoryColor = (cat: string) => {
        const map: Record<string, string> = {
            'E-mail': 'bg-blue-500/10 text-blue-500',
            'Redes Sociais': 'bg-pink-500/10 text-pink-500',
            'Banco': 'bg-emerald-500/10 text-emerald-500',
            'Servidor': 'bg-purple-500/10 text-purple-500',
            'Hospedagem': 'bg-orange-500/10 text-orange-500',
            'Outros': 'bg-slate-500/10 text-slate-500',
            'Geral': 'bg-primary/10 text-primary'
        };
        return map[cat] || map['Geral'];
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Page Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Senhas</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie suas credenciais de forma segura e organizada.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={openNewModal} className="bg-primary hover:bg-primary/90 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nova Senha
                    </button>
                </div>
            </div>

            {/* Passwords Table */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 dark:bg-black/10 gap-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">lock</span>
                        Cofre de Senhas
                    </h3>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por título, URL, categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-500 text-slate-900 dark:text-white w-full sm:w-64"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-slate-500">Carregando senhas...</p>
                        </div>
                    </div>
                ) : filteredPasswords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="size-16 bg-slate-100 dark:bg-black/20 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                            <span className="material-symbols-outlined text-3xl">lock</span>
                        </div>
                        <p className="text-slate-500 font-medium">
                            {searchTerm ? `Nenhuma senha encontrada para "${searchTerm}".` : 'Nenhuma senha cadastrada ainda.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={openNewModal} className="mt-4 text-primary font-bold text-sm hover:underline">
                                Adicionar primeira senha →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-surface-dark border-b border-slate-200 dark:border-white/5 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                    <th className="px-6 py-4">Serviço</th>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4">Senha</th>
                                    <th className="px-6 py-4">Categoria</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredPasswords.map((pw) => (
                                    <tr key={pw.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <span className="block text-sm font-bold text-slate-900 dark:text-slate-200">{pw.title}</span>
                                                {pw.url && (
                                                    <a
                                                        href={pw.url.startsWith('http') ? pw.url : `https://${pw.url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-primary hover:underline truncate block max-w-[200px]"
                                                    >
                                                        {pw.url}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{pw.username || '—'}</span>
                                                {pw.username && (
                                                    <button
                                                        title="Copiar usuário"
                                                        onClick={() => copyToClipboard(pw.username, 'Usuário')}
                                                        className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-slate-700 dark:text-slate-300 tracking-wider">
                                                    {visiblePasswords[pw.id] ? pw.password : '••••••••'}
                                                </span>
                                                <button
                                                    title={visiblePasswords[pw.id] ? 'Ocultar' : 'Mostrar'}
                                                    onClick={() => toggleVisibility(pw.id)}
                                                    className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">
                                                        {visiblePasswords[pw.id] ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                                <button
                                                    title="Copiar senha"
                                                    onClick={() => copyToClipboard(pw.password, 'Senha')}
                                                    className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(pw.category)}`}>
                                                {pw.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    title="Editar"
                                                    onClick={() => openEditModal(pw)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm block">edit</span>
                                                </button>
                                                <button
                                                    title="Excluir"
                                                    onClick={() => { setPwToDelete(pw.id); setIsDeleteModalOpen(true); }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm block">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">lock</span>
                                {editingId ? 'Editar Senha' : 'Nova Senha'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Título / Serviço *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Ex: Gmail, Banco, Hospedagem..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">URL</label>
                                <input
                                    type="text"
                                    value={form.url}
                                    onChange={e => setForm({ ...form, url: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Usuário / E-mail</label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={e => setForm({ ...form, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="usuario@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Senha</label>
                                    <input
                                        type="text"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 font-mono"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Categoria</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                >
                                    {categoryOptions.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Observações</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-y custom-scrollbar"
                                    placeholder="Informações extras..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {editingId ? 'Salvar' : 'Criar Senha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && pwToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="size-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                                    <span className="material-symbols-outlined text-2xl">warning</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Excluir Senha</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                        Tem certeza que deseja excluir esta credencial? Esta ação é permanente.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-8">
                                <button
                                    onClick={() => { setIsDeleteModalOpen(false); setPwToDelete(null); }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Passwords;
