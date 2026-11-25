import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** Orçamento interativo (3D) da Foggiatto Engenharia Brasil, aberto dentro do app. */
const OrcamentoFoggiatto: React.FC<{ versao?: 'atual' | 'v1' }> = ({ versao = 'atual' }) => {
  const navigate = useNavigate();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (versao === 'v1' ? import('../data/orcamento_foggiatto_v1.html?raw') : import('../data/orcamento_foggiatto_dtf.html?raw')).then(m => alive && setHtml(m.default));
    return () => { alive = false; };
  }, [versao]);

  const openNewTab = () => {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-lg hover:border-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar
        </button>
        <h1 className="text-sm font-bold text-slate-900 dark:text-white">Orçamento Foggiatto · 3D interativo{versao === 'v1' ? ' (versão anterior)' : ''}</h1>
        <button onClick={openNewTab} disabled={!html} className="h-9 px-3 text-xs font-bold text-slate-900 bg-primary rounded-lg flex items-center gap-1 disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">open_in_new</span> Abrir em nova aba
        </button>
      </div>
      {html ? (
        <iframe title="Orçamento Foggiatto" srcDoc={html} className="flex-1 min-h-[80vh] w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white" />
      ) : (
        <p className="text-sm text-slate-500">Carregando orçamento…</p>
      )}
    </div>
  );
};

export default OrcamentoFoggiatto;
