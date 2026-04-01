import { supabase } from '../lib/supabaseClient';

export function useAsana() {
    
    const getCredentials = async () => {
        const { data } = await supabase.from('settings').select('*');
        if (!data) return { token: null, userId: null };
        
        return {
            token: data.find(s => s.key === 'asana_token')?.value || null,
            userId: data.find(s => s.key === 'asana_user_id')?.value || null
        };
    };

    const updateTaskStatus = async (asanaTaskId: string, completed: boolean) => {
        const { token } = await getCredentials();
        if (!token) return;

        try {
            await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: { completed }
                })
            });
        } catch (error) {
            console.error('Erro ao atualizar status no Asana:', error);
        }
    };

    const uploadAttachment = async (asanaTaskId: string, fileUrl: string, fileName: string) => {
        const { token } = await getCredentials();
        if (!token) return;

        try {
            // No Asana, para anexar via URL, usamos o endpoint de attachments
            // Mas normalmente é um multipart/form-data. 
            // Para simplificar e seguir o pedido do usuário (subir arquivo), 
            // se o arquivo for externo (URL), o Asana permite criar um anexo externo.
            
            await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}/attachments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        name: fileName,
                        resource_subtype: 'external',
                        external_url: fileUrl
                    }
                })
            });
        } catch (error) {
            console.error('Erro ao anexar arquivo no Asana:', error);
        }
    };

    const updateTask = async (asanaTaskId: string, updates: { name?: string; notes?: string }) => {
        const { token } = await getCredentials();
        if (!token) return;

        try {
            await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: updates
                })
            });
        } catch (error) {
            console.error('Erro ao atualizar tarefa no Asana:', error);
        }
    };

    const getTaskComments = async (asanaTaskId: string) => {
        const { token } = await getCredentials();
        if (!token) return [];

        try {
            const response = await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}/stories?opt_fields=text,html_text,type,created_at,created_by.name`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return [];
            const result = await response.json();
            // Retornar todas as stories (comentários e mensagens de sistema)
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar comentários do Asana:', error);
            return [];
        }
    };

    const addTaskComment = async (asanaTaskId: string, text: string) => {
        const { token } = await getCredentials();
        if (!token) return;

        try {
            await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}/stories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: { text }
                })
            });
        } catch (error) {
            console.error('Erro ao adicionar comentário no Asana:', error);
        }
    };

    const getProjectTasks = async (asanaProjectId: string) => {
        const { token } = await getCredentials();
        if (!token) {
            console.error('getProjectTasks: Token não encontrado');
            throw new Error('Asana token not found');
        }

        console.log('getProjectTasks: Buscando tarefas para o projeto:', asanaProjectId);
        const url = `https://app.asana.com/api/1.0/tasks?project=${asanaProjectId}&opt_fields=name,notes,due_on,completed,assignee.name,custom_fields.name,custom_fields.display_value,custom_fields.text_value,custom_fields.date_value,custom_fields.enum_value.name`;
        console.log('getProjectTasks: URL da requisição:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('getProjectTasks: Erro na resposta do Asana:', response.status, errorText);
            throw new Error(`Failed to fetch tasks from Asana: ${response.status}`);
        }

        const result = await response.json();
        console.log(`getProjectTasks: ${result.data?.length || 0} tarefas encontradas.`);
        return result.data;
    };

    const updateCustomField = async (asanaTaskId: string, customFieldId: string, value: string | { gid: string }) => {
        const { token } = await getCredentials();
        if (!token) return;

        try {
            await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        custom_fields: {
                            [customFieldId]: typeof value === 'string' ? value : value.gid
                        }
                    }
                })
            });
        } catch (error) {
            console.error('Erro ao atualizar campo personalizado no Asana:', error);
        }
    };

    const getTaskDetails = async (asanaTaskId: string) => {
        const { token } = await getCredentials();
        if (!token) return null;

        try {
            const response = await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}?opt_fields=custom_fields.name,custom_fields.enum_options.name,custom_fields.enum_options.gid,custom_fields.type`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return null;
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar detalhes da tarefa no Asana:', error);
            return null;
        }
    };

    return { updateTaskStatus, uploadAttachment, getProjectTasks, updateTask, getTaskComments, addTaskComment, updateCustomField, getTaskDetails };
}
