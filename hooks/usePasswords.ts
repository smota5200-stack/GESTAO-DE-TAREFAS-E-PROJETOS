import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Password } from '../types';

export function usePasswords() {
    const [passwords, setPasswords] = useState<Password[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPasswords = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('passwords')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar senhas:', error);
        } else {
            setPasswords(
                (data || []).map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    url: row.url || '',
                    username: row.username || '',
                    password: row.password || '',
                    notes: row.notes || '',
                    category: row.category || 'Geral',
                    createdAt: row.created_at
                }))
            );
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPasswords();
    }, [fetchPasswords]);

    const createPassword = async (pw: Omit<Password, 'id' | 'createdAt'>): Promise<Password | null> => {
        const { data, error } = await supabase
            .from('passwords')
            .insert({
                title: pw.title,
                url: pw.url,
                username: pw.username,
                password: pw.password,
                notes: pw.notes,
                category: pw.category
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar senha:', error);
            return null;
        }

        const newPw: Password = {
            id: data.id,
            title: data.title,
            url: data.url || '',
            username: data.username || '',
            password: data.password || '',
            notes: data.notes || '',
            category: data.category || 'Geral',
            createdAt: data.created_at
        };

        setPasswords(prev => [newPw, ...prev]);
        return newPw;
    };

    const updatePassword = async (id: string, updates: Partial<Omit<Password, 'id' | 'createdAt'>>): Promise<boolean> => {
        const { error } = await supabase
            .from('passwords')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar senha:', error);
            return false;
        }

        setPasswords(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        return true;
    };

    const deletePassword = async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('passwords').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir senha:', error);
            return false;
        }
        setPasswords(prev => prev.filter(p => p.id !== id));
        return true;
    };

    return { passwords, loading, fetchPasswords, createPassword, updatePassword, deletePassword };
}
