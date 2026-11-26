// Salvar arquivos direto numa pasta do Google Drive (via Google Drive para desktop).
// Usa a File System Access API do Chrome: você escolhe a pasta uma vez e o app lembra dela.
// Sem suporte (Safari/Firefox), o arquivo é baixado normalmente.

export type DriveKey = 'orcamentos' | 'notas';

const DB_NAME = 'studio-mota-drive';
const STORE = 'handles';

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    };
  });
}

export const driveSupported = () => typeof (window as any).showDirectoryPicker === 'function';

export async function getDriveFolder(key: DriveKey): Promise<any | null> {
  try { return (await idb<any>('readonly', s => s.get(key))) || null; } catch { return null; }
}

export async function chooseDriveFolder(key: DriveKey): Promise<any | null> {
  if (!driveSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ id: `sm-${key}`, mode: 'readwrite', startIn: 'documents' });
    await idb('readwrite', s => s.put(handle, key));
    return handle;
  } catch {
    return null; // usuário cancelou
  }
}

async function ensurePermission(handle: any) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  return (await handle.requestPermission?.(opts)) === 'granted';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface DriveFile { subfolders: string[]; name: string; blob: Blob }

/**
 * Grava arquivos na pasta escolhida (criando subpastas, ex.: ["2026","10"]).
 * Retorna onde gravou, ou 'download' se caiu no download comum.
 */
export async function saveToDrive(key: DriveKey, files: DriveFile[], opts: { skipExisting?: boolean } = {}) {
  let root = await getDriveFolder(key);
  if (!root) root = await chooseDriveFolder(key);
  if (!root) {
    if (!driveSupported()) {
      files.forEach(f => downloadBlob(f.blob, f.name));
      return { mode: 'download' as const, folder: '', written: files.length, skipped: 0 };
    }
    return { mode: 'cancelled' as const, folder: '', written: 0, skipped: 0 };
  }
  if (!(await ensurePermission(root))) throw new Error('Sem permissão para gravar na pasta escolhida.');

  let written = 0;
  let skipped = 0;
  for (const f of files) {
    let dir = root;
    for (const sub of f.subfolders) dir = await dir.getDirectoryHandle(sub, { create: true });
    if (opts.skipExisting) {
      try { await dir.getFileHandle(f.name); skipped++; continue; } catch { /* não existe */ }
    }
    const fh = await dir.getFileHandle(f.name, { create: true });
    const w = await fh.createWritable();
    await w.write(f.blob);
    await w.close();
    written++;
  }
  return { mode: 'drive' as const, folder: root.name as string, written, skipped };
}


/** html2canvas não entende cores modernas (oklch/oklab/color-mix) usadas pelo Tailwind: converte para rgb no clone. */
const MODERN = /(oklch|oklab|lab\(|lch\(|color-mix|color\()/i;
export function html2canvasFixColors(_doc: Document, root: HTMLElement) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const toRgb = (c: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  };
  const props = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'fill', 'stroke', 'caret-color'];
  const view = root.ownerDocument.defaultView || window;
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  for (const el of all) {
    const cs = view.getComputedStyle(el);
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (v && MODERN.test(v)) el.style.setProperty(p, toRgb(v), 'important');
    }
    for (const p of ['box-shadow', 'text-shadow', 'background-image', 'filter', 'backdrop-filter']) {
      const v = cs.getPropertyValue(p);
      if (v && MODERN.test(v)) el.style.setProperty(p, 'none', 'important');
    }
  }
}

export const PDF_H2C = {
  scale: 2,
  useCORS: true,
  logging: false,
  onclone: (doc: Document) => { if (doc.body) html2canvasFixColors(doc, doc.body); },
};

/** Gera o PDF de um elemento (usa o html2pdf já carregado no index.html) */
export async function elementToPdf(el: HTMLElement, filename: string, size: [number, number] = [794, 1123]): Promise<Blob> {
  const html2pdf = (window as any).html2pdf;
  return html2pdf()
    .from(el)
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: PDF_H2C,
      jsPDF: { unit: 'px', format: size, orientation: 'portrait', hotfixes: ['px_scaling'] },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
    })
    .outputPdf('blob');
}
