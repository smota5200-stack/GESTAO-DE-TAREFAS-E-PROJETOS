import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Settings: React.FC = () => {
    const [asanaToken, setAsanaToken] = useState('');
    const [asanaUserId, setAsanaUserId] = useState('');
    const [figmaToken, setFigmaToken] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [notionToken, setNotionToken] = useState('');
    const [zoomLink, setZoomLink] = useState('');
    const [teamsLink, setTeamsLink] = useState('');
    
    // UI state
    const [activeTab, setActiveTab] = useState<'geral' | 'integracoes'>('integracoes');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*');
            if (data) {
                setAsanaToken(data.find(s => s.key === 'asana_token')?.value || '');
                setAsanaUserId(data.find(s => s.key === 'asana_user_id')?.value || '');
                setFigmaToken(data.find(s => s.key === 'figma_token')?.value || '');
                setGithubToken(data.find(s => s.key === 'github_token')?.value || '');
                setNotionToken(data.find(s => s.key === 'notion_token')?.value || '');
                setZoomLink(data.find(s => s.key === 'zoom_link')?.value || '');
                setTeamsLink(data.find(s => s.key === 'teams_link')?.value || '');
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
                { key: 'asana_user_id', value: asanaUserId },
                { key: 'figma_token', value: figmaToken },
                { key: 'github_token', value: githubToken },
                { key: 'notion_token', value: notionToken },
                { key: 'zoom_link', value: zoomLink },
                { key: 'teams_link', value: teamsLink }
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
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Configurações</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie integrações e preferências do sistema.</p>
            </div>

            <div className="flex gap-6 border-b border-slate-200 dark:border-white/5">
                <button 
                   onClick={() => setActiveTab('geral')}
                   className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'geral' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Geral
                </button>
                <button 
                   onClick={() => setActiveTab('integracoes')}
                   className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'integracoes' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Integrações e Ferramentas
                </button>
            </div>

            {activeTab === 'integracoes' && (
                <form onSubmit={handleSave} className="space-y-6">
                    {/* ASANA */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">task_alt</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Asana</h3>
                                <p className="text-xs text-slate-500">Sincronize tarefas e projetos bidirecionalmente.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Personal Access Token (PAT)</span>
                                </label>
                                <input
                                    type="password"
                                    value={asanaToken}
                                    onChange={(e) => setAsanaToken(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">User ID</label>
                                <input
                                    type="text"
                                    value={asanaUserId}
                                    onChange={(e) => setAsanaUserId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="1234567890"
                                />
                            </div>
                        </div>
                    </div>

                    {/* FIGMA & GITHUB & NOTION */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">integration_instructions</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Produtividade & Design</h3>
                                <p className="text-xs text-slate-500">Tokens de acesso para ferramentas de design, código e docs.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">draw</span> Figma PAT
                                </label>
                                <input
                                    type="password"
                                    value={figmaToken}
                                    onChange={(e) => setFigmaToken(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="figd_xxxxxxxxxxxxx"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">code</span> GitHub PAT
                                </label>
                                <input
                                    type="password"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="ghp_xxxxxxxxxxxx"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">description</span> Notion Internal Token
                                </label>
                                <input
                                    type="password"
                                    value={notionToken}
                                    onChange={(e) => setNotionToken(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="secret_xxxxxxxx"
                                />
                            </div>
                        </div>
                    </div>

                    {/* COMUNICAÇÃO */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">video_camera_front</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Comunicação e Reuniões</h3>
                                <p className="text-xs text-slate-500">Links padrão para gerar reuniões instantâneas nos projetos.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Link Pessoal do Zoom (PMI)</label>
                                <input
                                    type="url"
                                    value={zoomLink}
                                    onChange={(e) => setZoomLink(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="https://zoom.us/j/123456789"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Link Fixo Microsoft Teams</label>
                                <input
                                    type="url"
                                    value={teamsLink}
                                    onChange={(e) => setTeamsLink(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                                />
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
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
                            Salvar Integrações
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'geral' && (
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-8 text-center text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-4 opacity-30">settings_applications</span>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Configurações Gerais</h3>
                    <p className="text-sm">Preferências de conta e exibição (Em desenvolvimento).</p>
                </div>
            )}
        </div>
    );
};

export default Settings;
