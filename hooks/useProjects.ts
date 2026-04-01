import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Project } from '../types';

function mapRow(row: any): Project {
    return {
        id: row.id,
        title: row.title,
        client: row.client_name,
        clientId: row.client_id || undefined,
        priority: row.priority,
        status: row.status,
        progress: row.progress || 0,
        dueDate: row.due_date || '',
        comments: row.comments || 0,
        description: row.description || '',
        driveLink: row.drive_link || '',
        externalSystemLink: row.external_system_link || '',
        asanaProjectId: row.asana_project_id || ''
    };
}

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar projetos:', error);
        } else {
            setProjects((data || []).map(mapRow));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const createProject = async (project: Omit<Project, 'id' | 'progress' | 'comments'>): Promise<Project | null> => {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                title: project.title,
                client_name: project.client,
                client_id: project.clientId || null,
                priority: project.priority,
                status: project.status || 'A Fazer',
                progress: 0,
                due_date: project.dueDate,
                description: project.description || '',
                drive_link: project.driveLink || '',
                external_system_link: project.externalSystemLink || '',
                asana_project_id: project.asanaProjectId || ''
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar projeto:', error);
            return null;
        }

        const newProject = mapRow(data);
        setProjects(prev => [newProject, ...prev]);
        return newProject;
    };

    const updateProject = async (id: string, updates: Partial<Project>): Promise<boolean> => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.client !== undefined) dbUpdates.client_name = updates.client;
        if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.driveLink !== undefined) dbUpdates.drive_link = updates.driveLink;
        if (updates.externalSystemLink !== undefined) dbUpdates.external_system_link = updates.externalSystemLink;
        if (updates.asanaProjectId !== undefined) dbUpdates.asana_project_id = updates.asanaProjectId;

        const { error } = await supabase.from('projects').update(dbUpdates).eq('id', id);
        if (error) {
            console.error('Erro ao atualizar projeto:', error);
            return false;
        }
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        return true;
    };

    const getProjectById = async (id: string): Promise<Project | null> => {
        const cached = projects.find(p => p.id === id);
        if (cached) return cached;

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return mapRow(data);
    };

    return { projects, loading, fetchProjects, createProject, updateProject, getProjectById };
}
