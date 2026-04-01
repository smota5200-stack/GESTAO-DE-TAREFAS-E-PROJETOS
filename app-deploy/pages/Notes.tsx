import React, { useState, useMemo, useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { NoteColor } from '../types';

const colorMap: Record<NoteColor, { bg: string; border: string; text: string; dot: string }> = {
    yellow: { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', text: 'text-amber-900 dark:text-amber-200', dot: 'bg-amber-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', text: 'text-blue-900 dark:text-blue-200', dot: 'bg-blue-400' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-900 dark:text-emerald-200', dot: 'bg-emerald-400' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-500/10', border: 'border-pink-200 dark:border-pink-500/20', text: 'text-pink-900 dark:text-pink-200', dot: 'bg-pink-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', text: 'text-purple-900 dark:text-purple-200', dot: 'bg-purple-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', text: 'text-orange-900 dark:text-orange-200', dot: 'bg-orange-400' }
};

const colorOptions: NoteColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

const Notes: React.FC = () => {
    const { notes, loading, createNote, updateNote, togglePin, deleteNote } = useNotes();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ title: '', content: '', color: 'yellow' as NoteColor });

    // Delete modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

    const filteredNotes = useMemo(() => {
        return notes.filter(n =>
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [notes, searchTerm]);

    const openNewModal = () => {
        setEditingId(null);
        setForm({ title: '', content: '', color: 'yellow' });
        setIsModalOpen(true);
    };

    const openEditModal = (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        setEditingId(id);
        setForm({ title: note.title, content: note.content, color: note.color });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert('O título é obrigatório.');
            return;
        }

        if (editingId) {
            await updateNote(editingId, { title: form.title, content: form.content, color: form.color });
        } else {
            await createNote({ title: form.title, content: form.content, color: form.color });
        }

        setIsModalOpen(false);
        setForm({ title: '', content: '', color: 'yellow' });
        setEditingId(null);
    };

    const confirmDelete = async () => {
        if (noteToDelete) {
            await deleteNote(noteToDelete);
            setIsDeleteModalOpen(false);
            setNoteToDelete(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Page Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Notas</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Organize suas anotações e ideias com notas coloridas.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar notas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-500 text-slate-900 dark:text-white w-full sm:w-56"
                        />
                    </div>
                    <button onClick={openNewModal} className="bg-primary hover:bg-primary/90 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nova Nota
                    </button>
                </div>
            </div>

            {/* Notes Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-500">Carregando notas...</p>
                    </div>
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="size-16 bg-slate-100 dark:bg-black/20 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                        <span className="material-symbols-outlined text-3xl">sticky_note_2</span>
                    </div>
                    <p className="text-slate-500 font-medium">
                        {searchTerm ? `Nenhuma nota encontrada para "${searchTerm}".` : 'Nenhuma nota criada ainda.'}
                    </p>
                    {!searchTerm && (
                        <button onClick={openNewModal} className="mt-4 text-primary font-bold text-sm hover:underline">
                            Criar primeira nota →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredNotes.map((note) => {
                        const colors = colorMap[note.color];
                        return (
                            <div
                                key={note.id}
                                onClick={() => openEditModal(note.id)}
                                className={`${colors.bg} ${colors.border} border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative flex flex-col min-h-[180px]`}
                            >
                                {/* Pin indicator */}
                                {note.isPinned && (
                                    <div className="absolute top-3 right-3">
                                        <span className="material-symbols-outlined text-sm text-primary">push_pin</span>
                                    </div>
                                )}

                                <h3 className={`font-bold text-base ${colors.text} mb-2 pr-6 line-clamp-2`}>{note.title}</h3>
                                <p className={`text-sm ${colors.text} opacity-70 flex-1 line-clamp-5 whitespace-pre-wrap`}>{note.content}</p>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {new Date(note.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            title={note.isPinned ? 'Desfixar' : 'Fixar'}
                                            onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                                            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm text-slate-500">{note.isPinned ? 'push_pin' : 'keep'}</span>
                                        </button>
                                        <button
                                            title="Excluir"
                                            onClick={(e) => { e.stopPropagation(); setNoteToDelete(note.id); setIsDeleteModalOpen(true); }}
                                            className="p-1 rounded-md hover:bg-red-500/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm text-red-400">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">sticky_note_2</span>
                                {editingId ? 'Editar Nota' : 'Nova Nota'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Título *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Título da nota"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Conteúdo</label>
                                <textarea
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 min-h-[150px] resize-y custom-scrollbar"
                                    placeholder="Escreva o conteúdo da nota..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cor</label>
                                <div className="flex gap-3">
                                    {colorOptions.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setForm({ ...form, color: c })}
                                            className={`size-8 rounded-full ${colorMap[c].dot} border-2 transition-all ${form.color === c ? 'border-slate-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-primary/30' : 'border-transparent hover:scale-105'}`}
                                        />
                                    ))}
                                </div>
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
                                    {editingId ? 'Salvar' : 'Criar Nota'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && noteToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="size-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                                    <span className="material-symbols-outlined text-2xl">warning</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Excluir Nota</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                        Tem certeza que deseja excluir esta nota? Esta ação é permanente.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-8">
                                <button
                                    onClick={() => { setIsDeleteModalOpen(false); setNoteToDelete(null); }}
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

export default Notes;
