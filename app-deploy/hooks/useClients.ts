import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Client } from '../types';

export function useClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar clientes:', error);
        } else {
            setClients(
                (data || []).map((row: any) => ({
                    id: row.id,
                    name: row.name,
                    company: row.company,
                    email: row.email,
                    phone: row.phone || '',
                    cpfCnpj: row.cpf_cnpj || '',
                    status: row.status,
                    totalSpent: parseFloat(row.total_spent) || 0,
                    notes: row.notes || '',
                    contractUrl: row.contract_url || ''
                }))
            );
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const createClient = async (client: Omit<Client, 'id' | 'totalSpent' | 'status'>): Promise<Client | null> => {
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
            console.error('Erro ao criar cliente:', error);
            alert("Atenção: O cadastro falhou porque o banco de dados do Freela OS (Supabase) está offline ou pausado. Por favor, acesse app.supabase.com e ative/unpause o seu projeto para conseguir salvar novos clientes.");
            return null;
        }

        const newClient: Client = {
            id: data.id,
            name: data.name,
            company: data.company,
            email: data.email,
            phone: data.phone || '',
            cpfCnpj: data.cpf_cnpj || '',
            status: data.status,
            totalSpent: parseFloat(data.total_spent) || 0,
            notes: data.notes || '',
            contractUrl: data.contract_url || ''
        };

        setClients(prev => [newClient, ...prev]);
        return newClient;
    };

    const deleteClient = async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir cliente:', error);
            return false;
        }
        setClients(prev => prev.filter(c => c.id !== id));
        return true;
    };

    return { clients, loading, fetchClients, createClient, deleteClient };
}
