import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DriveKey, chooseDriveFolder, driveSupported, getDriveFolder } from '../lib/driveFolder';

/* ---------------- Toast ---------------- */

export type ToastMsg = { type: 'ok' | 'error' | 'info'; text: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastMsg>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.type === 'error' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: setToast };
}

export const Toast: React.FC<{ toast: ToastMsg; onClose: () => void }> = ({ toast, onClose }) =>
  toast ? (
    <div className="fixed bottom-6 right-6 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl text-sm font-medium max-w-md ${
        toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'ok' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-sky-600 text-white'}`}>
        <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : toast.type === 'ok' ? 'check_circle' : 'info'}</span>
        <span className="flex-1">{toast.text}</span>
        <button onClick={onClose} className="opacity-70 hover:opacity-100"><span className="material-symbols-outlined text-[18px]">close</span></button>
      </div>
    </div>
  ) : null;

/* ---------------- Ícone do Google Drive ---------------- */

const DriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-4 h-4" aria-hidden>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

/* ---------------- Barra de ações ---------------- */

export interface ToolbarProps {
  title: string;
  subtitle?: React.ReactNode;
  driveKey: DriveKey;
  onSave?: () => void;
  onClear?: () => void;
  onPdf?: () => void;
  onDrive?: () => void;
  onPreview?: () => void;
  saveLabel?: string;
  clearLabel?: string;
  pdfLabel?: string;
  busy?: 'save' | 'pdf' | 'drive' | null;
  extra?: React.ReactNode; // ex.: seletor de orçamentos salvos
}

const base = 'h-10 px-4 text-sm font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors disabled:opacity-50';
const Spin = () => <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>;

export const ActionToolbar: React.FC<ToolbarProps> = ({
  title, subtitle, driveKey, onSave, onClear, onPdf, onDrive, onPreview,
  saveLabel = 'Salvar', clearLabel = 'Limpar Formulário', pdfLabel = 'Baixar PDF', busy, extra,
}) => {
  const navigate = useNavigate();
  const [folderName, setFolderName] = useState<string>('');

  const refreshFolder = useCallback(async () => {
    const h = await getDriveFolder(driveKey);
    setFolderName(h?.name || '');
  }, [driveKey]);

  useEffect(() => { refreshFolder(); }, [refreshFolder]);

  const changeFolder = async () => {
    const h = await chooseDriveFolder(driveKey);
    if (h) setFolderName(h.name);
  };

  const handleDrive = async () => {
    await onDrive?.();
    refreshFolder();
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">{title}</h1>
        {subtitle && <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {extra}
        <button onClick={() => navigate(-1)} className={`${base} text-slate-700 dark:text-slate-200 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5`}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Voltar
        </button>
        {onSave && (
          <button onClick={onSave} disabled={busy === 'save'} className={`${base} text-slate-700 dark:text-slate-200 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5`}>
            {busy === 'save' ? <Spin /> : <span className="material-symbols-outlined text-[18px]">save</span>} {saveLabel}
          </button>
        )}

        <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

        {onClear && (
          <button onClick={onClear} className={`${base} text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10`}>
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span> {clearLabel}
          </button>
        )}
        {onPdf && (
          <button onClick={onPdf} disabled={busy === 'pdf'} className={`${base} text-emerald-900 bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-400/90 dark:hover:bg-emerald-400`}>
            {busy === 'pdf' ? <Spin /> : <span className="material-symbols-outlined text-[18px]">download</span>} {pdfLabel}
          </button>
        )}
        {onDrive && (
          <div className="flex items-stretch">
            <button
              onClick={handleDrive}
              disabled={busy === 'drive'}
              title={folderName ? `Salva em: ${folderName}` : driveSupported() ? 'Escolha uma vez a pasta do Google Drive no seu Mac' : 'Seu navegador não permite gravar em pastas; o arquivo será baixado'}
              className={`${base} text-sky-900 bg-sky-100 hover:bg-sky-200 dark:bg-sky-300/90 dark:hover:bg-sky-300 ${folderName ? 'rounded-r-none' : ''}`}
            >
              {busy === 'drive' ? <Spin /> : <DriveIcon />} Salvar no Google Drive
            </button>
            {folderName && (
              <button onClick={changeFolder} title={`Pasta atual: ${folderName} — clique para trocar`} className="h-10 px-2 rounded-r-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-300/90 dark:hover:bg-sky-300 text-sky-900 border-l border-sky-200 dark:border-sky-400">
                <span className="material-symbols-outlined text-[18px]">folder_managed</span>
              </button>
            )}
          </div>
        )}
        {onPreview && (
          <button onClick={onPreview} className={`${base} text-white bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500`}>
            <span className="material-symbols-outlined text-[18px]">visibility</span> Visualizar
          </button>
        )}
      </div>
    </div>
  );
};
