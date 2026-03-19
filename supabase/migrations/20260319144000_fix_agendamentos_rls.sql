-- Enforce RLS on agendamentos to ensure users only see their own tasks
-- unless they are admins.

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own agendamentos" ON public.agendamentos;
CREATE POLICY "Users can manage own agendamentos"
ON public.agendamentos
FOR ALL
TO authenticated
USING (
  auth.uid() = usuario_id OR 
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = usuario_id OR 
  public.has_role(auth.uid(), 'admin')
);

-- Ensure there isn't a broad "all authenticated" policy blocking this logic
-- (though usually multiple policies are ORed in PostgreSQL)
