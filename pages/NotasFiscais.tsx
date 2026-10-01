import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { useNotasFiscais } from '../hooks/useNotasFiscais';
import { ServiceInvoice } from '../types';
import {
  NFSE_PORTAL_URL, ParsedNfse, emptyParsed, parseNfseXml, parseNfsePdf, parseNfseLink,
  buildNfseUrl, formatDoc, onlyDigits, nfseBaseName, nfseFolder, openExternal,
} from '../lib/nfse';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const dateBR = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

const inputCls =
  'w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

/* =================================================================== */

const NotasFiscais: React.FC = () => {
  const { clients } = useClients();
  const { invoices, loading, error, saveInvoice, updateClient, deleteInvoice, fileUrl } = useNotasFiscais();

  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const clientName = (id?: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? (c.company || c.name) : '';
  };

  const years = useMemo(() => {
    const set = new Set(invoices.map(i => i.issueDate?.slice(0, 4)).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return Array.from(set).sort().reverse();
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter(i => {
      if (year !== 'todos' && !i.issueDate?.startsWith(year)) return false;
      if (!q) return true;
      return [i.invoiceNumber, i.takerName, i.takerDoc, i.description, clientName(i.clientId)]
        .join(' ').toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, year, clients]);

  const groups = useMemo(() => {
    const map = new Map<string, ServiceInvoice[]>();
    filtered.forEach(i => {
      const key = nfseFolder(i.issueDate);
      map.set(key, [...(map.get(key) || []), i]);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // KPIs
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const valid = invoices.filter(i => i.status !== 'cancelada');
  const monthTotal = valid.filter(i => i.issueDate?.startsWith(ym)).reduce((a, i) => a + i.amount, 0);
  const yearTotal = valid.filter(i => i.issueDate?.startsWith(String(now.getFullYear()))).reduce((a, i) => a + i.amount, 0);
  const yearCount = valid.filter(i => i.issueDate?.startsWith(String(now.getFullYear()))).length;

  const openFile = async (inv: ServiceInvoice, kind: 'pdf' | 'xml', download = false) => {
    const path = kind === 'pdf' ? inv.filePath : inv.xmlPath;
    if (!path) return;
    setBusyId(inv.id + kind);
    try {
      const name = path.split('/').pop();
      await openExternal(await fileUrl(path, download ? name : undefined));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (inv: ServiceInvoice) => {
    if (!confirm(`Excluir a NF ${inv.invoiceNumber} e os arquivos guardados? (Isso não cancela a nota na Prefeitura.)`)) return;
    try { await deleteInvoice(inv); } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-1">Financeiro</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Notas Fiscais</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">NFS-e emitidas na Prefeitura de São Paulo, organizadas por mês.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="h-10 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl hover:border-primary flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">upload_file</span> Importar nota
          </button>
          <button onClick={() => openExternal(NFSE_PORTAL_URL)} className="h-10 px-5 text-sm font-bold text-slate-900 bg-primary rounded-xl hover:brightness-95 shadow-lg shadow-primary/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span> Emitir na Prefeitura
          </button>
        </div>
      </div>

      {/* Fluxo de emissão */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-5 grid md:grid-cols-3 gap-4">
        {[
          { icon: 'account_balance', title: 'Emita no portal', text: 'Entre com sua Senha Web na Nota do Milhão e emita a NFS-e normalmente.', action: () => openExternal(NFSE_PORTAL_URL), cta: 'Abrir portal' },
          { icon: 'download', title: 'Baixe o PDF ou XML', text: 'Na tela da nota, salve o PDF (Imprimir → PDF) ou exporte o XML. O link do e-mail também serve.' },
          { icon: 'drive_folder_upload', title: 'Importe aqui', text: 'O app lê os dados, renomeia como "NF 000123 - Cliente" e guarda na pasta do mês.', action: () => setImportOpen(true), cta: 'Importar' },
        ].map((s, i) => (
          <div key={s.title} className="flex gap-3">
            <div className="size-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center text-slate-900 dark:text-primary">
              <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white"><span className="text-slate-400 font-semibold mr-1">{i + 1}.</span>{s.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{s.text}</p>
              {s.action && <button onClick={s.action} className="text-xs font-bold text-slate-900 dark:text-primary underline decoration-primary decoration-2 underline-offset-4 mt-1.5">{s.cta}</button>}
            </div>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: `Emitido em ${MONTHS[now.getMonth()].toLowerCase()}`, value: brl(monthTotal) },
          { label: `Emitido em ${now.getFullYear()}`, value: brl(yearTotal) },
          { label: `Notas em ${now.getFullYear()}`, value: String(yearCount) },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</p>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número, tomador, CNPJ ou descrição…" className={`${inputCls} pl-10 bg-white dark:bg-surface-dark`} />
        </div>
        <select value={year} onChange={e => setYear(e.target.value)} className={`${inputCls} sm:w-40 bg-white dark:bg-surface-dark`}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
          <option value="todos">Todos os anos</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 text-sm text-amber-800 dark:text-amber-200">
          Não consegui ler as notas do banco: {error}. Confira se a migration de notas fiscais foi aplicada no Supabase.
        </div>
      )}

      {/* Arquivo por mês */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Carregando…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">folder_open</span>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2">Nenhuma nota {search ? 'encontrada' : 'guardada ainda'}</p>
          <p className="text-xs text-slate-400 mt-1">Emita na Prefeitura e importe o PDF ou XML aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([key, list]) => {
            const [y, m] = key.split('/');
            const total = list.filter(i => i.status !== 'cancelada').reduce((a, i) => a + i.amount, 0);
            const isCollapsed = collapsed[key];
            return (
              <div key={key} className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark overflow-hidden">
                <button onClick={() => setCollapsed(c => ({ ...c, [key]: !c[key] }))} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{isCollapsed ? 'folder' : 'folder_open'}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{MONTHS[Number(m) - 1]} {y}</p>
                      <p className="text-xs text-slate-400">Notas Fiscais / {y} / {m} · {list.length} {list.length === 1 ? 'nota' : 'notas'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{brl(total)}</span>
                    <span className="material-symbols-outlined text-slate-400">{isCollapsed ? 'expand_more' : 'expand_less'}</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5">
                    {list.map(inv => {
                      const cancelled = inv.status === 'cancelada';
                      const name = nfseBaseName({ invoiceNumber: inv.invoiceNumber, takerName: inv.takerName || clientName(inv.clientId) });
                      return (
                        <div key={inv.id} className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3 group ${cancelled ? 'opacity-60' : ''}`}>
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="size-10 shrink-0 rounded-lg bg-slate-100 dark:bg-black/30 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-500 text-[20px]">{inv.filePath ? 'picture_as_pdf' : inv.xmlPath ? 'code' : 'receipt_long'}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={name}>
                                {name}
                                {cancelled && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Cancelada</span>}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>{dateBR(inv.issueDate)}</span>
                                {inv.takerDoc && <span>{formatDoc(inv.takerDoc)}</span>}
                                {inv.verificationCode && <span>Cód. {inv.verificationCode}</span>}
                                {inv.clientId && clientName(inv.clientId) ? (
                                  <Link to={`/clientes/${inv.clientId}`} className="text-slate-700 dark:text-primary hover:underline">{clientName(inv.clientId)}</Link>
                                ) : (
                                  <select value="" onChange={e => updateClient(inv.id, e.target.value)} className="bg-transparent text-xs text-amber-600 dark:text-amber-400 outline-none cursor-pointer">
                                    <option value="">Vincular cliente…</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                                  </select>
                                )}
                              </p>
                              {inv.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{inv.description}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 lg:gap-2 justify-between lg:justify-end">
                            <span className={`text-base font-black tabular-nums mr-2 ${cancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{brl(inv.amount)}</span>
                            <div className="flex items-center gap-1">
                              {inv.filePath && <IconBtn icon="visibility" title="Abrir PDF" busy={busyId === inv.id + 'pdf'} onClick={() => openFile(inv, 'pdf')} />}
                              {inv.filePath && <IconBtn icon="download" title="Baixar PDF" onClick={() => openFile(inv, 'pdf', true)} />}
                              {inv.xmlPath && <IconBtn icon="code" title="Baixar XML" busy={busyId === inv.id + 'xml'} onClick={() => openFile(inv, 'xml', true)} />}
                              {(inv.nfseUrl || inv.fileUrl) && <IconBtn icon="account_balance" title="Ver na Prefeitura" onClick={() => openExternal(inv.nfseUrl || inv.fileUrl)} />}
                              <IconBtn icon="delete" title="Excluir do app" danger onClick={() => handleDelete(inv)} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {importOpen && (
        <ImportModal
          clients={clients}
          onClose={() => setImportOpen(false)}
          onSave={async (notes) => {
            for (const n of notes) await saveInvoice(n.data, n.clientId);
          }}
        />
      )}
    </div>
  );
};

const IconBtn: React.FC<{ icon: string; title: string; onClick: () => void; busy?: boolean; danger?: boolean }> = ({ icon, title, onClick, busy, danger }) => (
  <button
    title={title}
    onClick={onClick}
    className={`size-9 rounded-lg flex items-center justify-center transition-colors ${danger ? 'text-slate-400 hover:text-red-500 hover:bg-red-500/10 lg:opacity-0 lg:group-hover:opacity-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
  >
    <span className={`material-symbols-outlined text-[19px] ${busy ? 'animate-spin' : ''}`}>{busy ? 'progress_activity' : icon}</span>
  </button>
);

/* ======================= Modal de importação ======================= */

interface Pending { key: string; data: ParsedNfse; clientId: string }

const ImportModal: React.FC<{
  clients: { id: string; name: string; company: string; cpfCnpj: string }[];
  onClose: () => void;
  onSave: (notes: Pending[]) => Promise<void>;
}> = ({ clients, onClose, onSave }) => {
  const [pending, setPending] = useState<Pending[]>([]);
  const [link, setLink] = useState('');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const matchClient = (doc: string, name: string) => {
    const d = onlyDigits(doc);
    const byDoc = d && clients.find(c => onlyDigits(c.cpfCnpj) === d);
    if (byDoc) return byDoc.id;
    const n = name.toLowerCase().trim();
    const byName = n && clients.find(c => [c.company, c.name].some(x => x && x.toLowerCase().trim() === n));
    return byName ? byName.id : '';
  };

  /** Junta PDF + XML da mesma nota num único registro */
  const addParsed = (items: ParsedNfse[]) => {
    setPending(prev => {
      const next = [...prev];
      items.forEach(p => {
        const num = p.invoiceNumber.replace(/^0+/, '');
        const idx = num ? next.findIndex(x => x.data.invoiceNumber.replace(/^0+/, '') === num) : -1;
        if (idx >= 0) {
          const cur = next[idx].data;
          const merged: ParsedNfse = { ...cur };
          (Object.keys(p) as (keyof ParsedNfse)[]).forEach(k => {
            const v = p[k] as any;
            const empty = (cur as any)[k] === '' || (cur as any)[k] === 0 || (cur as any)[k] === undefined;
            // XML tem prioridade nos dados; PDF só complementa
            if (v !== '' && v !== 0 && v !== undefined && (empty || p.source === 'xml' || k === 'pdfFile')) (merged as any)[k] = v;
          });
          next[idx] = { ...next[idx], data: merged, clientId: next[idx].clientId || matchClient(merged.takerDoc, merged.takerName) };
        } else {
          next.push({ key: `${Date.now()}-${Math.random()}`, data: p, clientId: matchClient(p.takerDoc, p.takerName) });
        }
      });
      return next;
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    setParsing(true);
    setMsg(null);
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      try {
        if (/\.xml$/i.test(f.name) || f.type.includes('xml')) {
          const list = parseNfseXml(await f.text());
          if (!list.length) throw new Error('nenhuma NFS-e encontrada');
          addParsed(list);
        } else if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
          const p = await parseNfsePdf(f);
          if (!p.invoiceNumber) errors.push(`${f.name}: não achei o número da nota — confira os campos abaixo`);
          addParsed([p]);
        } else {
          errors.push(`${f.name}: formato não suportado (use PDF ou XML)`);
        }
      } catch (e: any) {
        errors.push(`${f.name}: ${e.message || 'não foi possível ler'}`);
      }
    }
    if (errors.length) setMsg({ type: 'error', text: errors.join(' · ') });
    setParsing(false);
  };

  const handleLink = () => {
    const p = parseNfseLink(link);
    if (!p) { setMsg({ type: 'error', text: 'Link não reconhecido. Cole o link da nota (notaprint.aspx?ccm=…&nf=…&cod=…).' }); return; }
    addParsed([p]);
    setLink('');
    setMsg({ type: 'info', text: 'Link lido. Complete tomador e valor (ou solte também o PDF da nota).' });
  };

  const update = (key: string, patch: Partial<ParsedNfse>) =>
    setPending(prev => prev.map(p => {
      if (p.key !== key) return p;
      const data = { ...p.data, ...patch };
      if (('invoiceNumber' in patch || 'verificationCode' in patch || 'providerCcm' in patch) && (!p.data.nfseUrl || p.data.nfseUrl.includes('notaprint'))) {
        data.nfseUrl = buildNfseUrl(data.providerCcm, data.invoiceNumber, data.verificationCode) || data.nfseUrl;
      }
      return { ...p, data };
    }));

  const save = async () => {
    const invalid = pending.find(p => !p.data.invoiceNumber || !p.data.issueDate);
    if (invalid) { setMsg({ type: 'error', text: 'Toda nota precisa de número e data de emissão.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      await onSave(pending);
      try { localStorage.setItem('nfse_ccm', pending[0]?.data.providerCcm || ''); } catch { /* */ }
      onClose();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const addManual = () => {
    let ccm = '';
    try { ccm = localStorage.getItem('nfse_ccm') || ''; } catch { /* */ }
    setPending(prev => [...prev, { key: `${Date.now()}`, data: { ...emptyParsed(), providerCcm: ccm }, clientId: '' }]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 my-8" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Importar nota emitida</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">PDF, XML ou link — o app preenche os dados e guarda uma cópia com o nome da nota.</p>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInput.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed py-10 text-center transition-colors ${dragging ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/60'}`}
          >
            <input ref={fileInput} type="file" accept=".pdf,.xml,application/pdf,text/xml,application/xml" multiple hidden onChange={e => e.target.files && handleFiles(e.target.files)} />
            <span className={`material-symbols-outlined text-4xl ${parsing ? 'animate-spin text-primary' : 'text-slate-300 dark:text-slate-600'}`}>{parsing ? 'progress_activity' : 'upload_file'}</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">{parsing ? 'Lendo a nota…' : 'Solte aqui o PDF e/ou XML da nota'}</p>
            <p className="text-xs text-slate-400 mt-1">ou clique para escolher · aceita vários arquivos e a exportação mensal em XML</p>
          </div>

          {/* Link */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">link</span>
              <input value={link} onChange={e => setLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLink()} placeholder="…ou cole o link da nota (do e-mail da Prefeitura)" className={`${inputCls} pl-9`} />
            </div>
            <button onClick={handleLink} disabled={!link.trim()} className="px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-primary disabled:opacity-40">Ler link</button>
          </div>

          {msg && (
            <p className={`text-xs rounded-lg px-3 py-2 ${msg.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-slate-700 dark:text-slate-200'}`}>{msg.text}</p>
          )}

          {/* Revisão */}
          {pending.length > 0 && (
            <div className="space-y-4">
              <p className={labelCls}>Confira antes de salvar</p>
              {pending.map(p => {
                const d = p.data;
                return (
                  <div key={p.key} className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4 bg-slate-50/50 dark:bg-black/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          Notas Fiscais / {nfseFolder(d.issueDate)} / <span className="font-semibold text-slate-800 dark:text-slate-100">{nfseBaseName(d)}</span>
                          {d.pdfFile ? '.pdf' : ''}{d.xmlContent ? (d.pdfFile ? ' + .xml' : '.xml') : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {d.pdfFile && <span className="text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">PDF</span>}
                        {d.xmlContent && <span className="text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded">XML</span>}
                        {d.cancelled && <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">CANCELADA</span>}
                        <button onClick={() => setPending(prev => prev.filter(x => x.key !== p.key))} className="size-7 rounded-md text-slate-400 hover:text-red-500 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <label><span className={labelCls}>Nº da nota</span><input className={inputCls} value={d.invoiceNumber} onChange={e => update(p.key, { invoiceNumber: e.target.value })} /></label>
                      <label><span className={labelCls}>Emissão</span><input type="date" className={inputCls} value={d.issueDate} onChange={e => update(p.key, { issueDate: e.target.value })} /></label>
                      <label><span className={labelCls}>Cód. verificação</span><input className={inputCls} value={d.verificationCode} onChange={e => update(p.key, { verificationCode: e.target.value.toUpperCase() })} /></label>
                      <label><span className={labelCls}>Valor (R$)</span><input type="number" step="0.01" className={`${inputCls} tabular-nums`} value={d.amount} onChange={e => update(p.key, { amount: Number(e.target.value) })} /></label>
                      <label className="col-span-2"><span className={labelCls}>Tomador</span><input className={inputCls} value={d.takerName} onChange={e => update(p.key, { takerName: e.target.value })} /></label>
                      <label><span className={labelCls}>CPF/CNPJ</span><input className={inputCls} value={formatDoc(d.takerDoc)} onChange={e => update(p.key, { takerDoc: e.target.value })} /></label>
                      <label><span className={labelCls}>Inscr. municipal (sua)</span><input className={inputCls} value={d.providerCcm} onChange={e => update(p.key, { providerCcm: e.target.value })} /></label>
                      <label className="col-span-2 md:col-span-4">
                        <span className={labelCls}>Cliente no app</span>
                        <select className={inputCls} value={p.clientId} onChange={e => setPending(prev => prev.map(x => (x.key === p.key ? { ...x, clientId: e.target.value } : x)))}>
                          <option value="">— Sem vínculo —</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.company ? `${c.company} · ${c.name}` : c.name}</option>)}
                        </select>
                      </label>
                      <label className="col-span-2 md:col-span-4"><span className={labelCls}>Discriminação do serviço</span><textarea rows={2} className={inputCls} value={d.description} onChange={e => update(p.key, { description: e.target.value })} /></label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={addManual} className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">edit_note</span> Registrar manualmente
          </button>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={!pending.length || saving || parsing} className="h-10 px-5 rounded-xl text-sm font-bold text-slate-900 bg-primary hover:brightness-95 disabled:opacity-40 flex items-center gap-2">
            <span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>
            {saving ? 'Guardando…' : `Guardar ${pending.length > 1 ? `${pending.length} notas` : 'nota'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotasFiscais;
