// Utilitários para NFS-e.
// Desde 01/11/2026 as notas (Simples Nacional) saem pelo Emissor Nacional (nfse.gov.br).
// Notas antigas, emitidas na Prefeitura de São Paulo (Nota do Milhão), continuam sendo lidas.

export const NFSE_PORTAL_URL = 'https://www.nfse.gov.br/EmissorNacional';
export const NFSE_LEGACY_PORTAL_URL = 'https://nfe.prefeitura.sp.gov.br/';

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

/** Chave de acesso da NFS-e nacional: 50 dígitos */
export const isAccessKey = (s: string) => /^\d{50}$/.test(onlyDigits(s));

/** Link público para consultar uma nota do Emissor Nacional pela chave de acesso */
export const buildNacionalUrl = (chave: string) =>
  isAccessKey(chave) ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${onlyDigits(chave)}` : '';

/** Link público para visualizar a nota: Emissor Nacional (chave) ou, nas notas antigas, Prefeitura de SP */
export const buildNfseUrl = (ccm: string, numero: string, codigo: string) => {
  if (isAccessKey(codigo)) return buildNacionalUrl(codigo);
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
    const chave = onlyDigits(u.searchParams.get('chave') || u.searchParams.get('Chave') || '');
    if (isAccessKey(chave)) {
      return { ...emptyParsed(), verificationCode: chave, nfseUrl: buildNacionalUrl(chave), source: 'link' };
    }
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

/* ---------------- XML: Emissor Nacional (layout infNFSe/DPS) ---------------- */

function parseNacionalXml(doc: Document, xmlText: string): ParsedNfse[] {
  const infs = Array.from(doc.getElementsByTagNameNS('*', 'infNFSe'));

  return infs
    .map(inf => {
      const first = (tag: string, parent: Element = inf) => parent.getElementsByTagNameNS('*', tag)[0] as Element | undefined;
      const txt = (tag: string, parent: Element = inf) => first(tag, parent)?.textContent?.trim() || '';

      const chave = onlyDigits((inf.getAttribute('Id') || '').replace(/^NFS/i, ''));
      const dps = first('infDPS');
      const prest = dps ? first('prest', dps) : undefined;
      const toma = dps ? first('toma', dps) : undefined;

      const emissao = (dps && txt('dhEmi', dps)) || txt('dhProc');
      const takerDoc = toma ? (txt('CNPJ', toma) || txt('CPF', toma)) : '';
      const valor = (dps && txt('vServ', dps)) || txt('vLiq');

      const parsed: ParsedNfse = {
        ...emptyParsed(),
        invoiceNumber: txt('nNFSe'),
        verificationCode: chave,
        providerCcm: prest ? txt('IM', prest) : '',
        issuedAt: emissao,
        issueDate: emissao ? emissao.slice(0, 10) : emptyParsed().issueDate,
        amount: brNumber(valor),
        issAmount: brNumber(txt('vISSQN')),
        takerName: toma ? txt('xNome', toma) : '',
        takerDoc,
        takerEmail: toma ? txt('email', toma).toLowerCase() : '',
        description: dps ? txt('xDescServ', dps) : '',
        cancelled: false, // cancelamento no padrão nacional é um evento à parte, não vem neste XML
        nfseUrl: buildNacionalUrl(chave),
        // Arquivo único: guarda o XML original (a assinatura digital não pode ser alterada)
        xmlContent: infs.length === 1
          ? xmlText
          : `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(inf.parentElement || inf)}`,
        source: 'xml',
      };
      return parsed;
    })
    .filter(p => p.invoiceNumber);
}

/* ---------------- XML (Emissor Nacional ou layout antigo da Prefeitura de SP) ---------------- */

export function parseNfseXml(xmlText: string): ParsedNfse[] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML inválido');

  if (doc.getElementsByTagNameNS('*', 'infNFSe').length) return parseNacionalXml(doc, xmlText);

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

/** gapMark: separa colunas distantes com TAB (usado no DANFSe nacional, que vem em linhas de colunas) */
async function pdfToText(file: File, gapMark = false): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');
  const worker: any = await import('pdfjs-dist/legacy/build/pdf.worker.min.js?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let lastEnd = 0;
    let line = '';
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4] as number;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim());
        line = '';
      }
      const bigGap = gapMark && line !== '' && x - lastEnd > 12;
      line += (line && !line.endsWith(' ') ? (bigGap ? '\t' : ' ') : '') + item.str;
      lastY = y;
      lastEnd = x + (item.width || 0);
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join('\n');
}

/**
 * Lê o texto do DANFSe (PDF do Emissor Nacional). O texto sai campo a campo: uma linha com o
 * RÓTULO e, logo depois, o VALOR. Por isso cada dado é buscado "na linha seguinte ao rótulo",
 * dentro da seção certa (prestador, tomador...). Se o PDF vier em linhas de colunas, há um plano B.
 */
export function parseNacionalText(text: string): ParsedNfse {
  const t = text.replace(/\r/g, '');
  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  const idxLine = (re: RegExp, from = 0) => lines.findIndex((l, i) => i >= from && re.test(l));
  const section = (startRe: RegExp, endRe?: RegExp) => {
    const a = idxLine(startRe);
    if (a < 0) return [] as string[];
    const b = endRe ? idxLine(endRe, a + 1) : -1;
    return lines.slice(a, b > a ? b : undefined);
  };
  /** valor na linha seguinte ao rótulo (só a primeira coluna, se vier mais de uma) */
  const valueAfter = (labelRe: RegExp, sec: string[] = lines) => {
    const i = sec.findIndex(l => labelRe.test(l));
    return i >= 0 ? (sec[i + 1] || '').split('\t')[0].trim() : '';
  };
  const dash = (v: string) => (/^[-–—\s]*$/.test(v) ? '' : v);

  const RE_CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
  const RE_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
  const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const RE_LABEL = /^(N[ÚU]MERO|COMPET|DATA E HORA|S[ÉE]RIE|EMITENTE|SITUA|FINALIDADE|Nome \/|Munic|C[óo]digo|Endere|E-mail|Telefone|Indicador|CNPJ)/i;

  const chave = t.match(/\b(\d{50})\b/)?.[1] || '';

  // ---- número, competência e emissão ----
  let numero = onlyDigits(valueAfter(/^N[ÚU]MERO DA NFS-?e/i));
  const emissaoTxt = valueAfter(/^DATA E HORA DA EMISS[ÃA]O DA NFS-?e/i);
  const competenciaTxt = valueAfter(/^COMPET[ÊE]NCIA DA NFS-?e/i);
  let mEmissao = emissaoTxt.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)/);
  let dataBR = mEmissao?.[1] || emissaoTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || competenciaTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || '';

  // plano B: valores em uma só linha "1  04/11/2026  04/11/2026 10:48:10"
  if (!numero || !dataBR) {
    const iNum = idxLine(/^N[ÚU]MERO DA NFS-?e/i);
    const row = iNum >= 0 ? lines[iNum + 1] || '' : '';
    const m = row.match(/^(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (m) { numero = numero || m[1]; dataBR = dataBR || m[3]; mEmissao = mEmissao || [m[0], m[3], m[4]] as any; }
  }
  const issueDate = brDateToISO(dataBR);
  const hora = mEmissao?.[2] || '';
  const issuedAt = issueDate && hora ? `${issueDate}T${hora.length === 5 ? hora + ':00' : hora}` : '';

  // ---- prestador e tomador ----
  const prest = section(/^PRESTADOR/i, /^TOMADOR/i);
  const toma = section(/^TOMADOR/i, /^(DESTINAT|INTERMEDI|SERVI[ÇC]O PRESTADO)/i);

  const im = valueAfter(/^Indicador Municipal/i, prest).match(/\d{6,}/)?.[0] || '';

  const nameRaw = dash(valueAfter(/^Nome \/ Nome Empresarial/i, toma));
  const takerName = nameRaw && !RE_LABEL.test(nameRaw) ? nameRaw : '';
  const tomaTxt = toma.join('\n');
  const takerDoc = tomaTxt.match(RE_CNPJ)?.[0] || tomaTxt.match(RE_CPF)?.[0] || '';
  const takerEmail = (valueAfter(/^E-mail/i, toma).match(RE_EMAIL)?.[0] || '').toLowerCase();

  // ---- descrição: do rótulo até a tributação municipal ----
  const iDesc = idxLine(/^Descri[çc][ãa]o do Servi[çc]o/i);
  const iEnd = iDesc >= 0 ? idxLine(/^TRIBUTA[ÇC][ÃA]O MUNICIPAL/i, iDesc + 1) : -1;
  const description = iDesc >= 0 ? lines.slice(iDesc + 1, iEnd > iDesc ? iEnd : iDesc + 3).join('\n') : '';

  // ---- valor ----
  const iVal = idxLine(/VALOR DA OPERA[ÇC][ÃA]O/i);
  const amount = iVal >= 0 ? brNumber(lines.slice(iVal, iVal + 3).join(' ').match(/R\$\s*([\d.]+,\d{2})/)?.[1] || '') : 0;

  const cancelled = /cancelad/i.test(valueAfter(/^SITUA[ÇC][ÃA]O DA NFS-?e/i));

  return {
    ...emptyParsed(),
    invoiceNumber: numero,
    verificationCode: chave,
    providerCcm: im,
    issueDate: issueDate || emptyParsed().issueDate,
    issuedAt,
    amount,
    takerName,
    takerDoc,
    takerEmail,
    description,
    cancelled,
    nfseUrl: buildNacionalUrl(chave),
    source: 'pdf',
  };
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
  // DANFSe do Emissor Nacional (chave de acesso de 50 dígitos)
  if (/DANFSe|CHAVE DE ACESSO DA NFS-?e/i.test(text) || /\b\d{50}\b/.test(text)) return parseNacionalText(text);
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
  let text = await pdfToText(file);
  // DANFSe nacional: relê separando as colunas
  if (/DANFSe|CHAVE DE ACESSO DA NFS-?e/i.test(text) || /\b\d{50}\b/.test(text)) text = await pdfToText(file, true);
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
