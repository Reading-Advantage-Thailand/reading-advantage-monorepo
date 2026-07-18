DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "company_product_principals"
    GROUP BY "application_key", "local_user_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'company_product_principals contains duplicate application/local principals';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "company_product_principals" DROP CONSTRAINT "company_product_principals_application_local_unique";--> statement-breakpoint
ALTER TABLE "company_product_principals" ADD CONSTRAINT "company_product_principals_application_local_unique" UNIQUE("application_key","local_user_id");
