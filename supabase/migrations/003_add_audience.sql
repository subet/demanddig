ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS audience text
  CHECK (audience IN ('technical', 'non-technical', 'mixed'));
