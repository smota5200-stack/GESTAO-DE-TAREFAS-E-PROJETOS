import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DemandComment } from '../types';
import { useAsana } from './useAsana';

export function useDemandComments(demandId?: string, asanaTaskId?: string) {
    const [comments, setComments] = useState<DemandComment[]>([]);
    const [loading, setLoading] = useState(false);
    const { getTaskComments, addTaskComment } = useAsana();

    const fetchComments = useCallback(async (selectedDemandId?: string, selectedAsanaTaskId?: string) => {
        const dId = selectedDemandId || demandId;
        const aId = selectedAsanaTaskId || asanaTaskId;
        
        if (!dId) return;
        setLoading(true);

        try {
            // 1. Buscar do Supabase
            const { data: dbComments, error } = await supabase
                .from('demand_comments')
                .select('*')
                .eq('demand_id', dId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            let finalComments: DemandComment[] = (dbComments || []).map(c => ({
                id: c.id,
                demandId: c.demand_id,
                userName: c.user_name,
                content: c.content,
                createdAt: c.created_at
            }));

            // 2. Se houver Asana Task ID, buscar do Asana também
            if (aId) {
                const asanaStories = await getTaskComments(aId);
                const asanaComments: DemandComment[] = asanaStories.map((s: any) => ({
                    id: s.gid,
                    demandId: dId,
                    userName: s.created_by?.name || 'Asana User',
                    content: s.html_text || s.text || '',
                    createdAt: s.created_at,
                    type: s.type // 'comment' ou 'system'
                }));

                // Mesclar e remover duplicados (opcional, aqui apenas concatenamos por simplicidade)
                // Idealmente, poderíamos cruzar se já importamos essa Story antes.
                // Para simplificar: mostramos as do DB local e as do Asana que não estão no DB.
                // Mas stories do Asana costumam ser "readonly" para o nosso sistema local.
                
                // Vamos apenas adicionar as do Asana que não temos no local (baseado no conteúdo e data talvez)
                // Por agora, vamos apenas concatenar e ordenar por data
                const merged = [...finalComments, ...asanaComments].sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                
                // Remover duplicados básicos por conteúdo próximo se for o caso
                setComments(merged);
            } else {
                setComments(finalComments);
            }
        } catch (error) {
            console.error('Erro ao buscar comentários:', error);
        } finally {
            setLoading(false);
        }
    }, [demandId, asanaTaskId, getTaskComments]);

    const addComment = async (content: string, userName: string, currentAsanaTaskId?: string) => {
        const dId = demandId;
        const aId = currentAsanaTaskId || asanaTaskId;

        if (!dId || !content.trim()) return null;

        try {
            // 1. Salvar no Supabase
            const { data, error } = await supabase
                .from('demand_comments')
                .insert({
                    demand_id: dId,
                    user_name: userName,
                    content: content
                })
                .select()
                .single();

            if (error) throw error;

            const newComment: DemandComment = {
                id: data.id,
                demandId: data.demand_id,
                userName: data.user_name,
                content: data.content,
                createdAt: data.created_at
            };

            // 2. Se houver Asana Task ID, postar no Asana também
            if (aId) {
                await addTaskComment(aId, content);
            }

            setComments(prev => [...prev, newComment]);
            return newComment;
        } catch (error) {
            console.error('Erro ao adicionar comentário:', error);
            return null;
        }
    };

    return { comments, loading, fetchComments, addComment };
}
