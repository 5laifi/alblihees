-- ============================================
-- DHARI PORTFOLIO - INVOICES & QUOTATIONS
-- Run this SQL in your Supabase SQL Editor
-- ============================================
--
-- These tables hold private business data (clients, prices, bank details).
-- Row Level Security is enabled with NO public policies, so the public anon
-- key cannot read or write them. The admin API reaches them with the service
-- role key, which bypasses RLS:
--
--   1. Supabase dashboard -> Project Settings -> API -> service_role key
--   2. Add it as SUPABASE_SERVICE_ROLE_KEY in .env.local and in Vercel
--
-- Never expose the service role key to the browser (no NEXT_PUBLIC_ prefix).

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_type TEXT NOT NULL DEFAULT 'quotation' CHECK (document_type IN ('invoice', 'quotation')),
    doc_number INT NOT NULL DEFAULT 1,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT '',
    project_name TEXT NOT NULL DEFAULT '',
    client_name TEXT NOT NULL DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    currency TEXT NOT NULL DEFAULT 'KWD',
    notes TEXT NOT NULL DEFAULT '',
    template TEXT NOT NULL DEFAULT 'stage',
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    amount_paid NUMERIC NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices (created_at DESC);
-- A quotation and the invoice made from it may share a number; two documents of the same type may not.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_type_number_key ON invoices (document_type, doc_number);

-- Single-row settings (business details, bank account, terms, QR link)
CREATE TABLE IF NOT EXISTS invoice_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies: only the service role key can access these tables.
