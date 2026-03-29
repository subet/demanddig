-- Add 'archived' to user_saved_signals status
ALTER TABLE public.user_saved_signals
  DROP CONSTRAINT user_saved_signals_status_check;

ALTER TABLE public.user_saved_signals
  ADD CONSTRAINT user_saved_signals_status_check
  CHECK (status IN ('inbox', 'researching', 'building', 'pass', 'archived'));
