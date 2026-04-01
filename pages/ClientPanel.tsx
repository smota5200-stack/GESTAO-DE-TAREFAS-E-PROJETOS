import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface DemandView {
    id: string;
    title: string;
    workStatus: string;
    paymentStatus: string;
    amount: number;
    dueDate: string;
    projectTitle: string;
    driveLink: string;
    externalSystemLink: string;
}

type DateFilter = 'todos' | 'mes_atual' | 'mes_anterior';

const ClientPanel: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const [clientName, setClientName] = useState('');
    const [clientCompany, setClientCompany] = useState('');
    const [demands, setDemands] = useState<DemandView[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>('mes_atual');
    const [selectedDemands, setSelectedDemands] = useState<Set<string>>(new Set());
    const [sendingPayment, setSendingPayment] = useState(false);
    const [paymentSent, setPaymentSent] = useState(false);
    const [notifiedDemandIds, setNotifiedDemandIds] = useState<Set<string>>(new Set());

    const toggleDemandSelection = (id: string) => {
        setSelectedDemands(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const sendPaymentNotification = async () => {
        if (selectedDemands.size === 0) return;
        setSendingPayment(true);
        const selected = demands.filter(d => selectedDemands.has(d.id));
        const rows = selected.map(d => ({
            demand_id: d.id,
            client_id: clientId,
            client_name: clientName,
            demand_title: d.title,
            amount: d.amount,
            status: 'pending'
        }));
        await supabase.from('payment_notifications').insert(rows);
        // Adicionar aos notificados
        setNotifiedDemandIds(prev => {
            const next = new Set(prev);
            selected.forEach(d => next.add(d.id));
            return next;
        });
        setSendingPayment(false);
        setSelectedDemands(new Set());
        setPaymentSent(true);
        setTimeout(() => setPaymentSent(false), 5000);
    };

    const getMonthLabel = (filter: DateFilter) => {
        const now = new Date();
        if (filter === 'mes_atual') {
            return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }
        if (filter === 'mes_anterior') {
            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return prev.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }
        return 'Todos os períodos';
    };

    const filterByDate = (list: DemandView[]) => {
        if (dateFilter === 'todos') return list;
        const now = new Date();
        let targetMonth: number, targetYear: number;
        if (dateFilter === 'mes_atual') {
            targetMonth = now.getMonth();
            targetYear = now.getFullYear();
        } else {
            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            targetMonth = prev.getMonth();
            targetYear = prev.getFullYear();
        }
        return list.filter(d => {
            if (!d.dueDate || d.dueDate === 'Sem prazo') return false;
            const parts = d.dueDate.split('/');
            if (parts.length !== 3) return false;
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return month === targetMonth && year === targetYear;
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!clientId) return;
            setLoading(true);

            // Buscar cliente
            const { data: cData, error } = await supabase
                .from('clients')
                .select('name, company')
                .eq('id', clientId)
                .single();

            if (error || !cData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            setClientName(cData.name);
            setClientCompany(cData.company);

            // Buscar projetos do cliente
            const { data: projects } = await supabase
                .from('projects')
                .select('id, title')
                .eq('client_id', clientId);

            if (!projects || projects.length === 0) {
                setLoading(false);
                return;
            }

            const projectIds = projects.map(p => p.id);
            const projectMap: Record<string, string> = {};
            projects.forEach(p => { projectMap[p.id] = p.title; });

            // Buscar demandas
            const { data: demandsData } = await supabase
                .from('project_demands')
                .select('*')
                .in('project_id', projectIds)
                .order('created_at', { ascending: false });

            if (demandsData) {
                setDemands(demandsData.map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    workStatus: d.work_status,
                    paymentStatus: d.payment_status,
                    amount: parseFloat(d.amount) || 0,
                    dueDate: d.due_date || '',
                    projectTitle: projectMap[d.project_id] || '',
                    driveLink: d.drive_link || '',
                    externalSystemLink: d.external_system_link || ''
                })));
            }

            setLoading(false);
        };

        fetchData();
    }, [clientId]);

    // Buscar notificações pendentes existentes
    useEffect(() => {
        const fetchNotified = async () => {
            if (!clientId) return;
            const { data } = await supabase
                .from('payment_notifications')
                .select('demand_id')
                .eq('client_id', clientId)
                .eq('status', 'pending');
            if (data) {
                setNotifiedDemandIds(new Set(data.map((n: any) => n.demand_id)));
            }
        };
        fetchNotified();
    }, [clientId]);

    const filtered = filterByDate(demands);
    const totalPaid = filtered.filter(d => d.paymentStatus === 'Pago').reduce((acc, d) => acc + d.amount, 0);
    const totalPending = filtered.filter(d => d.paymentStatus !== 'Pago').reduce((acc, d) => acc + d.amount, 0);
    const demandsFinalizadas = filtered.filter(d => d.workStatus === 'Entregue' && d.paymentStatus === 'Pago');
    const demandsEmAberto = filtered.filter(d => !(d.workStatus === 'Entregue' && d.paymentStatus === 'Pago'));

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500">Carregando painel...</p>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-400 mb-4 block">error</span>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Painel não encontrado</h1>
                    <p className="text-slate-500">Este link não é válido ou expirou.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="bg-white dark:bg-surface-dark border-b border-primary/10 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white">{clientName}</h1>
                            <p className="text-sm text-slate-500">{clientCompany} • Painel do Cliente</p>
                        </div>
                    </div>
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

                {/* Filtro de Período */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-slate-500 font-medium capitalize">
                        <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_month</span>
                        {getMonthLabel(dateFilter)}
                    </p>
                    <div className="flex bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                        {[
                            { key: 'mes_anterior' as DateFilter, label: 'Mês Anterior' },
                            { key: 'mes_atual' as DateFilter, label: 'Mês Atual' },
                            { key: 'todos' as DateFilter, label: 'Todos' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setDateFilter(f.key)}
                                className={`px-4 py-2 text-xs font-bold transition-colors ${dateFilter === f.key
                                    ? 'bg-primary text-slate-900'
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Geral</p>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">R$ {(totalPaid + totalPending).toFixed(2)}</h3>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pago</p>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">R$ {totalPaid.toFixed(2)}</h3>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">pending</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendente</p>
                        </div>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">R$ {totalPending.toFixed(2)}</h3>
                    </div>
                </div>

                {/* Demandas em Andamento / A Fazer */}
                {demandsEmAberto.length > 0 && (
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">hourglass_top</span>
                            <h2 className="font-bold text-slate-900 dark:text-white text-lg">Demandas em Aberto</h2>
                            <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-full">
                                {demandsEmAberto.length}
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {demandsEmAberto.map(d => (
                                <div key={d.id} className={`px-6 py-4 flex items-center justify-between transition-colors ${notifiedDemandIds.has(d.id) ? 'bg-emerald-500/5 opacity-70' : selectedDemands.has(d.id) ? 'bg-primary/5' : ''}`}>
                                    {/* Checkbox ou badge notificado */}
                                    {(d.paymentStatus === 'Pendente' || d.paymentStatus === 'A Pagar') && (
                                        notifiedDemandIds.has(d.id) ? (
                                            <div className="flex items-center gap-1.5 shrink-0 mr-3 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                <span className="material-symbols-outlined text-emerald-500 text-[14px]">schedule_send</span>
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Pagamento informado</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => toggleDemandSelection(d.id)}
                                                className={`size-5 rounded border-2 flex items-center justify-center shrink-0 mr-3 transition-colors ${selectedDemands.has(d.id) ? 'bg-primary border-primary text-slate-900' : 'border-slate-300 dark:border-white/20'}`}
                                            >
                                                {selectedDemands.has(d.id) && <span className="material-symbols-outlined text-[14px]">check</span>}
                                            </button>
                                        )
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{d.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">{d.projectTitle}</span>
                                            {d.dueDate && <span className="text-[10px] text-slate-400">• Prazo: {d.dueDate}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-4">
                                        {d.driveLink && (
                                            <a href={d.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors" title="Acessar Drive">
                                                <span className="material-symbols-outlined text-[12px]">add_to_drive</span>
                                                Drive
                                            </a>
                                        )}
                                        {d.externalSystemLink && (
                                            <a href={d.externalSystemLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 transition-colors" title="Sistema Externo">
                                                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                                Sistema
                                            </a>
                                        )}
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${d.workStatus === 'Entregue' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                                            {d.workStatus}
                                        </span>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {d.amount.toFixed(2)}</p>
                                            <span className={`text-[10px] font-bold ${d.paymentStatus === 'Pago' ? 'text-emerald-500' : d.paymentStatus === 'A Pagar' ? 'text-blue-500' : 'text-amber-500'}`}>
                                                {d.paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Demandas Concluídas */}
                {demandsFinalizadas.length > 0 && (
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">task_alt</span>
                            <h2 className="font-bold text-slate-900 dark:text-white text-lg">Demandas Finalizadas</h2>
                            <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-full">
                                {demandsFinalizadas.length}
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {demandsFinalizadas.map(d => (
                                <div key={d.id} className="px-6 py-4 flex items-center justify-between opacity-80">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                                            {d.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 ml-6">
                                            <p className="text-xs text-slate-500">{d.projectTitle}</p>
                                            {(d.driveLink || d.externalSystemLink) && (
                                                <>
                                                    {d.driveLink && (
                                                        <a href={d.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-500 hover:underline">
                                                            <span className="material-symbols-outlined text-[11px]">add_to_drive</span>Drive
                                                        </a>
                                                    )}
                                                    {d.externalSystemLink && (
                                                        <a href={d.externalSystemLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-500 hover:underline">
                                                            <span className="material-symbols-outlined text-[11px]">open_in_new</span>Sistema
                                                        </a>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {d.amount.toFixed(2)}</p>
                                            <span className={`text-[10px] font-bold ${d.paymentStatus === 'Pago' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {d.paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {filtered.length === 0 && (
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-12 shadow-sm text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">inbox</span>
                        <p className="text-slate-500 font-medium">
                            {demands.length === 0 ? 'Nenhuma demanda registrada ainda.' : 'Nenhuma demanda encontrada neste período.'}
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center py-6 text-xs text-slate-400">
                    <p>Painel gerado por <span className="font-bold text-primary">FreelanceOS</span></p>
                </div>
            </main>

            {/* Barra flutuante de pagamento */}
            {selectedDemands.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-surface-dark border border-primary/30 rounded-2xl shadow-2xl shadow-black/20 px-6 py-4 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-300 z-50">
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">payments</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDemands.size} demanda{selectedDemands.size !== 1 ? 's' : ''} selecionada{selectedDemands.size !== 1 ? 's' : ''}</p>
                            <p className="text-[10px] text-slate-500">
                                Total: R$ {demands.filter(d => selectedDemands.has(d.id)).reduce((acc, d) => acc + d.amount, 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedDemands(new Set())}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                    <button
                        onClick={sendPaymentNotification}
                        disabled={sendingPayment}
                        className="bg-primary text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">{sendingPayment ? 'hourglass_top' : 'send'}</span>
                        {sendingPayment ? 'Enviando...' : 'Informar Pagamento'}
                    </button>
                </div>
            )}

            {/* Toast de sucesso */}
            {paymentSent && (
                <div className="fixed top-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 z-50">
                    <span className="material-symbols-outlined">check_circle</span>
                    <div>
                        <p className="text-sm font-bold">Pagamento informado!</p>
                        <p className="text-[10px] opacity-80">O responsável será notificado.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientPanel;
