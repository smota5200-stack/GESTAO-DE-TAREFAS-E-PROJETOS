import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ProjectAttachment } from '../types';

export function useAttachments(projectId: string) {
    const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAttachments = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('project_attachments')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar anexos:', error);
        } else {
            setAttachments(data.map(row => ({
                id: row.id,
                projectId: row.project_id,
                name: row.name,
                url: row.url,
                type: row.type,
                size: row.size,
                createdAt: row.created_at
            })));
        }
        setLoading(false);
    }, [projectId]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    const uploadFile = async (file: File): Promise<ProjectAttachment | null> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;

        // 1. Upload to Storage
        const { error: uploadError, data: uploadData } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Erro no upload do Storage:', uploadError);
            return null;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('project-files')
            .getPublicUrl(filePath);

        // 3. Save to database
        const { data, error: dbError } = await supabase
            .from('project_attachments')
            .insert({
                project_id: projectId,
                name: file.name,
                url: publicUrl,
                type: file.type,
                size: file.size
            })
            .select()
            .single();

        if (dbError) {
            console.error('Erro ao salvar metadados do anexo:', dbError);
            return null;
        }

        const newAttachment: ProjectAttachment = {
            id: data.id,
            projectId: data.project_id,
            name: data.name,
            url: data.url,
            type: data.type,
            size: data.size,
            createdAt: data.created_at
        };

        setAttachments(prev => [newAttachment, ...prev]);
        return newAttachment;
    };

    const deleteAttachment = async (id: string, url: string): Promise<boolean> => {
        // Extrair o path do Storage a partir da URL pública
        // URL format: .../storage/v1/object/public/project-files/[projectId]/[fileName]
        const pathParts = url.split('project-files/');
        if (pathParts.length < 2) return false;
        const storagePath = pathParts[1];

        // 1. Delete from Storage
        const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([storagePath]);

        if (storageError) {
            console.error('Erro ao excluir do Storage:', storageError);
            // Prossegue para tentar excluir do banco mesmo se falhar no storage (ex: arquivo já sumiu)
        }

        // 2. Delete from database
        const { error: dbError } = await supabase
            .from('project_attachments')
            .delete()
            .eq('id', id);

        if (dbError) {
            console.error('Erro ao excluir do banco:', dbError);
            return false;
        }

        setAttachments(prev => prev.filter(a => a.id !== id));
        return true;
    };

    return { attachments, loading, uploadFile, deleteAttachment, fetchAttachments };
}
