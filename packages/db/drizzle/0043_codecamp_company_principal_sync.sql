CREATE OR REPLACE FUNCTION public.sync_codecamp_company_principal(
  p_organization_id uuid,
  p_organization_key text,
  p_company_account_id uuid,
  p_display_name text,
  p_role_key text
)
RETURNS TABLE (
  local_user_id text,
  user_role public.role,
  mapping_role_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  existing_mapping public.company_product_principals%ROWTYPE;
  mapping_found boolean := false;
  resolved_local_user_id text;
  target_local_user_id text := 'codecamp:' || p_company_account_id::text;
  target_user_role public.role;
BEGIN
  IF p_organization_id IS NULL OR p_company_account_id IS NULL THEN
    RAISE EXCEPTION 'Codecamp principal identifiers are required';
  END IF;
  IF p_organization_key IS DISTINCT FROM 'internal-company' THEN
    RAISE EXCEPTION 'Codecamp organization is invalid';
  END IF;
  IF p_display_name IS NULL OR pg_catalog.btrim(p_display_name) = '' THEN
    RAISE EXCEPTION 'Codecamp principal display name is required';
  END IF;
  IF p_role_key IS NULL OR p_role_key NOT IN (
    'ADMIN', 'TEACHER', 'INTERN', 'STUDENT', 'REVOKED'
  ) THEN
    RAISE EXCEPTION 'Codecamp role synchronization value is invalid';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('codecamp:' || p_company_account_id::text, 0)
  );

  SELECT mapping.*
    INTO existing_mapping
    FROM public.company_product_principals mapping
   WHERE mapping.application_key = 'codecamp'
     AND mapping.company_account_id = p_company_account_id
   FOR UPDATE;
  mapping_found := FOUND;

  IF mapping_found THEN
    IF existing_mapping.organization_id <> p_organization_id
      OR existing_mapping.organization_key <> p_organization_key THEN
      RAISE EXCEPTION USING
        ERRCODE = 'RA002',
        MESSAGE =
          'Codecamp organization change requires an explicit mapping manifest';
    END IF;
    resolved_local_user_id := existing_mapping.local_user_id;
  ELSE
    IF p_role_key = 'REVOKED' THEN
      RETURN;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.users candidate
      WHERE candidate.id = target_local_user_id
         OR candidate.username = target_local_user_id
         OR candidate.display_username = target_local_user_id
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'RA002',
        MESSAGE =
          'Codecamp local principal requires an explicit mapping manifest';
    END IF;
    resolved_local_user_id := target_local_user_id;
  END IF;

  IF p_role_key = 'REVOKED' THEN
    UPDATE public.company_product_principals mapping
       SET role_key = 'REVOKED', updated_at = pg_catalog.now()
     WHERE mapping.application_key = 'codecamp'
       AND mapping.company_account_id = p_company_account_id;
    RETURN;
  END IF;

  target_user_role := p_role_key::public.role;
  IF mapping_found THEN
    UPDATE public.users target
       SET role = target_user_role,
           name = p_display_name,
           updated_at = pg_catalog.now()
     WHERE target.id = resolved_local_user_id
       AND target.school_id IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Codecamp mapped user is absent or school-scoped';
    END IF;
    UPDATE public.company_product_principals mapping
       SET role_key = p_role_key, updated_at = pg_catalog.now()
     WHERE mapping.application_key = 'codecamp'
       AND mapping.company_account_id = p_company_account_id;
  ELSE
    INSERT INTO public.users (
      id, username, display_username, name, role, school_id,
      xp, level, cefr_level
    ) VALUES (
      resolved_local_user_id,
      resolved_local_user_id,
      resolved_local_user_id,
      p_display_name,
      target_user_role,
      NULL,
      0,
      1,
      'N/A'
    );
    INSERT INTO public.company_product_principals (
      organization_id,
      organization_key,
      company_account_id,
      application_key,
      local_user_id,
      role_key
    ) VALUES (
      p_organization_id,
      p_organization_key,
      p_company_account_id,
      'codecamp',
      resolved_local_user_id,
      p_role_key
    );
  END IF;

  RETURN QUERY
    SELECT resolved_local_user_id, target_user_role, p_role_key;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.sync_codecamp_company_principal(
  uuid, text, uuid, text, text
) FROM PUBLIC;
