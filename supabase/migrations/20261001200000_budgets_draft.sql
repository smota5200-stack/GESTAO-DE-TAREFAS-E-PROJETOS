-- Orçamentos salvos pelo app (guarda o formulário completo para reabrir)
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS ref TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS draft JSONB,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
