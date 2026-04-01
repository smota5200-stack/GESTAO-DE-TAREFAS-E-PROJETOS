-- FreelanceOS — Supabase Schema
-- Execute este SQL no SQL Editor do Supabase

-- Tabela de Clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  total_spent NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Projetos
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'Média' CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Concluída')),
  status TEXT DEFAULT 'A Fazer' CHECK (status IN ('A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído')),
  progress INTEGER DEFAULT 0,
  due_date TEXT DEFAULT '',
  comments INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  drive_link TEXT DEFAULT '',
  external_system_link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Preços
CREATE TABLE price_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Avulso', 'Pacote')),
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Criação' CHECK (status IN ('Criação', 'Recriação')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Demandas de Projeto
CREATE TABLE project_demands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  price_item_id UUID REFERENCES price_table(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Avulso', 'Pacote')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date TEXT DEFAULT '',
  work_status TEXT DEFAULT 'A Fazer' CHECK (work_status IN ('A Fazer', 'Entregue')),
  payment_status TEXT DEFAULT 'Pendente' CHECK (payment_status IN ('Pendente', 'A Pagar', 'Pago')),
  description TEXT DEFAULT '',
  drive_link TEXT DEFAULT '',
  external_system_link TEXT DEFAULT '',
  total_quantity INTEGER DEFAULT 1,
  completed_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sub-demandas (itens de pacote)
CREATE TABLE sub_demands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id UUID NOT NULL REFERENCES project_demands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  work_status TEXT DEFAULT 'A Fazer' CHECK (work_status IN ('A Fazer', 'Entregue')),
  drive_link TEXT DEFAULT '',
  external_system_link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Desabilitar RLS para simplificar (habilitar depois se necessário)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_demands ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (acesso total via anon key)
CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on price_table" ON price_table FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_demands" ON project_demands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sub_demands" ON sub_demands FOR ALL USING (true) WITH CHECK (true);

-- Notificações de pagamento (cliente informa que pagou)
CREATE TABLE payment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id UUID NOT NULL REFERENCES project_demands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  demand_title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on payment_notifications" ON payment_notifications FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- MIGRAÇÃO: CPF/CNPJ em Clientes
-- =============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT DEFAULT '';

-- =============================================
-- Tabela de Notas (Sticky Notes)
-- =============================================
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple', 'orange')),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Tabela de Senhas
-- =============================================
CREATE TABLE passwords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  username TEXT DEFAULT '',
  password TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on passwords" ON passwords FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Tabela de Notas Fiscais de Serviço (vinculada a clientes)
-- =============================================
CREATE TABLE service_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  issue_date TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on service_invoices" ON service_invoices FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- MIGRAÇÃO: Link de Contrato em Clientes
-- =============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_url TEXT DEFAULT '';

-- =============================================
-- MIGRAÇÃO: Integração Asana
-- =============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS asana_project_id TEXT DEFAULT '';
ALTER TABLE project_demands ADD COLUMN IF NOT EXISTS asana_task_id TEXT DEFAULT '';

-- Tabela de Configurações (para Tokens de API)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
