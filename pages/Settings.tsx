import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const Settings: React.FC = () => {
    const [figmaToken, setFigmaToken] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [notionToken, setNotionToken] = useState('');
    const [zoomLink, setZoomLink] = useState('');
    const [teamsLink, setTeamsLink] = useState('');
    
    // Perfil State
    const [userName, setUserName] = useState('Sergio Mota');
    const [userRole, setUserRole] = useState('Administrador');
    const [userAvatar, setUserAvatar] = useState('https://ui-avatars.com/api/?name=Sergio+Mota&background=bcd200&color=171717');
    const [userEmail, setUserEmail] = useState('smota5200@gmail.com');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setUserAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    // UI state
    const [activeTab, setActiveTab] = useState<'geral' | 'integracoes'>('integracoes');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*');
            if (data) {
                setFigmaToken(data.find(s => s.key === 'figma_token')?.value || '');
                setGithubToken(data.find(s => s.key === 'github_token')?.value || '');
                setNotionToken(data.find(s => s.key === 'notion_token')?.value || '');
                setZoomLink(data.find(s => s.key === 'zoom_link')?.value || '');
                setTeamsLink(data.find(s => s.key === 'teams_link')?.value || '');
            }
            
            // Carregar Perfil do LocalStorage
            const savedName = localStorage.getItem('freela_user_name');
            const savedRole = localStorage.getItem('freela_user_role');
            const savedAvatar = localStorage.getItem('freela_user_avatar');
            if (savedName) setUserName(savedName);
            if (savedRole) setUserRole(savedRole);
            if (savedAvatar) setUserAvatar(savedAvatar);
            
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            if (activeTab === 'integracoes') {
                const updates = [
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
            } else if (activeTab === 'geral') {
                localStorage.setItem('freela_user_name', userName);
                localStorage.setItem('freela_user_role', userRole);
                localStorage.setItem('freela_user_avatar', userAvatar);
                
                // Recarregar a página para aplicar o perfil no Layout
                window.location.reload();
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
                <form onSubmit={handleSave} className="space-y-12 animate-in fade-in">
                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6 pb-8 border-b border-slate-200 dark:border-white/5">
                        <div 
                            className="size-[90px] shrink-0 rounded-full bg-slate-200 dark:bg-black/50 border-2 border-primary/20 overflow-hidden bg-cover bg-center shadow-lg" 
                            style={{ backgroundImage: `url('${userAvatar || 'https://ui-avatars.com/api/?name='+userName}')` }}
                        ></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Escolha sua foto de perfil</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium">Caso você não escolha uma foto de perfil, mostraremos suas iniciais.</p>
                            <div className="flex gap-4 items-center">
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-200 bg-white dark:bg-black/20 shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">upload</span> Escolher foto
                                </button>
                                <button type="button" onClick={() => setUserAvatar('')} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">Excluir</button>
                            </div>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
                        {/* Col 1 */}
                        <div className="space-y-6">
                            <h4 className="font-bold text-[15px] text-slate-900 dark:text-white">Informações pessoais</h4>
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">Nome</label>
                                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-bold text-slate-400">Email</label>
                                <input type="email" value={userEmail} disabled className="w-full bg-slate-50 dark:bg-black/40 border-none rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed" />
                            </div>
                            {/* Hidden userRole field kept logic-wise to not break Layout */}
                            <input type="hidden" value={userRole} />
                        </div>
                        
                        {/* Col 2 */}
                        <div className="space-y-6 lg:border-l lg:border-slate-200 lg:dark:border-white/5 lg:pl-8">
                            <h4 className="font-bold text-[15px] text-slate-900 dark:text-white">Senha</h4>
                            <button type="button" className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-200 bg-white dark:bg-black/20 shadow-sm">
                                Alterar senha
                            </button>
                        </div>

                        {/* Col 3 */}
                        <div className="space-y-6 lg:border-l lg:border-slate-200 lg:dark:border-white/5 lg:pl-8">
                            <h4 className="font-bold text-[15px] text-slate-900 dark:text-white">Sistema</h4>
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">Idioma</label>
                                <select className="w-full max-w-[200px] bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-medium">
                                    <option>Português</option>
                                    <option>Inglês</option>
                                </select>
                            </div>
                            <div className="pt-4 text-left">
                                <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Versão da Plataforma</p>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                    10/11/2026, 12:00
                                    <span className="text-emerald-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] font-bold">check</span> Atualizado</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-start pt-8">
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
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Settings;
