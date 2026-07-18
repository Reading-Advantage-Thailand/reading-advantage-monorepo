\set ON_ERROR_STOP on

DO $$
DECLARE
  constraint_columns text[];
  account_constraint_columns text[];
  function_security_definer boolean;
  function_search_path text[];
BEGIN
  SELECT array_agg(attribute.attname ORDER BY key.ordinality)
    INTO constraint_columns
    FROM pg_constraint constraint_record
    JOIN pg_class relation ON relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace_record ON namespace_record.oid = relation.relnamespace
    JOIN LATERAL unnest(constraint_record.conkey)
      WITH ORDINALITY AS key(attribute_number, ordinality) ON true
    JOIN pg_attribute attribute
      ON attribute.attrelid = relation.oid
     AND attribute.attnum = key.attribute_number
   WHERE namespace_record.nspname = 'public'
     AND relation.relname = 'company_product_principals'
     AND constraint_record.conname =
       'company_product_principals_application_local_unique'
     AND constraint_record.contype = 'u'
   GROUP BY constraint_record.oid;

  IF constraint_columns IS DISTINCT FROM ARRAY['application_key', 'local_user_id']::text[] THEN
    RAISE EXCEPTION '0042 exact application/local unique constraint is absent';
  END IF;

  SELECT array_agg(attribute.attname ORDER BY key.ordinality)
    INTO account_constraint_columns
    FROM pg_constraint constraint_record
    JOIN pg_class relation ON relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace_record ON namespace_record.oid = relation.relnamespace
    JOIN LATERAL unnest(constraint_record.conkey)
      WITH ORDINALITY AS key(attribute_number, ordinality) ON true
    JOIN pg_attribute attribute
      ON attribute.attrelid = relation.oid
     AND attribute.attnum = key.attribute_number
   WHERE namespace_record.nspname = 'public'
     AND relation.relname = 'company_product_principals'
     AND constraint_record.conname =
       'company_product_principals_application_account_unique'
     AND constraint_record.contype = 'u'
   GROUP BY constraint_record.oid;
  IF account_constraint_columns IS DISTINCT FROM
    ARRAY['application_key', 'company_account_id']::text[] THEN
    RAISE EXCEPTION '0042 exact application/account unique constraint is absent';
  END IF;

  SELECT procedure_record.prosecdef, procedure_record.proconfig
    INTO function_security_definer, function_search_path
    FROM pg_proc procedure_record
   WHERE procedure_record.oid =
     'sync_sales_company_principal(uuid,text,uuid,text,text)'::regprocedure;
  IF function_security_definer IS DISTINCT FROM true
    OR function_search_path IS DISTINCT FROM ARRAY['search_path=pg_catalog']::text[] THEN
    RAISE EXCEPTION '0042 constrained Sales sync function is absent or unsafe';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM company_product_principals
    WHERE application_key = 'sales'
      AND local_user_id <> 'sales:' || company_account_id::text
  ) THEN
    RAISE EXCEPTION '0042 Sales app-local principal split is incomplete';
  END IF;
END
$$;
