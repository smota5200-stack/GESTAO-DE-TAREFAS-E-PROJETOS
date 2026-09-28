import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Client } from '../types';

const STORAGE_KEY = 'studiomota.clients.v1';
const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const getLocalClients = (): Client[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveLocalClients = (next: Client[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const mapRow = (row: any): Client => ({
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone || '',
    cpfCnpj: row.cpf_cnpj || row.cpfCnpj || '',
    status: row.status || 'Ativo',
    totalSpent: parseFloat(row.total_spent ?? row.totalSpent ?? 0) || 0,
    notes: row.notes || '',
    contractUrl: row.contract_url || row.contractUrl || ''
});

export function useClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClients = useCallback(async () => {
        setLoading(true);

        if (!hasSupabase) {
            setClients(getLocalClients());
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Supabase indisponível; usando fallback local:', error);
            setClients(getLocalClients());
        } else {
            setClients((data || []).map(mapRow));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const createClient = async (client: Omit<Client, 'id' | 'totalSpent' | 'status'>): Promise<Client | null> => {
        const newClient: Client = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: client.name,
            company: client.company,
            email: client.email,
            phone: client.phone,
            cpfCnpj: client.cpfCnpj || '',
            status: 'Ativo',
            totalSpent: 0,
            notes: client.notes || '',
            contractUrl: client.contractUrl || ''
        };

        if (!hasSupabase) {
            const next = [newClient, ...getLocalClients()];
            saveLocalClients(next);
            setClients(next);
            return newClient;
        }

        const { data, error } = await supabase
            .from('clients')
            .insert({
                name: client.name,
                company: client.company,
                email: client.email,
                phone: client.phone,
                cpf_cnpj: client.cpfCnpj || '',
                notes: client.notes,
                contract_url: client.contractUrl || '',
                status: 'Ativo',
                total_spent: 0
            })
            .select()
            .single();

        if (error) {
            console.warn('Falha ao salvar no Supabase; salvando localmente:', error);
            const next = [newClient, ...getLocalClients()];
            saveLocalClients(next);
            setClients(next);
            return newClient;
        }

        const saved = mapRow(data);
        const next = [saved, ...getLocalClients().filter(item => item.id !== saved.id)];
        saveLocalClients(next);
        setClients(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
        return saved;
    };

    const deleteClient = async (id: string): Promise<boolean> => {
        if (!hasSupabase) {
            const next = getLocalClients().filter(c => c.id !== id);
            saveLocalClients(next);
            setClients(next);
            return true;
        }

        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir cliente:', error);
            const next = getLocalClients().filter(c => c.id !== id);
            saveLocalClients(next);
            setClients(next);
            return false;
        }
        const next = getLocalClients().filter(c => c.id !== id);
        saveLocalClients(next);
        setClients(prev => prev.filter(c => c.id !== id));
        return true;
    };

    return { clients, loading, fetchClients, createClient, deleteClient };
}
