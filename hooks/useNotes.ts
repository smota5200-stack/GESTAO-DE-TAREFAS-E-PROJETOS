import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Note, NoteColor } from '../types';

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar notas:', error);
        } else {
            setNotes(
                (data || []).map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    content: row.content || '',
                    color: row.color || 'yellow',
                    isPinned: row.is_pinned || false,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }))
            );
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const createNote = async (note: { title: string; content: string; color: NoteColor }): Promise<Note | null> => {
        const { data, error } = await supabase
            .from('notes')
            .insert({
                title: note.title,
                content: note.content,
                color: note.color,
                is_pinned: false
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar nota:', error);
            return null;
        }

        const newNote: Note = {
            id: data.id,
            title: data.title,
            content: data.content || '',
            color: data.color,
            isPinned: data.is_pinned,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        setNotes(prev => [newNote, ...prev]);
        return newNote;
    };

    const updateNote = async (id: string, updates: Partial<{ title: string; content: string; color: NoteColor }>): Promise<boolean> => {
        const { error } = await supabase
            .from('notes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar nota:', error);
            return false;
        }

        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
        return true;
    };

    const togglePin = async (id: string): Promise<boolean> => {
        const note = notes.find(n => n.id === id);
        if (!note) return false;

        const newPinned = !note.isPinned;
        const { error } = await supabase
            .from('notes')
            .update({ is_pinned: newPinned, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Erro ao fixar/desfixar nota:', error);
            return false;
        }

        await fetchNotes(); // Re-fetch to maintain proper sort order
        return true;
    };

    const deleteNote = async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir nota:', error);
            return false;
        }
        setNotes(prev => prev.filter(n => n.id !== id));
        return true;
    };

    return { notes, loading, fetchNotes, createNote, updateNote, togglePin, deleteNote };
}
