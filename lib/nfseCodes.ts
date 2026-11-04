// Códigos para emitir NFS-e no Emissor Nacional (a partir de 01/11/2026).
// Fonte: orientação da contabilidade ("Vinculação Códigos" + passo a passo do Emissor Nacional).

export interface NfseServiceCode {
  id: 'artefinal' | 'representacao';
  label: string;
  /** Código de serviço que a nota usava na Prefeitura de SP */
  legacyCode: string;
  legacyLabel: string;
  /** Código de Tributação Nacional */
  ctn: string;
  ctnLabel: string;
  /** Código Complementar Municipal (escolhido na tela, a partir do CTN) */
  cnm?: string;
  /** Item da NBS */
  nbs: string;
  nbsLabel: string;
  /** Texto sugerido para o campo "Descrição do Serviço/Fornecimento" */
  defaultDescription: string;
}

export const NFSE_SERVICE_CODES: NfseServiceCode[] = [
  {
    id: 'artefinal',
    label: 'Artefinal / composição gráfica',
    legacyCode: '06912',
    legacyLabel: 'Artes gráficas, tipografia, diagramação, paginação e gravação',
    ctn: '13.05.01',
    ctnLabel: 'Composição gráfica, inclusive confecção de impressos gráficos, fotocomposição, clicheria, zincografia, litografia e fotolitografia',
    cnm: '13.05.01.002',
    nbs: '1.2101.10.00',
    nbsLabel: 'Serviços de editoração',
    defaultDescription: 'Serviços de Artefinal',
  },
  {
    id: 'representacao',
    label: 'Representação / revenda',
    legacyCode: '06009',
    legacyLabel: 'Representação de qualquer natureza, inclusive comercial',
    ctn: '10.09.01',
    ctnLabel: 'Representação de qualquer natureza, inclusive comercial',
    nbs: '1.0201.00.00',
    nbsLabel: 'Serviços de intermediação na distribuição de mercadorias',
    defaultDescription: 'Serviços Prestados',
  },
];

/** Passo a passo no Emissor Nacional (resumo do roteiro da contabilidade) */
export const NFSE_STEPS = [
  { title: 'Acesse o Emissor Nacional', text: 'Entre com usuário e senha, certificado digital ou gov.br. Pelo gov.br, vá em Meu perfil → Procuração/Representação, informe o CNPJ da empresa e clique em "Representar".' },
  { title: 'Emissão Completa', text: 'No perfil da empresa, abra Emissão Completa. A data de competência é a própria data de emissão.' },
  { title: 'Pessoas e Serviço', text: 'Informe o CNPJ do cliente e clique na lupa. Depois escolha o município, o Código de Tributação Nacional, o Complementar Municipal e o item da NBS (copie abaixo).' },
  { title: 'Valores e Emitir', text: 'Informe o valor, mantenha "Informar alíquota do Simples Nacional", revise e clique em Emitir NFS-e.' },
  { title: 'Baixe XML + PDF e importe aqui', text: 'Salve os dois arquivos e solte no app. Ele lê os dados, renomeia como "NF 000123 - Cliente" e guarda na pasta do mês.' },
];

/** Texto do e-mail ao cliente com a nota (o documento recomenda enviar XML e PDF juntos) */
export function buildInvoiceEmail(opts: { number: string; takerName: string; issueDate: string; amount: string; senderName?: string }) {
  const [y, m, d] = (opts.issueDate || '').slice(0, 10).split('-');
  const dateBr = d && m && y ? `${d}/${m}/${y}` : '';
  const subject = `NFS-e nº ${opts.number} — ${opts.takerName || 'Serviços prestados'}`;
  const body = [
    `Olá${opts.takerName ? `, ${opts.takerName}` : ''}!`,
    '',
    `Segue a NFS-e nº ${opts.number}${dateBr ? `, emitida em ${dateBr}` : ''}, no valor de ${opts.amount}.`,
    'Estou anexando o PDF e o XML da nota, para facilitar a importação no seu sistema.',
    '',
    'Qualquer dúvida, é só me avisar.',
    '',
    'Obrigado!',
    opts.senderName || '',
  ].join('\n');
  return { subject, body };
}
