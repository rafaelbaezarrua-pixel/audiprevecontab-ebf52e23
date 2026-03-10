-- ============================================
-- FIX: Remove duplicate triggers on public.empresas
-- ============================================

-- Drop all known triggers that fire on the empresas table related to notifications
DROP TRIGGER IF EXISTS on_empresa_event ON public.empresas;
DROP TRIGGER IF EXISTS on_empresa_inserted ON public.empresas;
DROP TRIGGER IF EXISTS on_empresa_created ON public.empresas;
DROP TRIGGER IF EXISTS trg_empresa_notification ON public.empresas;

-- Recreate the single, canonical trigger
CREATE TRIGGER on_empresa_event
    AFTER INSERT OR UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.handle_empresa_notification();
