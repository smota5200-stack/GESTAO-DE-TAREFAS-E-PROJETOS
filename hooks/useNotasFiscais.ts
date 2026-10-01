import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ServiceInvoice } from '../types';
import { ParsedNfse, nfseBaseName, nfseFolder } from '../lib/nfse';

export const NF_BUCKET = 'notas-fiscais';

export const mapInvoiceRow = (row: any): ServiceInvoice => ({
  id: row.id,
  clientId: row.client_id || '',
  invoiceNumber: row.invoice_number,
  description: row.description || '',
  amount: parseFloat(row.amount) || 0,
  issueDate: row.issue_date,
  fileUrl: row.file_url || '',
  createdAt: row.created_at,
  verificationCode: row.verification_code || '',
  issuedAt: row.issued_at || '',
  issAmount: parseFloat(row.iss_amount) || 0,
  takerName: row.taker_name || '',
  takerDoc: row.taker_doc || '',
  takerEmail: row.taker_email || '',
  providerCcm: row.provider_ccm || '',
  status: row.status === 'cancelada' ? 'cancelada' : 'emitida',
  filePath: row.file_path || '',
  xmlPath: row.xml_path || '',
  nfseUrl: row.nfse_url || '',
});

export function useNotasFiscais() {
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_invoices')
      .select('*')
      .order('issue_date', { ascending: false });
    if (error) {
      console.error('Erro ao buscar notas fiscais:', error);
      setError(error.message);
    } else {
      setError(null);
      setInvoices((data || []).map(mapInvoiceRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upload = async (path: string, body: Blob, contentType: string) => {
    const { error } = await supabase.storage.from(NF_BUCKET).upload(path, body, { upsert: true, contentType });
    if (error) throw new Error(`Falha ao enviar arquivo: ${error.message}`);
    return path;
  };

  /** Salva a nota: copia PDF/XML para a pasta ano/mês com o nome da nota e grava os dados */
  const saveInvoice = async (n: ParsedNfse, clientId: string): Promise<ServiceInvoice> => {
    const folder = nfseFolder(n.issueDate);
    const base = nfseBaseName(n);
    let filePath = '';
    let xmlPath = '';

    if (n.pdfFile) filePath = await upload(`${folder}/${base}.pdf`, n.pdfFile, 'application/pdf');
    if (n.xmlContent) xmlPath = await upload(`${folder}/${base}.xml`, new Blob([n.xmlContent], { type: 'application/xml' }), 'application/xml');

    const row = {
      client_id: clientId || null,
      invoice_number: n.invoiceNumber,
      verification_code: n.verificationCode,
      description: n.description,
      amount: n.amount,
      iss_amount: n.issAmount,
      issue_date: n.issueDate,
      issued_at: n.issuedAt || null,
      taker_name: n.takerName,
      taker_doc: n.takerDoc,
      taker_email: n.takerEmail,
      provider_ccm: n.providerCcm,
      status: n.cancelled ? 'cancelada' : 'emitida',
      file_path: filePath,
      xml_path: xmlPath,
      nfse_url: n.nfseUrl,
      file_url: n.nfseUrl,
    };

    // Se a mesma nota já foi importada, atualiza em vez de duplicar
    const existing = invoices.find(i => i.invoiceNumber.replace(/^0+/, '') === n.invoiceNumber.replace(/^0+/, '') && (!n.providerCcm || !i.providerCcm || i.providerCcm === n.providerCcm));
    const query = existing
      ? supabase.from('service_invoices').update({ ...row, file_path: filePath || existing.filePath, xml_path: xmlPath || existing.xmlPath }).eq('id', existing.id)
      : supabase.from('service_invoices').insert(row);
    const { data, error } = await query.select().single();
    if (error) throw new Error(`Falha ao salvar a nota: ${error.message}`);

    const saved = mapInvoiceRow(data);
    setInvoices(prev => [saved, ...prev.filter(i => i.id !== saved.id)].sort((a, b) => b.issueDate.localeCompare(a.issueDate)));
    return saved;
  };

  const updateClient = async (id: string, clientId: string) => {
    const { error } = await supabase.from('service_invoices').update({ client_id: clientId || null }).eq('id', id);
    if (!error) setInvoices(prev => prev.map(i => (i.id === id ? { ...i, clientId } : i)));
  };

  const deleteInvoice = async (inv: ServiceInvoice) => {
    const paths = [inv.filePath, inv.xmlPath].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(NF_BUCKET).remove(paths);
    const { error } = await supabase.from('service_invoices').delete().eq('id', inv.id);
    if (error) throw new Error(error.message);
    setInvoices(prev => prev.filter(i => i.id !== inv.id));
  };

  /** Link temporário (1h) para abrir/baixar o arquivo guardado */
  const fileUrl = async (path: string, download?: string) => {
    const { data, error } = await supabase.storage.from(NF_BUCKET).createSignedUrl(path, 3600, download ? { download } : undefined);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  };

  return { invoices, loading, error, fetchAll, saveInvoice, updateClient, deleteInvoice, fileUrl };
}
