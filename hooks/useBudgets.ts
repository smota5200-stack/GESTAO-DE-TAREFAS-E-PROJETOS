import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface SavedBudget {
  id: string;
  ref: string;
  clientName: string;
  title: string;
  total: number;
  status: string;
  updatedAt: string;
  draft: any;
}

const mapRow = (r: any): SavedBudget => ({
  id: r.id,
  ref: r.ref || '',
  clientName: r.client_name || '',
  title: r.title || '',
  total: r.total != null ? parseFloat(r.total) : Number(r.total_value) || 0,
  status: r.status || 'rascunho',
  updatedAt: r.updated_at || r.created_at,
  draft: r.draft || null,
});

export function useBudgets() {
  const [budgets, setBudgets] = useState<SavedBudget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('budgets').select('*').order('created_at', { ascending: false }).limit(200);
    if (!error) setBudgets((data || []).map(mapRow).filter(b => b.draft));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** Cria ou atualiza. Retorna o id salvo. */
  const saveBudget = async (draft: any, total: number, validUntil: string): Promise<string> => {
    const clientName = draft.company || draft.contactName || 'Cliente';
    const row = {
      ref: draft.ref,
      client_id: draft.selectedClientId || null,
      client_name: clientName,
      title: draft.items?.[0]?.description ? `${draft.items[0].description}${draft.items.length > 1 ? ` +${draft.items.length - 1}` : ''}` : 'Proposta comercial',
      total_value: Math.round(total),
      total,
      currency: draft.currency === 'USD' ? 'USD' : draft.currency === 'EUR' ? 'EUR' : 'BRL',
      validity_date: validUntil,
      payment_terms: draft.paymentTerms,
      notes: draft.observations,
      items: draft.items,
      draft: { ...draft, savedId: undefined },
      updated_at: new Date().toISOString(),
    };
    const q = draft.savedId
      ? supabase.from('budgets').update(row).eq('id', draft.savedId)
      : supabase.from('budgets').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw new Error(error.message);
    const saved = mapRow(data);
    setBudgets(prev => [saved, ...prev.filter(b => b.id !== saved.id)]);
    return saved.id;
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  return { budgets, loading, saveBudget, deleteBudget, refetch: fetchAll };
}
