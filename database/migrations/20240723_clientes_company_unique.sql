-- Drop the existing global unique constraint that blocks multiple companies from
-- sharing a CPF/email if the company_id differs, then replace it with a
-- composite unique index per company and CPF so each company continues to
-- enforce uniqueness within itself.

ALTER TABLE IF EXISTS clientes DROP CONSTRAINT IF EXISTS clientes_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_company_cpf_idx
  ON clientes (company_id, cpf);

