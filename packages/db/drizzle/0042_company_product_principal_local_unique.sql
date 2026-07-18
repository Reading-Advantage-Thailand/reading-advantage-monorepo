DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM company_product_principals
    GROUP BY application_key, local_user_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'company_product_principals contains duplicate application/local principals';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM company_product_principals
    GROUP BY application_key, company_account_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Company account has multiple mappings for one application';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM company_product_principals mapping
    WHERE mapping.application_key = 'sales'
      AND mapping.local_user_id NOT IN (
        mapping.company_account_id::text,
        'sales:' || mapping.company_account_id::text
      )
  ) THEN
    RAISE EXCEPTION 'Sales mapping is not a safe legacy or namespaced principal';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM company_product_principals mapping
    WHERE mapping.application_key = 'sales'
      AND mapping.role_key NOT IN ('SALES_ADMIN', 'SALES_REP', 'REVOKED')
  ) THEN
    RAISE EXCEPTION 'Sales mapping has an unsupported role';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM company_product_principals mapping
    JOIN users target
      ON target.id = 'sales:' || mapping.company_account_id::text
      OR target.username = 'sales:' || mapping.company_account_id::text
      OR target.display_username = 'sales:' || mapping.company_account_id::text
    WHERE mapping.application_key = 'sales'
      AND mapping.local_user_id = mapping.company_account_id::text
  ) THEN
    RAISE EXCEPTION 'Sales app-local principal target already exists';
  END IF;
END $$;--> statement-breakpoint
INSERT INTO users (
  id, username, display_username, name, image, role, school_id,
  xp, level, cefr_level, grade_level, created_at, updated_at
)
SELECT
  'sales:' || mapping.company_account_id::text,
  'sales:' || mapping.company_account_id::text,
  'sales:' || mapping.company_account_id::text,
  source.name,
  source.image,
  CASE mapping.role_key
    WHEN 'SALES_ADMIN' THEN 'SALES_ADMIN'
    WHEN 'SALES_REP' THEN 'SALES_REP'
    ELSE 'INTERN'
  END::role,
  NULL, -- The clone is product-local; source.school_id remains unchanged.
  source.xp,
  source.level,
  source.cefr_level,
  source.grade_level,
  source.created_at,
  now()
FROM company_product_principals mapping
JOIN users source ON source.id = mapping.local_user_id
WHERE mapping.application_key = 'sales'
  AND mapping.local_user_id = mapping.company_account_id::text;--> statement-breakpoint
UPDATE sales_roleplay_attempts attempt
SET user_id = 'sales:' || mapping.company_account_id::text
FROM company_product_principals mapping
WHERE mapping.application_key = 'sales'
  AND mapping.local_user_id = mapping.company_account_id::text
  AND attempt.user_id = mapping.local_user_id;--> statement-breakpoint
UPDATE sales_progress progress
SET user_id = 'sales:' || mapping.company_account_id::text
FROM company_product_principals mapping
WHERE mapping.application_key = 'sales'
  AND mapping.local_user_id = mapping.company_account_id::text
  AND progress.user_id = mapping.local_user_id;--> statement-breakpoint
UPDATE sales_conversations conversation
SET user_id = 'sales:' || mapping.company_account_id::text
FROM company_product_principals mapping
WHERE mapping.application_key = 'sales'
  AND mapping.local_user_id = mapping.company_account_id::text
  AND conversation.user_id = mapping.local_user_id;--> statement-breakpoint
UPDATE company_product_principals
SET local_user_id = 'sales:' || company_account_id::text,
    updated_at = now()
WHERE application_key = 'sales'
  AND local_user_id = company_account_id::text;--> statement-breakpoint
ALTER TABLE company_product_principals
  DROP CONSTRAINT company_product_principals_application_local_unique;--> statement-breakpoint
ALTER TABLE company_product_principals
  ADD CONSTRAINT company_product_principals_application_local_unique
  UNIQUE("application_key","local_user_id");--> statement-breakpoint
ALTER TABLE company_product_principals
  ADD CONSTRAINT company_product_principals_application_account_unique
  UNIQUE("application_key","company_account_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION sync_sales_company_principal(
  p_organization_id uuid,
  p_organization_key text,
  p_company_account_id uuid,
  p_display_name text,
  p_role_key text
)
RETURNS TABLE (
  local_user_id text,
  user_role role,
  mapping_role_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  existing_mapping public.company_product_principals%ROWTYPE;
  target_local_user_id text := 'sales:' || p_company_account_id::text;
  target_user_role public.role;
BEGIN
  IF p_organization_id IS NULL OR p_company_account_id IS NULL THEN
    RAISE EXCEPTION 'Sales principal identifiers are required';
  END IF;
  IF p_organization_key IS DISTINCT FROM 'internal-company' THEN
    RAISE EXCEPTION 'Sales organization is invalid';
  END IF;
  IF p_role_key IS NULL
    OR p_role_key NOT IN ('SALES_ADMIN', 'SALES_REP', 'REVOKED') THEN
    RAISE EXCEPTION 'Sales role synchronization value is invalid';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('sales:' || p_company_account_id::text, 0)
  );

  SELECT mapping.*
    INTO existing_mapping
    FROM public.company_product_principals mapping
   WHERE mapping.application_key = 'sales'
     AND mapping.company_account_id = p_company_account_id
   FOR UPDATE;

  target_user_role := CASE p_role_key
    WHEN 'SALES_ADMIN' THEN 'SALES_ADMIN'::public.role
    WHEN 'SALES_REP' THEN 'SALES_REP'::public.role
    ELSE 'INTERN'::public.role
  END;

  IF FOUND THEN
    IF existing_mapping.organization_id <> p_organization_id
      OR existing_mapping.organization_key <> p_organization_key THEN
      RAISE EXCEPTION USING
        ERRCODE = 'RA001',
        MESSAGE =
          'Sales organization change requires an explicit mapping manifest';
    END IF;
    IF existing_mapping.local_user_id <> target_local_user_id THEN
      RAISE EXCEPTION 'Sales principal mapping local user is invalid';
    END IF;

    UPDATE public.users target
       SET role = target_user_role,
           name = CASE
             WHEN p_role_key = 'REVOKED' THEN target.name
             ELSE p_display_name
           END,
           updated_at = pg_catalog.now()
     WHERE target.id = target_local_user_id
       AND target.school_id IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sales product-local user is absent or school-scoped';
    END IF;

    UPDATE public.company_product_principals mapping
       SET role_key = p_role_key,
           updated_at = pg_catalog.now()
     WHERE mapping.application_key = 'sales'
       AND mapping.company_account_id = p_company_account_id;
  ELSE
    IF p_role_key = 'REVOKED' THEN
      RETURN;
    END IF;

    INSERT INTO public.users (
      id, username, display_username, name, role, school_id,
      xp, level, cefr_level
    ) VALUES (
      target_local_user_id,
      target_local_user_id,
      target_local_user_id,
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
      'sales',
      target_local_user_id,
      p_role_key
    );
  END IF;

  RETURN QUERY SELECT target_local_user_id, target_user_role, p_role_key;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION sync_sales_company_principal(uuid, text, uuid, text, text)
  FROM PUBLIC;
