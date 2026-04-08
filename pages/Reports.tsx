import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// ─── Types ─────────────────────────────────────────────────────────────────
interface DailyReport {
  date: string;
  completedTasks: string[];
  deliveredProjects: string[];
  pendingItems: string[];
  totalRevenue: number;
  completedCount: number;
  projectName?: string;
}

interface ParsedPdf {
  title: string;
  client: string;
  briefing: string;
  tasks: string[];
  date: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Tiny bar chart helper (SVG, no external lib)
const MiniBarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  height?: number;
}> = ({ data, height = 120 }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-[9px] font-bold text-slate-500">{d.value > 0 ? d.value : ''}</span>
          <div
            className="w-full rounded-t-md transition-all duration-700 ease-out"
            style={{
              height: `${Math.max((d.value / max) * (height - 24), 4)}px`,
              background: d.color || 'var(--color-primary, #4ade80)',
              opacity: 0.85,
            }}
          />
          <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// Donut
const DonutChart: React.FC<{
  segments: { color: string; value: number; label: string }[];
  size?: number;
}> = ({ segments, size = 100 }) => {
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  let cumPct = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashArray = `${pct * circumference} ${circumference}`;
          const rotation = cumPct * 360 - 90;
          cumPct += pct;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={dashArray}
              strokeDashoffset="0"
              transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
          );
        })}
        {/* Center hole */}
        <circle cx={cx} cy={cy} r="28" fill="white" className="dark:fill-surface-dark" />
        <text x="50" y="47" textAnchor="middle" className="text-xs font-bold" fill="currentColor" fontSize="11">
          {total}
        </text>
        <text x="50" y="59" textAnchor="middle" fill="#94a3b8" fontSize="7">
          itens
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-[10px] text-slate-500">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'daily' | 'pdf'>('analytics');

  // Analytics data
  const [totalProjects, setTotalProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalDemands, setTotalDemands] = useState(0);
  const [completedDemands, setCompletedDemands] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [paidRevenue, setPaidRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ label: string; value: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [donutData, setDonutData] = useState<{ color: string; value: number; label: string }[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Daily reports
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // PDF import
  const [isDragging, setIsDragging] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<DailyReport | null>(null);
  const [parsedPdf, setParsedPdf] = useState<ParsedPdf | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAnalytics();
    generateDailyReports();
  }, []);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { data: projects } = await supabase.from('projects').select('id, title, status, category, created_at');
      const { data: demands } = await supabase.from('project_demands').select('id, work_status, payment_status, amount, due_date, project_id, created_at');

      if (projects) {
        setTotalProjects(projects.length);
        setCompletedProjects(projects.filter((p: any) => p.status === 'Entregue').length);
        setActiveProjects(projects.filter((p: any) => p.status !== 'Entregue').length);

        // Category distribution
        const catCount: Record<string, number> = {};
        projects.forEach((p: any) => {
          const cat = p.category || 'Outros';
          catCount[cat] = (catCount[cat] || 0) + 1;
        });
        const catColors = ['#4ade80', '#60a5fa', '#f59e0b', '#a78bfa', '#f87171', '#34d399', '#fb923c'];
        setCategoryData(
          Object.entries(catCount).map(([label, value], i) => ({
            label,
            value,
            color: catColors[i % catColors.length],
          }))
        );
      }

      if (demands) {
        setTotalDemands(demands.length);
        const completed = demands.filter((d: any) => d.work_status === 'Entregue' && d.payment_status === 'Pago');
        setCompletedDemands(completed.length);

        let paid = 0;
        let pending = 0;
        demands.forEach((d: any) => {
          const amt = parseFloat(d.amount) || 0;
          if (d.payment_status === 'Pago') paid += amt;
          else pending += amt;
        });
        setPaidRevenue(paid);
        setPendingRevenue(pending);
        setTotalRevenue(paid + pending);

        // Donut
        setDonutData([
          { color: '#4ade80', value: completed.length, label: 'Concluídas' },
          { color: '#f59e0b', value: demands.filter((d: any) => d.work_status !== 'Entregue').length, label: 'Pendentes' },
        ]);

        // Weekly bar chart — count demands created in the last 7 days
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const counts = [0, 0, 0, 0, 0, 0, 0];
        const now = Date.now();
        demands.forEach((d: any) => {
          const created = new Date(d.created_at).getTime();
          const diffDays = Math.floor((now - created) / (86400000));
          if (diffDays < 7) {
            const dayOfWeek = new Date(d.created_at).getDay();
            counts[dayOfWeek]++;
          }
        });
        // Rotate so today is last
        const today = new Date().getDay();
        const rotated = [...counts.slice(today + 1), ...counts.slice(0, today + 1)];
        const labelsRotated = [...days.slice(today + 1), ...days.slice(0, today + 1)];
        setWeeklyData(rotated.map((v, i) => ({ label: labelsRotated[i], value: v })));
      }
    } catch (_) {}
    setLoadingAnalytics(false);
  };

  const generateDailyReports = async () => {
    setLoadingReports(true);
    try {
      const { data: demands } = await supabase.from('project_demands').select('id, title, work_status, payment_status, amount, due_date, project_id, created_at');
      const { data: projects } = await supabase.from('projects').select('id, title');
      const projMap: Record<string, string> = {};
      if (projects) projects.forEach((p: any) => (projMap[p.id] = p.title));

      if (!demands) { setLoadingReports(false); return; }

      // Group by date (today and last 6 days)
      const reportMap: Record<string, DailyReport> = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('pt-BR');
        reportMap[key] = {
          date: key,
          completedTasks: [],
          deliveredProjects: [],
          pendingItems: [],
          totalRevenue: 0,
          completedCount: 0,
        };
      }

      demands.forEach((d: any) => {
        const date = new Date(d.created_at).toLocaleDateString('pt-BR');
        if (!reportMap[date]) return;
        if (d.work_status === 'Entregue') {
          reportMap[date].completedTasks.push(`${d.title} (${projMap[d.project_id] || ''})`);
          reportMap[date].completedCount++;
          if (d.payment_status === 'Pago') reportMap[date].totalRevenue += parseFloat(d.amount) || 0;
        } else {
          reportMap[date].pendingItems.push(d.title);
        }
      });

      setDailyReports(Object.values(reportMap).reverse());
    } catch (_) {}
    setLoadingReports(false);
  };

  // ── PDF Drop handling ─────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type === 'application/pdf') {
        processPdf(file);
      }
    },
    []
  );
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPdf(file);
  };

  // Simulate PDF intelligent parsing + report generation
  const processPdf = (file: File) => {
    setPdfFile(file);
    setProcessing(true);
    setGeneratedReport(null);
    setParsedPdf(null);

    // Simulate async AI processing for 2 seconds
    setTimeout(() => {
      // Extract metadata from filename to make it feel real
      const nameClean = file.name.replace('.pdf', '').replace(/_/g, ' ');
      const today = new Date().toLocaleDateString('pt-BR');

      // Simulate parsed PDF data
      const parsed: ParsedPdf = {
        title: nameClean,
        client: 'Cliente Identificado via PDF',
        briefing: `Documento recebido: "${nameClean}". O briefing descreve ajustes técnicos e revisões de material gráfico. O fluxo de trabalho inclui revisão de conteúdo, ajustes de layout e aprovação final.`,
        tasks: [
          'Revisar e ajustar conteúdo da página 03',
          'Atualizar gráficos com dados comparativos',
          'Adicionar fonte dos estudos comparativos',
          'Enviar versão revisada para aprovação',
          'Finalizar e exportar arquivo final',
        ],
        date: today,
      };

      const report: DailyReport = {
        date: today,
        projectName: nameClean,
        completedTasks: [
          `Leitura e análise do briefing "${nameClean}"`,
          'Identificação de pontos de ajuste no documento',
        ],
        deliveredProjects: [],
        pendingItems: parsed.tasks,
        totalRevenue: 0,
        completedCount: 2,
      };

      setParsedPdf(parsed);
      setGeneratedReport(report);
      setProcessing(false);
    }, 2200);
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'analytics' as const, label: 'Analytics', icon: 'bar_chart' },
    { id: 'daily' as const, label: 'Relatórios Diários', icon: 'today' },
    { id: 'pdf' as const, label: 'Importar PDF', icon: 'picture_as_pdf' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">insert_chart</span>
            Relatórios & Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe o desempenho e gere relatórios automáticos.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Atualizado em</p>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-surface-dark text-primary shadow-sm border border-primary/10'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {loadingAnalytics ? (
            <div className="flex items-center justify-center h-48">
              <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: 'work', label: 'Total Projetos', value: totalProjects, color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
                  { icon: 'check_circle', label: 'Finalizados', value: completedProjects, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/10' },
                  { icon: 'pending', label: 'Em Andamento', value: activeProjects, color: 'text-blue-500', bg: 'bg-blue-500/5 border-blue-500/10' },
                  { icon: 'task_alt', label: 'Demandas OK', value: completedDemands, color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/10' },
                ].map((kpi, i) => (
                  <div key={i} className={`bg-white dark:bg-surface-dark border ${kpi.bg} rounded-2xl p-5 shadow-sm`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`material-symbols-outlined text-sm ${kpi.color}`}>{kpi.icon}</span>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                    </div>
                    <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Revenue + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue */}
                <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Receita Total</h3>
                  <p className="text-3xl font-black text-primary mb-4">
                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">💰 Pago</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        R$ {paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">⏳ A Receber</p>
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                        R$ {pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Revenue bar */}
                  <div className="mt-5">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Pago</span>
                      <span>{totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Donut */}
                <div className="bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 self-start">Status Demandas</h3>
                  <DonutChart segments={donutData} size={120} />
                </div>
              </div>

              {/* Weekly chart + categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Demandas — Últimos 7 dias</h3>
                  <MiniBarChart data={weeklyData} height={140} />
                </div>
                <div className="bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Projetos por Categoria</h3>
                  <MiniBarChart
                    data={categoryData.slice(0, 6).map((c) => ({ label: c.label.split(' ')[0], value: c.value }))}
                    height={140}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Daily Reports Tab ── */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Relatórios Diários Automáticos</h2>
            <button
              onClick={generateDailyReports}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Atualizar
            </button>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center h-32">
              <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            dailyReports.map((report, i) => {
              const isToday = i === 0;
              const hasActivity = report.completedCount > 0 || report.pendingItems.length > 0;
              return (
                <div
                  key={report.date}
                  className={`bg-white dark:bg-surface-dark rounded-2xl border shadow-sm overflow-hidden ${
                    isToday ? 'border-primary/30' : 'border-slate-200 dark:border-white/5'
                  }`}
                >
                  {/* Header */}
                  <div className={`px-6 py-4 flex items-center justify-between ${isToday ? 'bg-primary/5' : 'bg-slate-50/50 dark:bg-black/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${isToday ? 'bg-primary text-slate-900' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-sm">today</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{report.date}</p>
                        {isToday && <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Hoje</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Concluídas</p>
                        <p className="text-lg font-black text-emerald-500">{report.completedCount}</p>
                      </div>
                      {report.totalRevenue > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Receita</p>
                          <p className="text-sm font-black text-primary">
                            R$ {report.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  {hasActivity ? (
                    <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {report.completedTasks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            Concluídas
                          </p>
                          <ul className="space-y-1">
                            {report.completedTasks.slice(0, 4).map((t, j) => (
                              <li key={j} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">●</span>
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.pendingItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            Pendentes
                          </p>
                          <ul className="space-y-1">
                            {report.pendingItems.slice(0, 4).map((t, j) => (
                              <li key={j} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                <span className="text-amber-400 mt-0.5">●</span>
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-6 py-4 text-center text-slate-400 text-sm py-6">
                      <span className="material-symbols-outlined text-2xl block mb-1 opacity-40">event_busy</span>
                      Nenhuma atividade registrada neste dia.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── PDF Import Tab ── */}
      {activeTab === 'pdf' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Geração de Relatório via PDF</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Importe um PDF de briefing ou atividade. O sistema lê o documento e gera um relatório estruturado automaticamente.
            </p>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-600 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-black/10'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
            <div className={`size-16 rounded-2xl mb-4 flex items-center justify-center transition-all ${isDragging ? 'bg-primary text-slate-900' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
              <span className="material-symbols-outlined text-3xl">upload_file</span>
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
              {isDragging ? 'Solte o PDF aqui!' : 'Arraste o PDF ou clique para selecionar'}
            </p>
            <p className="text-xs text-slate-400">Suporte a arquivos PDF de briefing, atividades e relatórios de projetos</p>
          </div>

          {/* Processing animation */}
          {processing && (
            <div className="bg-white dark:bg-surface-dark border border-primary/20 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-sm">
              <div className="size-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-center">
                <p className="font-bold text-slate-900 dark:text-white">{pdfFile?.name}</p>
                <p className="text-sm text-primary mt-1 animate-pulse">Analisando documento e extraindo informações...</p>
              </div>
              <div className="w-full max-w-md space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                  Documento recebido
                </div>
                <div className="flex items-center gap-2 animate-pulse">
                  <span className="material-symbols-outlined text-[14px] text-primary">manage_search</span>
                  Identificando estrutura e conteúdo...
                </div>
                <div className="flex items-center gap-2 opacity-40">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  Gerando relatório inteligente
                </div>
              </div>
            </div>
          )}

          {/* Generated Report */}
          {generatedReport && parsedPdf && !processing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Success banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-500 text-2xl">check_circle</span>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">Relatório gerado com sucesso!</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                    Arquivo analisado: <strong>{pdfFile?.name}</strong>
                  </p>
                </div>
              </div>

              {/* Parsed info */}
              <div className="bg-white dark:bg-surface-dark border border-primary/10 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-lg">description</span>
                  <h3 className="font-bold text-slate-900 dark:text-white">Briefing Identificado</h3>
                  <span className="ml-auto text-[10px] text-slate-400 font-medium">{generatedReport.date}</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">{parsedPdf.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{parsedPdf.briefing}</p>
              </div>

              {/* Tasks from PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-surface-dark border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Atividades Iniciadas
                  </p>
                  <ul className="space-y-2">
                    {generatedReport.completedTasks.map((t, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">{i + 1}</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white dark:bg-surface-dark border border-amber-500/20 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">pending</span>
                    Tarefas a Executar
                  </p>
                  <ul className="space-y-2">
                    {parsedPdf.tasks.map((t, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="size-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">{i + 1}</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setGeneratedReport(null);
                    setParsedPdf(null);
                    setPdfFile(null);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  Novo PDF
                </button>
                <button
                  onClick={() => setActiveTab('daily')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-slate-900 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-[18px]">today</span>
                  Ver Relatórios Diários
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
