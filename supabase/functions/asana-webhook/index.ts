import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASANA_API_URL = "https://app.asana.com/api/1.0";

serve(async (req) => {
  const { method, headers } = req;

  // 1. Handshake do Asana Webhook
  if (headers.get("X-Hook-Secret")) {
    const secret = headers.get("X-Hook-Secret");
    console.log("Asana Handshake received. Secret:", secret);
    return new Response(null, {
      status: 200,
      headers: { "X-Hook-Secret": secret || "" },
    });
  }

  if (method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.resource.resource_type === 'task') {
        const taskId = event.resource.gid;
        
        // Se a tarefa foi adicionada (ou mudou de projeto/usuário)
        if (event.action === 'added' || event.action === 'changed') {
          // Buscar detalhes da tarefa no Asana
          const { data: settings } = await supabase.from('settings').select('*');
          const asanaToken = settings?.find(s => s.key === 'asana_token')?.value;
          const configUserId = settings?.find(s => s.key === 'asana_user_id')?.value;

          if (!asanaToken) continue;

          const asanaResp = await fetch(`${ASANA_API_URL}/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${asanaToken}` }
          });
          const taskData = (await asanaResp.json()).data;

          // Verificar se a tarefa está atribuída ao usuário configurado
          if (taskData.assignee?.gid !== configUserId && configUserId) {
            console.log("Tarefa não atribuída ao usuário configurado. Ignorando.");
            continue;
          }

          // Verificar se já existe no banco
          const { data: existingDemand } = await supabase
            .from('project_demands')
            .select('id')
            .eq('asana_task_id', taskId)
            .single();

          const dueDate = taskData.due_on ? taskData.due_on.split('-').reverse().join('/') : 'Sem prazo';
          const workStatus = taskData.completed ? 'Entregue' : 'A Fazer';

          if (existingDemand) {
            // Atualizar existente
            await supabase.from('project_demands').update({
              title: taskData.name,
              description: taskData.notes,
              due_date: dueDate,
              work_status: workStatus,
              completed_quantity: taskData.completed ? 1 : 0
            }).eq('id', existingDemand.id);
          } else {
            // Criar nova demanda se estiver em um projeto conhecido
            const asanaProjectId = taskData.memberships?.[0]?.project?.gid;
            if (asanaProjectId) {
              const { data: project } = await supabase
                .from('projects')
                .select('id')
                .eq('asana_project_id', asanaProjectId)
                .single();

              if (project) {
                await supabase.from('project_demands').insert({
                  project_id: project.id,
                  asana_task_id: taskId,
                  title: taskData.name,
                  type: 'Avulso',
                  amount: 0, // Definir como 0 ou buscar de outro lugar?
                  due_date: dueDate,
                  work_status: workStatus,
                  description: taskData.notes,
                  total_quantity: 1,
                  completed_quantity: taskData.completed ? 1 : 0
                });
              }
            }
          }
        } else if (event.action === 'deleted') {
          // Remover do banco
          await supabase.from('project_demands').delete().eq('asana_task_id', taskId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Erro no webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
