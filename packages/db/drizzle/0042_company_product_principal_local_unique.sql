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
    WHERE application_key = 'sales'
    GROUP BY company_account_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Sales company account has multiple product mappings';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM company_product_principals mapping
    JOIN users target ON target.id = 'sales:' || mapping.company_account_id::text
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
  NULL,
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
  UNIQUE("application_key","local_user_id");
