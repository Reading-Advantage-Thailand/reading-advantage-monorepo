CREATE FUNCTION public.company_identity_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'company_identity_audit_events is immutable';
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_identity_audit_events_immutable_trigger
BEFORE UPDATE OR DELETE OR TRUNCATE
ON public.company_identity_audit_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.company_identity_reject_audit_mutation();
