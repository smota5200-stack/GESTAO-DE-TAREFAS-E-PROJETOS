import React, { useState, useRef } from 'react';
import { useClients } from '../hooks/useClients';
import { useNavigate } from 'react-router-dom';

interface LineItem {
  id: string;
  title: string;
  description: string;
  amount: number;
}

const Orcamentos: React.FC = () => {
  const { clients } = useClients();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ id: '1', title: '', description: '', amount: 0 }]);
  const [paymentTerms, setPaymentTerms] = useState<string>('50% no início e 50% na aprovação final via PIX.');
  const [validityDays, setValidityDays] = useState<number>(15);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), title: '', description: '', amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);

    try {
      // Usando html2pdf importado globalmente no index.html
      const html2pdf = (window as any).html2pdf;
      
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Orcamento_${selectedClient?.company.replace(/\s+/g, '_') || 'Cliente'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(pdfRef.current).set(opt).save();

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um problema ao exportar o PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Gerador de Orçamentos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Crie propostas premium, exporte em PDF e feche mais projetos.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generatePDF} 
            disabled={isGenerating || !selectedClient}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">{isGenerating ? 'hourglass_empty' : 'download'}</span>
            {isGenerating ? 'Gerando PDF...' : 'Baixar Orçamento (PDF)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Painel de Configuração do Orçamento */}
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings_suggest</span>
            Configuração da Proposta
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cliente *</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company} ({c.name})</option>
                ))}
              </select>
              {!selectedClientId && (
                <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span> Selecione um cliente para habilitar o PDF.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Itens do Projeto</label>
                <button onClick={addItem} className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">add_circle</span> Adicionar Item
                </button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl relative group">
                  <button 
                    onClick={() => removeItem(item.id)} 
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Nome do Serviço"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                          className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="R$ Valor"
                          value={item.amount || ''}
                          onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                      </div>
                    </div>
                    <textarea
                      placeholder="Descrição detalhada do que está incluso..."
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none resize-none min-h-[60px]"
                    ></textarea>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Condições de Pagamento / Observações</label>
              <textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]"
                placeholder="Detalhes para PIX, Transferência, Prazos..."
              ></textarea>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Validade da Proposta (Dias)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value) || 15)}
                className="w-32 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Visualização da Proposta a ser impressa (Fundo claro para PDF) */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 overflow-hidden sticky top-24 border border-slate-200">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Preview do PDF</span>
            <span className="material-symbols-outlined text-sm">visibility</span>
          </div>
          
          <div className="p-8 h-[600px] overflow-y-auto custom-scrollbar">
            {/* O Elemento que será exportado para PDF */}
            <div ref={pdfRef} className="bg-white text-slate-900 font-sans p-6 w-full mx-auto" style={{ minHeight: 'A4' }}>
              
              {/* Header do Orçamento */}
              <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
                <div className="w-40 h-16">
                  {/* Utilizando a mesma logo que inserimos globalmente */}
                  <img src="/logo.png" alt="Sua Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">PROPOSTA COMERCIAL</h1>
                  <p className="text-slate-500 mt-1">Nº {Math.floor(Math.random() * 10000).toString().padStart(4, '0')} • {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="mb-10 p-6 bg-slate-50 rounded-xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Preparado Para</h3>
                <p className="font-bold text-lg text-slate-800">{selectedClient ? selectedClient.company : 'Empresa do Cliente'}</p>
                <p className="text-slate-600">{selectedClient ? selectedClient.name : 'A/C: Nome do Contato'}</p>
                {selectedClient?.cpfCnpj && <p className="text-slate-600 text-sm mt-1">CNPJ/CPF: {selectedClient.cpfCnpj}</p>}
                {selectedClient?.email && <p className="text-slate-600 text-sm">{selectedClient.email}</p>}
              </div>

              {/* Itens do Escopo */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Escopo do Projeto</h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-800 text-sm">
                      <th className="py-3 font-bold">Serviço / Descrição</th>
                      <th className="py-3 text-right font-bold w-32">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-4 pr-4">
                          <p className="font-bold text-slate-800 mb-1">{item.title || `Item ${index + 1}`}</p>
                          <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{item.description || 'Descrição do que será entregue neste item.'}</p>
                        </td>
                        <td className="py-4 text-right font-medium text-slate-800 align-top">
                          {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTAIS */}
              <div className="flex justify-end mb-12">
                <div className="w-64 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500 text-sm">Investimento Total</span>
                    <span className="text-2xl font-black text-slate-900">
                      R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Finalizações */}
              <div className="grid grid-cols-2 gap-8 text-sm text-slate-600 border-t border-slate-200 pt-8 mt-auto">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Condições de Pagamento</h4>
                  <p className="whitespace-pre-line leading-relaxed">{paymentTerms}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Validade</h4>
                  <p>Esta proposta comercial e seus valores são válidos por <strong>{validityDays} dias</strong> a partir da data de emissão.</p>
                </div>
              </div>

              <div className="mt-16 text-center text-xs text-slate-400">
                <p>Obrigado pela oportunidade. Se houver alguma dúvida, estamos à disposição.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Orcamentos;
