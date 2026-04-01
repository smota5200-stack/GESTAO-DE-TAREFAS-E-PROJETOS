import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PriceTableItem, PriceItemType } from '../types';

import { SINAPRO_ITEMS } from '../data/sinapro';

function mapRow(row: any): PriceTableItem {
    return {
        id: row.id,
        title: row.title,
        type: row.type as PriceItemType,
        price: parseFloat(row.price) || 0,
        description: row.description || '',
        quantity: row.quantity || 1,
        status: row.status || 'Criação'
    };
}

export function usePriceTable() {
    const [items, setItems] = useState<PriceTableItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [markup, setMarkupState] = useState<number>(() => {
        return Number(localStorage.getItem('freela_os_sinapro_markup') || '0');
    });

    const setMarkup = useCallback((val: number) => {
        setMarkupState(val);
        localStorage.setItem('freela_os_sinapro_markup', val.toString());
    }, []);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('price_table')
            .select('*')
            .order('created_at', { ascending: false });

        const mappedDbItems = error ? [] : (data || []).map(mapRow);
        
        const markupMultiplier = 1 + (markup / 100);
        const markedUpSinapro = SINAPRO_ITEMS.map(item => ({
            ...item,
            price: item.price * markupMultiplier
        })) as any[];

        setItems([...mappedDbItems, ...markedUpSinapro]);
        setLoading(false);
    }, [markup]);


    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const createItem = async (item: Omit<PriceTableItem, 'id'>): Promise<PriceTableItem | null> => {
        const { data, error } = await supabase
            .from('price_table')
            .insert({
                title: item.title,
                type: item.type,
                price: item.price,
                description: item.description,
                quantity: item.quantity || 1,
                status: item.status || 'Criação'
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar item:', error);
            return null;
        }

        const newItem = mapRow(data);
        setItems(prev => [newItem, ...prev]);
        return newItem;
    };

    const updateItem = async (id: string, updates: Partial<PriceTableItem>): Promise<boolean> => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { error } = await supabase.from('price_table').update(dbUpdates).eq('id', id);
        if (error) {
            console.error('Erro ao atualizar item:', error);
            return false;
        }
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
        return true;
    };

    const deleteItem = async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('price_table').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir item:', error);
            return false;
        }
        setItems(prev => prev.filter(i => i.id !== id));
        return true;
    };

    return { items, loading, fetchItems, createItem, updateItem, deleteItem, markup, setMarkup };
}
