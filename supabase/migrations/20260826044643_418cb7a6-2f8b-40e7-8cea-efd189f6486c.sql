INSERT INTO public.account_managers (public_ref, name, email, active)
VALUES
  ('fernando', 'Fernando Muniz', 'fernando.muniz@concierge.seg.br', true),
  ('leonardo', 'Leonardo Araujo', 'leonardo.araujo@concierge.seg.br', true)
ON CONFLICT (public_ref) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, active = true;

INSERT INTO public.app_config (key, value)
VALUES ('internal_report_fallback_email', 'fernando.muniz@concierge.seg.br')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;