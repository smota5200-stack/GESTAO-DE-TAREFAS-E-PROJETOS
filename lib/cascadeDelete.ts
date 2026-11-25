import { supabase } from './supabaseClient';

/**
 * Exclusão em ordem (filhos → pais), para funcionar mesmo quando o banco não tem
 * ON DELETE CASCADE nas chaves estrangeiras (erro "violates foreign key constraint").
 */

const chunk = <T,>(arr: T[], size = 50): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const DEMAND_CHILD_TABLES = ['sub_demands', 'demand_comments', 'payment_notifications'];

/** Exclui demandas e tudo que depende delas. Retorna mensagem de erro ou null. */
export async function deleteDemandsCascade(demandIds: string[]): Promise<string | null> {
  for (const ids of chunk(demandIds)) {
    for (const table of DEMAND_CHILD_TABLES) {
      const { error } = await supabase.from(table).delete().in('demand_id', ids);
      if (error) return `${table}: ${error.message}`;
    }
    const { error } = await supabase.from('project_demands').delete().in('id', ids);
    if (error) return `project_demands: ${error.message}`;
  }
  return null;
}

/** Exclui projetos, suas demandas (e dependências) e anexos. Retorna mensagem de erro ou null. */
export async function deleteProjectsCascade(projectIds: string[]): Promise<string | null> {
  for (const ids of chunk(projectIds, 20)) {
    const { data: demands, error: dErr } = await supabase.from('project_demands').select('id').in('project_id', ids);
    if (dErr) return `project_demands: ${dErr.message}`;
    const demandErr = await deleteDemandsCascade((demands || []).map((d: any) => d.id));
    if (demandErr) return demandErr;

    const { error: aErr } = await supabase.from('project_attachments').delete().in('project_id', ids);
    if (aErr) return `project_attachments: ${aErr.message}`;

    const { error } = await supabase.from('projects').delete().in('id', ids);
    if (error) return `projects: ${error.message}`;
  }
  return null;
}
