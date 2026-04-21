import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useClients } from '../hooks/useClients';
import { useNavigate } from 'react-router-dom';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  warranty: string;
}

const Orcamentos: React.FC = () => {
  const { clients } = useClients();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);

  // States: Left Form
  const [selectedClientId, setSelectedClientId] = useState('');
  const [contactName, setContactName] = useState('');
  const [company, setCompany] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('REAL');
  
  // Tabs for sub-forms
  const [activeTab, setActiveTab] = useState<'datas' | 'pagamento' | 'observacao'>('datas');

  // "Datas" Tab
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(30);

  // Calculated Validade Final
  const finalValidityDate = useMemo(() => {
    if (!proposalDate || !validityDays) return '';
    const d = new Date(proposalDate + 'T12:00:00Z');
    d.setDate(d.getDate() + Number(validityDays));
    return d.toISOString().split('T')[0];
  }, [proposalDate, validityDays]);

  // "Pagamento" Tab
  const [paymentTerms, setPaymentTerms] = useState('À combinar');
  
  // "Observação" Tab
  const [observations, setObservations] = useState('');

  // Items
  const [items, setItems] = useState<LineItem[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-fill when a client is selected
  const selectedClient = clients.find(c => c.id === selectedClientId);
  useEffect(() => {
    if (selectedClient) {
      setContactName(selectedClient.name || '');
      setCompany(selectedClient.company || '');
      setPhone(selectedClient.phone || '');
      setEmail(selectedClient.email || '');
    }
  }, [selectedClient]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, warranty: 'S/ Garantia' }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  };

  const formatDatePTBR = (isoString: string) => {
    if (!isoString) return 'DD/MM/AAAA';
    const [y, m, d] = isoString.split('-');
    return `${d}/${m}/${y}`;
  };

  const randomRef = useMemo(() => `2026-PROP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`, []);

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);

    try {
      const html2pdf = (window as any).html2pdf;
      const opt = {
        margin:       [0, 0, 0, 0], // Removendo a margem do framework para o banner encostar nas bordas da A4
        filename:     `Proposta_${company.replace(/\s+/g, '_') || 'Cliente'}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().from(pdfRef.current).set(opt).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um problema ao exportar o PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearForm = () => {
    setSelectedClientId('');
    setContactName('');
    setCompany('');
    setBirthday('');
    setPhone('');
    setEmail('');
    setCurrency('REAL');
    setProposalDate(new Date().toISOString().split('T')[0]);
    setValidityDays(30);
    setPaymentTerms('À combinar');
    setObservations('');
    setItems([]);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 h-[calc(100vh-6rem)] flex flex-col">
      {/* Top Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo orçamento</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monte a proposta, salve e exporte em PDF.</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar lg:pb-0">
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
          </button>
          <button className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap">
            <span className="material-symbols-outlined text-sm">save</span> Salvar
          </button>
          
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          
          <button onClick={clearForm} className="px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 whitespace-nowrap">
            <span className="material-symbols-outlined text-sm">delete_sweep</span> Limpar Formulário
          </button>
          <button 
            onClick={generatePDF} 
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-bold text-emerald-900 bg-emerald-300 hover:bg-emerald-400 rounded-lg shadow-sm flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <span className="material-symbols-outlined text-sm">{isGenerating ? 'hourglass_empty' : 'download'}</span> Baixar PDF
          </button>
          <button className="px-4 py-2 text-sm font-bold text-sky-900 bg-sky-200 hover:bg-sky-300 rounded-lg shadow-sm flex items-center gap-2 whitespace-nowrap">
            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4 object-contain" alt="Drive" /> Salvar no Google Drive
          </button>
          <button className="px-4 py-2 text-sm font-bold text-white bg-slate-400 hover:bg-slate-500 rounded-lg shadow-sm flex items-center gap-2 whitespace-nowrap">
            <span className="material-symbols-outlined text-sm">visibility</span> Visualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Form Generator */}
        <div className="xl:col-span-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 h-full">
          
          {/* Card 1: Dados da Proposta */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5 shrink-0">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
              <span className="material-symbols-outlined text-primary text-xl">description</span>
              Dados da proposta
            </div>

            <div className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Cliente</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company} ({c.name})</option>)}
                </select>
              </div>

              {/* Nome & Empresa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome do contato</label>
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Empresa</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              {/* Aniversário, Telefone, Email */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Data de aniversário</label>
                  <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Telefone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              {/* Moeda */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Moeda</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="REAL">REAL</option>
                  <option value="USD">DÓLAR</option>
                  <option value="EUR">EURO</option>
                </select>
              </div>

              {/* Sub-Tabs: Datas, Pagamento, Observação */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1 mb-4">
                  <button onClick={() => setActiveTab('datas')} className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${activeTab === 'datas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Datas</button>
                  <button onClick={() => setActiveTab('pagamento')} className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${activeTab === 'pagamento' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Pagamento</button>
                  <button onClick={() => setActiveTab('observacao')} className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${activeTab === 'observacao' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Observação</button>
                </div>

                {activeTab === 'datas' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Data da proposta</label>
                      <input type="date" value={proposalDate} onChange={e => setProposalDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Dias de validade</label>
                      <input type="number" value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Validade final</label>
                      <input type="date" value={finalValidityDate} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed outline-none" />
                    </div>
                  </div>
                )}

                {activeTab === 'pagamento' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Detalhes de Pagamento</label>
                    <textarea value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ex: 50% adiantado, 50% na aprovação"></textarea>
                  </div>
                )}

                {activeTab === 'observacao' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Observações ou Condições Extras</label>
                    <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/50" placeholder="Anotações gerais visíveis ou não..."></textarea>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Items */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <span className="material-symbols-outlined text-blue-500 text-xl">monetization_on</span>
                Itens
              </div>
              <button onClick={addItem} className="text-xs font-bold px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span> Adicionar
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum item adicionado ainda.</p>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl relative group">
                    <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição</label>
                      <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" placeholder="Nome do item/serviço..." />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qtde</label>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="col-span-8 sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unitário</label>
                      <input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="col-span-12 sm:col-span-2">
                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Garantia</label>
                       <input type="text" value={item.warranty} onChange={(e) => updateItem(item.id, 'warranty', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" placeholder="3 meses..." />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PDF PREVIEW A4 Ratio */}
        <div className="xl:col-span-7 bg-slate-300 rounded-2xl flex justify-center p-4 xl:p-8 overflow-y-auto custom-scrollbar h-full shadow-inner relative">
           
           {/* Scale the A4 preview depending on screen, using fixed aspect logic */}
           <div className="bg-white w-full max-w-[800px] min-h-[1050px] shadow-2xl shadow-black/20 flex flex-col font-sans" ref={pdfRef}>
              
              {/* === DARK HEADER BLOCK === */}
              <div className="bg-[#0B1120] text-slate-200 px-8 py-10 rounded-b-[40px] shadow-md relative overflow-hidden">
                <div className="flex justify-between items-start mb-12">
                   
                   <div className="flex items-center gap-4">
                      {/* LOGO GIGANTE Area */}
                      <div className="w-24 h-24 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg shadow-black/30">
                        <img src="/logo.png" alt="Logo Motta" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Proposta Comercial</h2>
                        <p className="text-xs text-slate-400 mt-1 font-mono">Ref: {randomRef}</p>
                      </div>
                   </div>

                   {/* Parceria Logos -> Emitting SVG paths or placeholders */}
                   <div className="flex items-center gap-4">
                     <div className="text-red-500 font-bold flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M14.86 3.197l8.618 20.612H18.25l-2.023-5.321H7.556L5.617 23.81H.522L9.14 3.197h5.72zm-7.304 15.29h8.887L11.967 7.02z"/></svg>
                        Adobe
                     </div>
                     <div className="text-white font-bold flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="#00a4ef"/></svg>
                        Microsoft
                     </div>
                   </div>
                </div>

                {/* Info Clientes (Espelhado Formulario) */}
                <div className="grid grid-cols-4 gap-6 text-[11px]">
                  {/* Left Col */}
                  <div className="col-span-1 border-l-2 border-primary/50 pl-3">
                     <p className="font-bold text-white text-sm whitespace-pre-wrap">{contactName || 'Nome do Contato'}</p>
                     <p className="text-slate-400 mt-1">{phone || '(00) 00000-0000'}</p>
                  </div>
                  
                  {/* Middle Cols */}
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 font-bold tracking-wider mb-0.5">EMPRESA</p>
                      <p className="font-medium text-slate-200 truncate">{company || 'NÃO INFORMADO'}</p>
                      <div className="mt-4">
                        <p className="text-slate-500 font-bold tracking-wider mb-0.5">TELEFONE</p>
                        <p className="font-medium text-slate-200">{phone || 'NÃO INFORMADO'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold tracking-wider mb-0.5">CONTATO</p>
                      <p className="font-medium text-slate-200 truncate">{contactName || 'NÃO INFORMADO'}</p>
                      <div className="mt-4">
                        <p className="text-slate-500 font-bold tracking-wider mb-0.5">EMAIL</p>
                        <p className="font-medium text-slate-200 truncate">{email || 'NÃO INFORMADO'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Col */}
                  <div className="col-span-1 text-right">
                     <p className="text-slate-500 font-bold tracking-wider mb-0.5">Data</p>
                     <p className="font-medium text-slate-200">{formatDatePTBR(proposalDate)}</p>
                  </div>
                </div>
              </div>

              {/* === BODY BLOCK === */}
              <div className="flex-1 px-10 py-10 flex flex-col">
                 
                 {/* Table of Items */}
                 <table className="w-full text-left border-collapse text-xs">
                   <thead>
                     <tr className="border-b-2 border-slate-200 text-slate-500">
                       <th className="py-3 font-bold uppercase w-1/2">Descrição</th>
                       <th className="py-3 font-bold text-center uppercase">Qtde</th>
                       <th className="py-3 font-bold text-right uppercase">Unitário</th>
                       <th className="py-3 font-bold text-right uppercase">Total</th>
                       <th className="py-3 font-bold text-right uppercase">Garantia</th>
                     </tr>
                   </thead>
                   <tbody>
                     {items.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="py-12 text-center text-slate-400 italic">Adicione itens para montar a proposta.</td>
                       </tr>
                     ) : (
                       items.map((item, i) => (
                         <tr key={i} className="border-b border-slate-100/50">
                           <td className="py-4 font-bold text-slate-800 break-words pr-2">{item.description || 'Item sem nome'}</td>
                           <td className="py-4 text-center font-medium text-slate-600">{item.quantity}</td>
                           <td className="py-4 text-right text-slate-600">R$ {Number(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                           <td className="py-4 text-right font-bold text-slate-800">R$ {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                           <td className="py-4 text-right text-slate-500 text-[10px]">{item.warranty}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>

                 <div className="mt-auto pt-8 flex flex-col items-end">
                   {/* Total Block */}
                   <div className="bg-slate-50 border border-slate-200 rounded-2xl w-64 p-6 text-right mb-8">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Geral</p>
                     <p className="text-3xl font-black text-blue-600 tracking-tight">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>

                   {/* Footer Info Blocks */}
                   <div className="w-full grid grid-cols-2 gap-4">
                     <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5">
                       <p className="text-[#c78822] text-xs font-bold uppercase tracking-wider mb-2">Pagamento</p>
                       <p className="text-slate-800 text-sm font-medium whitespace-pre-wrap">{paymentTerms}</p>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                       <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Validade</p>
                       <p className="text-slate-800 text-sm font-medium">{validityDays} dias</p>
                       {observations && (
                         <p className="text-slate-500 mt-2 text-xs border-t border-slate-200 pt-2 break-words">{observations}</p>
                       )}
                     </div>
                   </div>

                 </div>

              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Orcamentos;
