import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { useClients } from '../hooks/useClients';
import { usePriceTable } from '../hooks/usePriceTable';
import { useBudgets } from '../hooks/useBudgets';
import { ActionToolbar, Toast, useToast } from '../components/ActionToolbar';
import { elementToPdf, saveToDrive } from '../lib/driveFolder';

interface LineItem {
  id: string;
  description: string;
  details: string;
  quantity: number;
  unitPrice: number;
}

interface Draft {
  ref: string;
  selectedClientId: string;
  contactName: string;
  company: string;
  phone: string;
  email: string;
  currency: string;
  proposalDate: string;
  validityDays: number;
  deliveryTime: string;
  paymentTerms: string;
  observations: string;
  discount: number;
  items: LineItem[];
  savedId?: string;
}

const DRAFT_KEY = 'studio_mota_orcamento_rascunho';
const A4_WIDTH = 794; // px @96dpi
const A4_HEIGHT = 1123;

const CURRENCIES: Record<string, { locale: string; code: string; label: string }> = {
  REAL: { locale: 'pt-BR', code: 'BRL', label: 'Real (R$)' },
  USD: { locale: 'en-US', code: 'USD', label: 'Dólar (US$)' },
  EUR: { locale: 'de-DE', code: 'EUR', label: 'Euro (€)' },
};

const todayISO = () => new Date().toISOString().split('T')[0];
const newRef = () => `ORC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

const emptyDraft = (): Draft => ({
  ref: newRef(),
  selectedClientId: '',
  contactName: '',
  company: '',
  phone: '',
  email: '',
  currency: 'REAL',
  proposalDate: todayISO(),
  validityDays: 15,
  deliveryTime: '',
  paymentTerms: '50% na aprovação e 50% na entrega',
  observations: '',
  discount: 0,
  items: [],
});

const loadDraft = (): Draft => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...emptyDraft(), ...JSON.parse(raw) };
  } catch { /* storage indisponível */ }
  return emptyDraft();
};

const formatDatePTBR = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/* ---------- Pequenos componentes de formulário ---------- */

const inputCls =
  'w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string; hint?: string }> = ({ label, children, className = '', hint }) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

const Section: React.FC<{ step: number; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ step, title, subtitle, action, children }) => (
  <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
    <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
      <div className="flex items-start gap-3">
        <span className="size-7 shrink-0 rounded-lg bg-primary/15 text-[13px] font-black text-slate-900 dark:text-primary flex items-center justify-center">{step}</span>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white leading-7">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
    <div className="px-5 pb-5">{children}</div>
  </section>
);

/* ---------- Página ---------- */

const Orcamentos: React.FC = () => {
  const { clients } = useClients();
  const { items: priceItems } = usePriceTable();

  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busy, setBusy] = useState<'save' | 'pdf' | 'drive' | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const { budgets, saveBudget, deleteBudget } = useBudgets();
  const { toast, show } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const pdfRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [docHeight, setDocHeight] = useState(A4_HEIGHT);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));

  // Autosave do rascunho
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setSavedAt(new Date());
      } catch { /* ignora */ }
    }, 500);
    return () => clearTimeout(t);
  }, [draft]);

  // Escala da prévia A4 para caber na coluna
  useLayoutEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 48) / A4_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const doc = pdfRef.current;
    const ro2 = new ResizeObserver(() => doc && setDocHeight(doc.offsetHeight || A4_HEIGHT));
    if (doc) ro2.observe(doc);
    return () => { ro.disconnect(); ro2.disconnect(); };
  }, []);

  const handleClientChange = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    setDraft(d => ({
      ...d,
      selectedClientId: id,
      contactName: c?.name || d.contactName,
      company: c?.company || d.company,
      phone: c?.phone || d.phone,
      email: c?.email || d.email,
    }));
  };

  const addItem = (partial?: Partial<LineItem>) =>
    set('items', [...draft.items, { id: `${Date.now()}-${Math.random()}`, description: '', details: '', quantity: 1, unitPrice: 0, ...partial }]);
  const updateItem = (id: string, field: keyof LineItem, value: any) =>
    set('items', draft.items.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  const removeItem = (id: string) => set('items', draft.items.filter(i => i.id !== id));
  const moveItem = (index: number, dir: -1 | 1) => {
    const next = [...draft.items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('items', next);
  };

  const cur = CURRENCIES[draft.currency] || CURRENCIES.REAL;
  const money = (v: number) => new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code }).format(v || 0);

  const subtotal = draft.items.reduce((acc, i) => acc + Number(i.quantity) * Number(i.unitPrice), 0);
  const discount = Math.min(Number(draft.discount) || 0, subtotal);
  const total = subtotal - discount;

  const validUntil = useMemo(() => {
    if (!draft.proposalDate) return '';
    const d = new Date(draft.proposalDate + 'T12:00:00Z');
    d.setDate(d.getDate() + Number(draft.validityDays || 0));
    return d.toISOString().split('T')[0];
  }, [draft.proposalDate, draft.validityDays]);

  const filteredPriceItems = priceItems
    .filter(p => p.title.toLowerCase().includes(pickerSearch.toLowerCase()))
    .slice(0, 40);

  const newProposal = () => {
    if ((draft.items.length || draft.company) && !confirm('Limpar o formulário e começar um novo orçamento?')) return;
    setDraft(emptyDraft());
  };

  const fileBase = () => {
    const who = (draft.company || draft.contactName || 'Cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ._-]/g, '').trim();
    return `Proposta ${draft.ref} - ${who}`;
  };

  const handleSave = async () => {
    setBusy('save');
    try {
      const id = await saveBudget(draft, total, validUntil);
      setDraft(d => ({ ...d, savedId: id }));
      show({ type: 'ok', text: `Orçamento ${draft.ref} salvo.` });
    } catch (e: any) {
      show({ type: 'error', text: `Não consegui salvar: ${e.message}` });
    } finally {
      setBusy(null);
    }
  };

  const handleDrive = async () => {
    if (!pdfRef.current) return;
    setBusy('drive');
    try {
      const blob = await elementToPdf(pdfRef.current, `${fileBase()}.pdf`, [A4_WIDTH, A4_HEIGHT]);
      const [y, m] = (draft.proposalDate || todayISO()).split('-');
      const r = await saveToDrive('orcamentos', [{ subfolders: [y, m], name: `${fileBase()}.pdf` }].map(f => ({ ...f, blob })));
      if (r.mode === 'drive') show({ type: 'ok', text: `Salvo no Drive: ${r.folder} / ${y} / ${m} / ${fileBase()}.pdf` });
      else if (r.mode === 'download') show({ type: 'info', text: 'Seu navegador não grava em pastas — o PDF foi baixado.' });
    } catch (e: any) {
      show({ type: 'error', text: `Não consegui salvar no Drive: ${e.message}` });
    } finally {
      setBusy(null);
    }
  };

  const openSaved = (b: { draft: any; id: string }) => {
    setDraft({ ...emptyDraft(), ...b.draft, savedId: b.id });
    setSavedOpen(false);
    show({ type: 'info', text: `Orçamento ${b.draft.ref} aberto.` });
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);
    setBusy('pdf');
    try {
      const html2pdf = (window as any).html2pdf;
      await html2pdf()
        .from(pdfRef.current)
        .set({
          margin: 0,
          filename: `${fileBase()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [A4_WIDTH, A4_HEIGHT], orientation: 'portrait', hotfixes: ['px_scaling'] },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
        })
        .save();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um problema ao exportar o PDF.');
    } finally {
      setIsGenerating(false);
      setBusy(null);
    }
  };

  /* ---------- Documento (prévia e PDF) ---------- */
  const proposalDoc = (
    <div
      ref={pdfRef}
      className="bg-white text-slate-800 flex flex-col"
      style={{ width: A4_WIDTH, minHeight: A4_HEIGHT, fontFamily: 'Inter, sans-serif' }}
    >
      {/* Faixa de marca */}
      <div className="h-2 w-full" style={{ background: '#bcd200' }} />

      {/* Cabeçalho */}
      <div className="px-14 pt-12 pb-10 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Studio Mota" className="h-12 w-auto object-contain" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Studio Mota</p>
            <p className="text-[11px] text-slate-400">Design & Produção Gráfica</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Orçamento</p>
          <p className="text-[15px] font-bold text-slate-900 tabular-nums">{draft.ref}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatDatePTBR(draft.proposalDate)}</p>
        </div>
      </div>

      {/* Título + cliente */}
      <div className="px-14 pb-10">
        <h1 className="text-[40px] leading-[1.05] font-black tracking-tight text-slate-900">Proposta<br />Comercial</h1>
        <div className="mt-8 grid grid-cols-2 gap-10 border-t border-slate-200 pt-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">Preparado para</p>
            <p className="text-[15px] font-bold text-slate-900">{draft.company || 'Empresa do cliente'}</p>
            <p className="text-[12px] text-slate-600">{draft.contactName || 'Nome do contato'}</p>
          </div>
          <div className="text-[12px] text-slate-600 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">Contato</p>
            <p>{draft.email || 'email@cliente.com'}</p>
            <p>{draft.phone || '(00) 00000-0000'}</p>
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="px-14 flex-1">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.15em] text-slate-400 border-b-2 border-slate-900">
              <th className="text-left font-semibold py-2.5 w-8">#</th>
              <th className="text-left font-semibold py-2.5">Serviço</th>
              <th className="text-center font-semibold py-2.5 w-14">Qtd.</th>
              <th className="text-right font-semibold py-2.5 w-28">Unitário</th>
              <th className="text-right font-semibold py-2.5 w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {draft.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center text-slate-400 italic">Os itens adicionados aparecem aqui.</td>
              </tr>
            ) : (
              draft.items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-200 align-top">
                  <td className="py-4 text-slate-400 tabular-nums">{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-900">{item.description || 'Item sem nome'}</p>
                    {item.details && <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{item.details}</p>}
                  </td>
                  <td className="py-4 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-4 text-right tabular-nums text-slate-600">{money(Number(item.unitPrice))}</td>
                  <td className="py-4 text-right tabular-nums font-semibold text-slate-900">{money(Number(item.quantity) * Number(item.unitPrice))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totais */}
        <div className="flex justify-end mt-6 avoid-break">
          <div className="w-72 text-[12px]">
            {discount > 0 && (
              <>
                <div className="flex justify-between py-1.5 text-slate-600"><span>Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
                <div className="flex justify-between py-1.5 text-slate-600"><span>Desconto</span><span className="tabular-nums">− {money(discount)}</span></div>
              </>
            )}
            <div className="flex justify-between items-baseline mt-2 pt-4 border-t-2 border-slate-900">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Investimento total</span>
              <span className="text-[24px] font-black tracking-tight text-slate-900 tabular-nums">{money(total)}</span>
            </div>
          </div>
        </div>

        {/* Condições */}
        <div className="grid grid-cols-3 gap-6 mt-12 avoid-break">
          {[
            { label: 'Validade', value: `${draft.validityDays} dias · até ${formatDatePTBR(validUntil)}` },
            { label: 'Prazo de entrega', value: draft.deliveryTime || 'A combinar' },
            { label: 'Pagamento', value: draft.paymentTerms || 'A combinar' },
          ].map(c => (
            <div key={c.label} className="border-l-2 pl-3" style={{ borderColor: '#bcd200' }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">{c.label}</p>
              <p className="text-[12px] text-slate-800 whitespace-pre-wrap leading-relaxed">{c.value}</p>
            </div>
          ))}
        </div>

        {draft.observations && (
          <div className="mt-8 avoid-break">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">Observações</p>
            <p className="text-[12px] text-slate-600 whitespace-pre-wrap leading-relaxed">{draft.observations}</p>
          </div>
        )}
      </div>

      {/* Assinatura e rodapé */}
      <div className="px-14 pt-14 pb-10 avoid-break">
        <div className="grid grid-cols-2 gap-16 mb-10">
          <div className="border-t border-slate-300 pt-2 text-[11px] text-slate-500">Studio Mota</div>
          <div className="border-t border-slate-300 pt-2 text-[11px] text-slate-500">De acordo — {draft.company || 'Cliente'}</div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-4">
          <span>Studio Mota · Design & Produção Gráfica</span>
          <span>{draft.ref}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500 xl:h-[calc(100vh-6rem)]">
      {/* Barra de ações */}
      <ActionToolbar
        title={draft.savedId ? 'Editar orçamento' : 'Novo orçamento'}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{draft.ref}</span>
            <span className="size-1 rounded-full bg-slate-400" />
            {draft.savedId ? 'Salvo no sistema' : savedAt ? 'Rascunho automático' : 'Monte a proposta, salve e exporte em PDF.'}
          </span>
        }
        driveKey="orcamentos"
        onSave={handleSave}
        onClear={newProposal}
        onPdf={generatePDF}
        onDrive={handleDrive}
        onPreview={() => setPreviewOpen(true)}
        busy={busy}
        extra={
          <div className="relative">
            <button onClick={() => setSavedOpen(o => !o)} className="h-10 px-4 text-sm font-semibold rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
              <span className="material-symbols-outlined text-[18px]">folder_open</span> Salvos
              {budgets.length > 0 && <span className="text-[11px] font-bold bg-primary/20 text-slate-900 dark:text-primary px-1.5 rounded">{budgets.length}</span>}
            </button>
            {savedOpen && (
              <div className="absolute left-0 xl:left-auto xl:right-0 top-12 z-40 w-96 max-w-[90vw] bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <p className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-white/5">Orçamentos salvos</p>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {budgets.length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-400">Nenhum orçamento salvo ainda. Use o botão Salvar.</p>
                  ) : budgets.map(b => (
                    <div key={b.id} className={`group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 ${b.id === draft.savedId ? 'bg-primary/10' : ''}`}>
                      <button onClick={() => openSaved(b)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{b.clientName}</p>
                        <p className="text-xs text-slate-500 truncate">{b.ref} · {b.title}</p>
                      </button>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap">{money(b.total)}</span>
                      <button
                        title="Excluir"
                        onClick={async () => { if (confirm(`Excluir o orçamento ${b.ref}?`)) { await deleteBudget(b.id); if (b.id === draft.savedId) set('savedId', undefined); } }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Editor */}
        <div className="xl:col-span-5 flex flex-col gap-4 xl:overflow-y-auto custom-scrollbar xl:pr-1 pb-6">
          <Section step={1} title="Cliente" subtitle="Escolha da lista ou preencha à mão">
            <div className="space-y-4">
              <Field label="Cliente cadastrado">
                <select value={draft.selectedClientId} onChange={e => handleClientChange(e.target.value)} className={inputCls}>
                  <option value="">— Selecionar —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company ? `${c.company} · ${c.name}` : c.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Empresa"><input className={inputCls} value={draft.company} onChange={e => set('company', e.target.value)} /></Field>
                <Field label="Contato"><input className={inputCls} value={draft.contactName} onChange={e => set('contactName', e.target.value)} /></Field>
                <Field label="E-mail"><input type="email" className={inputCls} value={draft.email} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Telefone"><input type="tel" className={inputCls} value={draft.phone} onChange={e => set('phone', e.target.value)} /></Field>
              </div>
            </div>
          </Section>

          <Section
            step={2}
            title="Itens"
            subtitle={draft.items.length ? `${draft.items.length} ${draft.items.length === 1 ? 'item' : 'itens'} · ${money(subtotal)}` : 'Serviços que entram na proposta'}
            action={
              <div className="relative flex items-center gap-1.5">
                <button onClick={() => setPickerOpen(o => !o)} className="h-8 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-lg hover:border-primary flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">sell</span> Da tabela
                </button>
                <button onClick={() => addItem()} className="h-8 px-3 text-xs font-bold text-slate-900 bg-primary rounded-lg hover:brightness-95 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> Item
                </button>
                {pickerOpen && (
                  <div className="absolute right-0 top-10 z-30 w-80 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-white/5">
                      <input autoFocus placeholder="Buscar na tabela de preços…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className={`${inputCls} py-2`} />
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {filteredPriceItems.length === 0 ? (
                        <p className="p-4 text-xs text-slate-400 text-center">Nada encontrado.</p>
                      ) : filteredPriceItems.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { addItem({ description: p.title, details: p.description, unitPrice: p.price, quantity: p.quantity || 1 }); setPickerOpen(false); setPickerSearch(''); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-primary/10 flex items-center justify-between gap-3"
                        >
                          <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{p.title}</span>
                          <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">{money(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
          >
            {draft.items.length === 0 ? (
              <button onClick={() => addItem()} className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl py-8 text-sm text-slate-400 hover:border-primary hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex flex-col items-center gap-1">
                <span className="material-symbols-outlined">add_circle</span>
                Adicionar o primeiro item
              </button>
            ) : (
              <div className="space-y-3">
                {draft.items.map((item, idx) => (
                  <div key={item.id} className="group rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-black/20 p-3.5 focus-within:border-primary/60 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 tabular-nums">ITEM {String(idx + 1).padStart(2, '0')}</span>
                      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button title="Subir" onClick={() => moveItem(idx, -1)} className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"><span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span></button>
                        <button title="Descer" onClick={() => moveItem(idx, 1)} className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"><span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span></button>
                        <button title="Remover" onClick={() => removeItem(item.id)} className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Nome do serviço" className={`${inputCls} font-semibold bg-white dark:bg-black/30`} />
                      <textarea value={item.details} onChange={e => updateItem(item.id, 'details', e.target.value)} placeholder="Detalhes (opcional) — escopo, formato, prazo…" rows={1} className={`${inputCls} text-xs resize-y bg-white dark:bg-black/30`} />
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Qtd."><input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className={`${inputCls} bg-white dark:bg-black/30 tabular-nums`} /></Field>
                        <Field label="Unitário"><input type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} className={`${inputCls} bg-white dark:bg-black/30 tabular-nums`} /></Field>
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Total</span>
                          <p className="h-[42px] flex items-center justify-end text-sm font-bold text-slate-900 dark:text-white tabular-nums">{money(Number(item.quantity) * Number(item.unitPrice))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section step={3} title="Condições" subtitle="Validade, prazo, pagamento e valores">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data da proposta"><input type="date" className={inputCls} value={draft.proposalDate} onChange={e => set('proposalDate', e.target.value)} /></Field>
              <Field label="Validade (dias)" hint={validUntil ? `Até ${formatDatePTBR(validUntil)}` : undefined}>
                <input type="number" min={1} className={inputCls} value={draft.validityDays} onChange={e => set('validityDays', Number(e.target.value))} />
              </Field>
              <Field label="Prazo de entrega"><input className={inputCls} placeholder="Ex: 10 dias úteis" value={draft.deliveryTime} onChange={e => set('deliveryTime', e.target.value)} /></Field>
              <Field label="Moeda">
                <select className={inputCls} value={draft.currency} onChange={e => set('currency', e.target.value)}>
                  {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Pagamento" className="col-span-2">
                <textarea rows={2} className={inputCls} value={draft.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} />
              </Field>
              <Field label="Observações" className="col-span-2">
                <textarea rows={3} className={inputCls} placeholder="Aparece no fim da proposta" value={draft.observations} onChange={e => set('observations', e.target.value)} />
              </Field>
              <Field label="Desconto">
                <input type="number" min={0} step="0.01" className={`${inputCls} tabular-nums`} value={draft.discount} onChange={e => set('discount', Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          {/* Resumo */}
          <div className="rounded-2xl bg-slate-900 dark:bg-black/40 border border-slate-800 dark:border-white/5 p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Investimento total</p>
              {discount > 0 && <p className="text-xs text-slate-500 mt-0.5">{money(subtotal)} − {money(discount)}</p>}
            </div>
            <p className="text-3xl font-black tracking-tight text-primary tabular-nums">{money(total)}</p>
          </div>
        </div>

        {/* Prévia */}
        <div ref={previewBoxRef} className="hidden xl:block xl:col-span-7 rounded-2xl bg-slate-200/70 dark:bg-black/30 border border-slate-200 dark:border-white/5 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-6 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>Prévia · A4</span>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <div className="p-6 flex justify-center">
            <div style={{ width: A4_WIDTH * scale, height: docHeight * scale }}>
              <div className="shadow-2xl shadow-black/20 origin-top-left" style={{ transform: `scale(${scale})`, width: A4_WIDTH }}>
                {proposalDoc}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => show(null)} />

      {/* Visualização em tela cheia */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-6 md:p-10" onClick={() => setPreviewOpen(false)}>
          <div className="max-w-fit mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={generatePDF} className="h-10 px-4 text-sm font-bold text-slate-900 bg-primary rounded-xl flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">download</span> Baixar PDF</button>
              <button onClick={() => setPreviewOpen(false)} className="h-10 w-10 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="shadow-2xl">
              {/* clone visual; o PDF usa a prévia lateral */}
              <div dangerouslySetInnerHTML={{ __html: pdfRef.current?.outerHTML || '' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orcamentos;
