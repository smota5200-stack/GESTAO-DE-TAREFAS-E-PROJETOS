import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ServiceInvoice } from '../types';

export function useServiceInvoices(clientId: string | undefined) {
    const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvoices = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('service_invoices')
            .select('*')
            .eq('client_id', clientId)
            .order('issue_date', { ascending: false });

        if (error) {
            console.error('Erro ao buscar notas fiscais:', error);
        } else {
            setInvoices(
                (data || []).map((row: any) => ({
                    id: row.id,
                    clientId: row.client_id,
                    invoiceNumber: row.invoice_number,
                    description: row.description || '',
                    amount: parseFloat(row.amount) || 0,
                    issueDate: row.issue_date,
                    fileUrl: row.file_url || '',
                    createdAt: row.created_at
                }))
            );
        }
        setLoading(false);
    }, [clientId]);

    const createInvoice = async (invoice: Omit<ServiceInvoice, 'id' | 'createdAt' | 'clientId'>): Promise<ServiceInvoice | null> => {
        if (!clientId) return null;
        const { data, error } = await supabase
            .from('service_invoices')
            .insert({
                client_id: clientId,
                invoice_number: invoice.invoiceNumber,
                description: invoice.description,
                amount: invoice.amount,
                issue_date: invoice.issueDate,
                file_url: invoice.fileUrl
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar nota fiscal:', error);
            return null;
        }

        const newInvoice: ServiceInvoice = {
            id: data.id,
            clientId: data.client_id,
            invoiceNumber: data.invoice_number,
            description: data.description || '',
            amount: parseFloat(data.amount) || 0,
            issueDate: data.issue_date,
            fileUrl: data.file_url || '',
            createdAt: data.created_at
        };

        setInvoices(prev => [newInvoice, ...prev]);
        return newInvoice;
    };

    const deleteInvoice = async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('service_invoices').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir nota fiscal:', error);
            return false;
        }
        setInvoices(prev => prev.filter(i => i.id !== id));
        return true;
    };

    return { invoices, loading, fetchInvoices, createInvoice, deleteInvoice };
}
