// Utilitários para NFS-e da Prefeitura de São Paulo (Nota do Milhão)

export const NFSE_PORTAL_URL = 'https://nfe.prefeitura.sp.gov.br/';

export interface ParsedNfse {
  invoiceNumber: string;
  verificationCode: string;
  issueDate: string;      // yyyy-mm-dd
  issuedAt: string;       // ISO completo, se disponível
  amount: number;
  issAmount: number;
  takerName: string;
  takerDoc: string;
  takerEmail: string;
  providerCcm: string;
  description: string;
  cancelled: boolean;
  nfseUrl: string;
  xmlContent?: string;    // XML só desta nota
  pdfFile?: File;
  source: 'xml' | 'pdf' | 'link' | 'manual';
}

export const emptyParsed = (): ParsedNfse => ({
  invoiceNumber: '',
  verificationCode: '',
  issueDate: new Date().toISOString().split('T')[0],
  issuedAt: '',
  amount: 0,
  issAmount: 0,
  takerName: '',
  takerDoc: '',
  takerEmail: '',
  providerCcm: '',
  description: '',
  cancelled: false,
  nfseUrl: '',
  source: 'manual',
});

export const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

export const formatDoc = (doc: string) => {
  const d = onlyDigits(doc);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return doc;
};

/** Link público para visualizar/imprimir a nota no site da Prefeitura */
export const buildNfseUrl = (ccm: string, numero: string, codigo: string) => {
  const c = onlyDigits(ccm);
  const n = onlyDigits(numero).replace(/^0+/, '');
  const v = (codigo || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!c || !n || !v) return '';
  return `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?ccm=${c}&nf=${n}&cod=${v}`;
};

/** Lê ccm / nf / cod de um link de nota (do e-mail da Prefeitura ou da barra do navegador) */
export function parseNfseLink(url: string): ParsedNfse | null {
  try {
    const u = new URL(url.trim());
    const q = (k: string) => u.searchParams.get(k) || u.searchParams.get(k.toUpperCase()) || '';
    const ccm = q('ccm') || q('inscricao');
    const nf = q('nf') || q('numero');
    const cod = q('cod') || q('codigo') || q('verificacao');
    if (!nf) return null;
    return {
      ...emptyParsed(),
      invoiceNumber: nf,
      verificationCode: cod.toUpperCase(),
      providerCcm: ccm,
      nfseUrl: buildNfseUrl(ccm, nf, cod) || url.trim(),
      source: 'link',
    };
  } catch {
    return null;
  }
}

const brNumber = (s: string) => {
  if (!s) return 0;
  const clean = s.trim();
  // "1.234,56" (BR) ou "1234.56" (XML)
  if (clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(clean) || 0;
};

const brDateToISO = (s: string) => {
  const m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

/* ---------------- XML (exportação do portal / layout SP) ---------------- */

export function parseNfseXml(xmlText: string): ParsedNfse[] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML inválido');

  const nodes = Array.from(doc.getElementsByTagNameNS('*', 'NFe'));
  const list = nodes.length ? nodes : [doc.documentElement];

  return list
    .map(node => {
      const get = (tag: string, parent: Element = node) => parent.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() || '';
      const tomadorDocEl = node.getElementsByTagNameNS('*', 'CPFCNPJTomador')[0];
      const takerDoc = tomadorDocEl ? (get('CNPJ', tomadorDocEl) || get('CPF', tomadorDocEl)) : '';
      const numero = get('NumeroNFe');
      const codigo = get('CodigoVerificacao');
      const ccm = get('InscricaoPrestador');
      const emissao = get('DataEmissaoNFe') || get('DataEmissao');
      const status = get('StatusNFe');

      const parsed: ParsedNfse = {
        ...emptyParsed(),
        invoiceNumber: numero,
        verificationCode: codigo,
        providerCcm: ccm,
        issuedAt: emissao,
        issueDate: emissao ? emissao.slice(0, 10) : emptyParsed().issueDate,
        amount: brNumber(get('ValorServicos')),
        issAmount: brNumber(get('ValorISS')),
        takerName: get('RazaoSocialTomador'),
        takerDoc,
        takerEmail: get('EmailTomador'),
        description: get('Discriminacao').replace(/\|/g, '\n'),
        cancelled: status === 'C',
        nfseUrl: buildNfseUrl(ccm, numero, codigo),
        xmlContent: `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(node)}`,
        source: 'xml',
      };
      return parsed;
    })
    .filter(p => p.invoiceNumber);
}

/* ---------------- PDF (impressão da NFS-e) ---------------- */

async function pdfToText(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');
  const worker: any = await import('pdfjs-dist/legacy/build/pdf.worker.min.js?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = '';
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim());
        line = '';
      }
      line += (line && !line.endsWith(' ') ? ' ' : '') + item.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join('\n');
}

/**
 * Lê o texto de uma NFS-e (PDF da Prefeitura de SP).
 *
 * O PDF da Prefeitura costuma sair em COLUNAS: primeiro todos os rótulos
 * ("Nome/Razão Social:", "CPF/CNPJ:"...) e só depois os valores, em outra linha.
 * Por isso cada campo tenta, nesta ordem:
 *   1) "Rótulo: valor" na mesma linha;
 *   2) o valor solto dentro da seção certa (cabeçalho, prestador, tomador), por formato.
 */
export function parseNfseText(text: string): ParsedNfse {
  const t = text.replace(/\r/g, '');
  const idx = (re: RegExp, from = 0) => {
    const m = t.slice(from).match(re);
    return m && m.index !== undefined ? m.index + from : -1;
  };
  const slice = (a: number, b: number) => (a < 0 ? '' : t.slice(a, b > a ? b : undefined));

  const iPrest = idx(/PRESTADOR DE SERVI[ÇC]OS/i);
  const iTomador = idx(/TOMADOR DE SERVI[ÇC]OS/i);
  const iInterm = idx(/INTERMEDI[ÁA]RIO DE SERVI[ÇC]OS/i);
  const iDisc = idx(/DISCRIMINA[ÇC][ÃA]O D[EO]S? SERVI[ÇC]OS/i);

  const header = iPrest >= 0 ? t.slice(0, iPrest) : t.slice(0, 800);
  const prestador = slice(iPrest, iTomador);
  const tomador = slice(iTomador, iInterm > iTomador ? iInterm : iDisc);

  // linha só com rótulos: "CPF/CNPJ:  Inscrição Municipal:"
  const isLabelLine = (l: string) => /^(?:[^:]{1,40}:\s*)+$/.test(l.trim());
  const clean = (v: string) => (/^[-–—\s*]*$/.test(v) ? '' : v.trim());

  const RE_CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
  const RE_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
  const RE_CCM = /\b\d\.\d{3}\.\d{3}-\d\b/;
  const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

  // ---- cabeçalho: número, data/hora, código de verificação ----
  const numero =
    header.match(/N[úu]mero da Nota\s*:?[ \t]*(\d+)/i)?.[1] ||
    header.match(/\b(\d{8})\b/)?.[1] ||
    '';
  const dataHora = header.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)?/);
  const codigo = (
    header.match(/C[óo]digo de Verifica[çc][ãa]o\s*:?[ \t]*([A-Z0-9]{4}-[A-Z0-9]{4})/i)?.[1] ||
    header.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/)?.[1] ||
    header.match(/\b((?=[A-Z0-9]*[A-Z])[A-Z0-9]{8})\b/)?.[1] ||
    ''
  ).toUpperCase();

  // ---- prestador ----
  const ccm =
    prestador.match(/Inscri[çc][ãa]o Municipal\s*:[ \t]*([\d.\-/]+)/i)?.[1] ||
    prestador.match(RE_CCM)?.[0] ||
    '';

  // ---- tomador ----
  const takerValues = tomador
    .split('\n')
    .map(l => l.trim())
    .slice(1) // título da seção
    .filter(l => l && !isLabelLine(l));

  const takerNameSameLine = clean(tomador.match(/Nome\/Raz[ãa]o Social\s*:[ \t]*(\S[^\n]*)/i)?.[1] || '');
  const takerNameColumn = takerValues.find(l => !RE_CNPJ.test(l) && !RE_CPF.test(l) && !RE_EMAIL.test(l)) || '';
  const takerName = takerNameSameLine || clean(takerNameColumn);

  const takerDoc = tomador.match(RE_CNPJ)?.[0] || tomador.match(RE_CPF)?.[0] || '';
  const takerEmail = tomador.match(RE_EMAIL)?.[0]?.toLowerCase() || '';

  // ---- discriminação ----
  let description = '';
  if (iDisc >= 0) {
    const after = t.slice(iDisc).replace(/^.*\n/, '');
    const end = after.search(/VALOR TOTAL D[OA]/i);
    description = (end >= 0 ? after.slice(0, end) : after.slice(0, 800)).trim();
  }

  const issueDate = dataHora ? brDateToISO(dataHora[1]) : '';
  return {
    ...emptyParsed(),
    invoiceNumber: numero,
    verificationCode: codigo,
    providerCcm: ccm,
    issueDate: issueDate || emptyParsed().issueDate,
    issuedAt: issueDate && dataHora?.[2] ? `${issueDate}T${dataHora[2].length === 5 ? dataHora[2] + ':00' : dataHora[2]}` : '',
    amount: brNumber(t.match(/VALOR TOTAL D[OA] (?:SERVI[ÇC]O|NOTA)\s*=?\s*R\$\s*([\d.,]+)/i)?.[1] || ''),
    takerName,
    takerDoc,
    takerEmail,
    description,
    cancelled: /NOTA\s+CANCELADA|CANCELADA/i.test(t.slice(0, 600)),
    nfseUrl: buildNfseUrl(ccm, numero, codigo),
    source: 'pdf',
  };
}

export async function parseNfsePdf(file: File): Promise<ParsedNfse> {
  const text = await pdfToText(file);
  return { ...parseNfseText(text), pdfFile: file };
}

/* ---------------- Arquivos ---------------- */

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "NF 000123 - Empresa XYZ" — seguro para nome de arquivo e chave do Storage */
export const nfseBaseName = (n: Pick<ParsedNfse, 'invoiceNumber' | 'takerName'>) => {
  const digits = onlyDigits(n.invoiceNumber).replace(/^0+/, '');
  const num = digits ? digits.padStart(6, '0') : 'SEM-NUMERO';
  const taker = stripAccents(n.takerName || 'Tomador')
    .replace(/[^A-Za-z0-9 .&_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return `NF ${num} - ${taker}`;
};

export const nfseFolder = (issueDate: string) => {
  const [y, m] = (issueDate || new Date().toISOString()).split('-');
  return `${y}/${m}`;
};

/** Abre um link fora do app (navegador padrão), funcionando também dentro do app desktop (Tauri) */
export async function openExternal(url: string) {
  const w = window as any;
  try {
    if (w.__TAURI__?.shell?.open) return await w.__TAURI__.shell.open(url);
    if (w.__TAURI__?.opener?.openUrl) return await w.__TAURI__.opener.openUrl(url);
  } catch { /* cai para window.open */ }
  window.open(url, '_blank', 'noopener,noreferrer');
}
