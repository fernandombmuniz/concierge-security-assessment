-- Bloco 4: evidência de ciência do aviso de privacidade.
-- Seguro para executar em um banco que já recebeu as colunas manualmente.

alter table public.assessments
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_acknowledged_at timestamptz;

-- Remove a estrutura temporária criada durante o teste de rate limiting.
-- A versão final do Bloco 4 não depende dessa tabela.
drop table if exists public.assessment_create_rate_limits;
