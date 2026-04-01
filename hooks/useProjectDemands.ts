import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ProjectDemand, SubDemand, PriceItemType } from '../types';

function mapSubDemand(row: any): SubDemand {
    return {
        id: row.id,
        title: row.title,
        workStatus: row.work_status,
        driveLink: row.drive_link || '',
        externalSystemLink: row.external_system_link || ''
    };
}

function mapDemand(row: any, subDemands?: SubDemand[]): ProjectDemand {
    return {
        id: row.id,
        projectId: row.project_id,
        priceItemId: row.price_item_id || undefined,
        title: row.title,
        type: row.type as PriceItemType,
        amount: parseFloat(row.amount) || 0,
        dueDate: row.due_date || '',
        workStatus: row.work_status,
        paymentStatus: row.payment_status,
        description: row.description || '',
        driveLink: row.drive_link || '',
        externalSystemLink: row.external_system_link || '',
        totalQuantity: row.total_quantity || 1,
        completedQuantity: row.completed_quantity || 0,
        asanaTaskId: row.asana_task_id || undefined,
        assigneeName: row.assignee_name || '',
        priority: row.priority || '',
        postingDate: row.posting_date || '',
        format: row.format || '',
        deliveryDate: row.delivery_date || '',
        subDemands: subDemands
    };
}

export function useProjectDemands(projectId?: string) {
    const [demands, setDemands] = useState<ProjectDemand[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDemands = useCallback(async (pId?: string) => {
        const id = pId || projectId;
        if (!id) { setLoading(false); return; }

        setLoading(true);

        // Buscar demandas do projeto
        const { data: demandsData, error: demandsError } = await supabase
            .from('project_demands')
            .select('*')
            .eq('project_id', id)
            .order('created_at', { ascending: true });

        if (demandsError) {
            console.error('Erro ao buscar demandas:', demandsError);
            setLoading(false);
            return;
        }

        const demandRows = demandsData || [];

        // Buscar sub-demandas para todas as demandas do tipo Pacote
        const pacoteDemandIds = demandRows.filter(d => d.type === 'Pacote').map(d => d.id);
        let subDemandsMap: Record<string, SubDemand[]> = {};

        if (pacoteDemandIds.length > 0) {
            const { data: subData, error: subError } = await supabase
                .from('sub_demands')
                .select('*')
                .in('demand_id', pacoteDemandIds)
                .order('created_at', { ascending: true });

            if (!subError && subData) {
                for (const row of subData) {
                    if (!subDemandsMap[row.demand_id]) subDemandsMap[row.demand_id] = [];
                    subDemandsMap[row.demand_id].push(mapSubDemand(row));
                }
            }
        }

        const mapped = demandRows.map(row => mapDemand(row, subDemandsMap[row.id]));
        setDemands(mapped);
        setLoading(false);
    }, [projectId]);

    const createDemand = async (demand: Omit<ProjectDemand, 'id'>, subDemandTitles?: string[]): Promise<ProjectDemand | null> => {
        const { data, error } = await supabase
            .from('project_demands')
            .insert({
                project_id: demand.projectId,
                price_item_id: demand.priceItemId || null,
                title: demand.title,
                type: demand.type,
                amount: demand.amount,
                due_date: demand.dueDate,
                work_status: demand.workStatus || 'A Fazer',
                payment_status: demand.paymentStatus || 'Pendente',
                description: demand.description || '',
                drive_link: demand.driveLink || '',
                external_system_link: demand.externalSystemLink || '',
                total_quantity: demand.totalQuantity,
                completed_quantity: 0,
                assignee_name: demand.assigneeName || '',
                priority: demand.priority || '',
                posting_date: demand.postingDate || '',
                format: demand.format || '',
                delivery_date: demand.deliveryDate || '',
                asana_task_id: demand.asanaTaskId || null
            })
            .select()
            .single();

        if (error || !data) {
            console.error('Erro ao criar demanda:', error);
            return null;
        }

        // Criar sub-demandas se for Pacote
        let subs: SubDemand[] | undefined;
        if (demand.type === 'Pacote' && subDemandTitles && subDemandTitles.length > 0) {
            const subInserts = subDemandTitles.map(title => ({
                demand_id: data.id,
                title,
                work_status: 'A Fazer'
            }));

            const { data: subData, error: subError } = await supabase
                .from('sub_demands')
                .insert(subInserts)
                .select();

            if (!subError && subData) {
                subs = subData.map(mapSubDemand);
            }
        }

        const newDemand = mapDemand(data, subs);
        setDemands(prev => [...prev, newDemand]);
        return newDemand;
    };

    const updateDemand = async (id: string, updates: Partial<ProjectDemand>): Promise<boolean> => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.workStatus !== undefined) dbUpdates.work_status = updates.workStatus;
        if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.driveLink !== undefined) dbUpdates.drive_link = updates.driveLink;
        if (updates.externalSystemLink !== undefined) dbUpdates.external_system_link = updates.externalSystemLink;
        if (updates.completedQuantity !== undefined) dbUpdates.completed_quantity = updates.completedQuantity;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.asanaTaskId !== undefined) dbUpdates.asana_task_id = updates.asanaTaskId;
        if (updates.assigneeName !== undefined) dbUpdates.assignee_name = updates.assigneeName;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.postingDate !== undefined) dbUpdates.posting_date = updates.postingDate;
        if (updates.format !== undefined) dbUpdates.format = updates.format;
        if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate;

        const { error } = await supabase.from('project_demands').update(dbUpdates).eq('id', id);
        if (error) {
            console.error('Erro ao atualizar demanda:', error);
            return false;
        }
        setDemands(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
        return true;
    };

    const updateSubDemand = async (subId: string, demandId: string, updates: Partial<SubDemand>): Promise<boolean> => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.workStatus !== undefined) dbUpdates.work_status = updates.workStatus;
        if (updates.driveLink !== undefined) dbUpdates.drive_link = updates.driveLink;
        if (updates.externalSystemLink !== undefined) dbUpdates.external_system_link = updates.externalSystemLink;

        const { error } = await supabase.from('sub_demands').update(dbUpdates).eq('id', subId);
        if (error) {
            console.error('Erro ao atualizar sub-demanda:', error);
            return false;
        }

        // Atualizar estado local
        setDemands(prev => prev.map(d => {
            if (d.id === demandId && d.subDemands) {
                const updatedSubs = d.subDemands.map(sd => sd.id === subId ? { ...sd, ...updates } : sd);
                const completed = updatedSubs.filter(sd => sd.workStatus === 'Entregue').length;
                let parentStatus: ProjectDemand['workStatus'] = 'Entregue';
                if (completed === 0) parentStatus = 'A Fazer';
                if (completed === d.totalQuantity) parentStatus = 'Entregue';
                return { ...d, subDemands: updatedSubs, completedQuantity: completed, workStatus: parentStatus };
            }
            return d;
        }));

        return true;
    };

    // Buscar todas as demandas (para Finances)
    const fetchAllDemands = useCallback(async (): Promise<ProjectDemand[]> => {
        const { data, error } = await supabase
            .from('project_demands')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar todas as demandas:', error);
            return [];
        }
        const mapped = (data || []).map(row => mapDemand(row));
        setDemands(mapped);
        setLoading(false);
        return mapped;
    }, []);

    const deleteDemands = async (ids: string[]): Promise<boolean> => {
        const { error } = await supabase.from('project_demands').delete().in('id', ids);
        if (error) {
            console.error('Erro ao excluir demandas:', error);
            return false;
        }
        setDemands(prev => prev.filter(d => !ids.includes(d.id)));
        return true;
    };

    return { demands, setDemands, loading, fetchDemands, createDemand, updateDemand, updateSubDemand, fetchAllDemands, deleteDemands };
}
