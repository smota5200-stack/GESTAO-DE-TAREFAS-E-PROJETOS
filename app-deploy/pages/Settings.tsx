import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Settings: React.FC = () => {
    const [asanaToken, setAsanaToken] = useState('');
    const [asanaUserId, setAsanaUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*');
            if (data) {
                const token = data.find(s => s.key === 'asana_token')?.value || '';
                const userId = data.find(s => s.key === 'asana_user_id')?.value || '';
                setAsanaToken(token);
                setAsanaUserId(userId);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const updates = [
                { key: 'asana_token', value: asanaToken },
                { key: 'asana_user_id', value: asanaUserId }
            ];

            for (const update of updates) {
                const { error } = await supabase
                    .from('settings')
                    .upsert(update, { onConflict: 'key' });
                
                if (error) throw error;
            }

            setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
        } catch (err) {
            console.error('Erro ao salvar:', err);
            setMessage({ text: 'Erro ao salvar as configurações.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Configurações</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie integrações e preferências do sistema.</p>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">api</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Integração Asana</h3>
                        <p className="text-xs text-slate-500">Configure suas credenciais para sincronização bidirecional.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Personal Access Token (PAT)
                            </label>
                            <input
                                type="password"
                                value={asanaToken}
                                onChange={(e) => setAsanaToken(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                placeholder="0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                            <p className="text-[10px] text-slate-400">Gere este token no Console de Desenvolvedor do Asana.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Seu User ID no Asana
                            </label>
                            <input
                                type="text"
                                value={asanaUserId}
                                onChange={(e) => setAsanaUserId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                placeholder="1234567890"
                            />
                            <p className="text-[10px] text-slate-400">Necessário para monitorar tarefas atribuídas a você.</p>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {saving ? (
                                <span className="size-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">save</span>
                            )}
                            Salvar Configurações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
