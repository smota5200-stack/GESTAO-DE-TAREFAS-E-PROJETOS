-- Notas Fiscais (NFS-e São Paulo / Nota do Milhão)
-- Seguro para rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.service_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT,
  invoice_number TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  issue_date TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nota pode ser importada antes de ser vinculada a um cliente
ALTER TABLE public.service_invoices ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.service_invoices
  ADD COLUMN IF NOT EXISTS verification_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iss_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taker_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS taker_doc TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS taker_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_ccm TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'emitida',
  ADD COLUMN IF NOT EXISTS file_path TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS xml_path TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nfse_url TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS service_invoices_issue_date_idx ON public.service_invoices (issue_date DESC);
CREATE INDEX IF NOT EXISTS service_invoices_client_idx ON public.service_invoices (client_id);

ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_invoices' AND policyname = 'Allow all on service_invoices') THEN
    CREATE POLICY "Allow all on service_invoices" ON public.service_invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Pasta (bucket) privada para os PDFs/XMLs — acessada por links temporários
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-fiscais', 'notas-fiscais', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'notas-fiscais all') THEN
    CREATE POLICY "notas-fiscais all" ON storage.objects FOR ALL
      USING (bucket_id = 'notas-fiscais') WITH CHECK (bucket_id = 'notas-fiscais');
  END IF;
END $$;
