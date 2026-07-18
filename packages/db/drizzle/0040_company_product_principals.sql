CREATE TABLE "company_product_principals" (
	"organization_id" uuid NOT NULL,
	"organization_key" text NOT NULL,
	"company_account_id" uuid NOT NULL,
	"application_key" text NOT NULL,
	"local_user_id" text NOT NULL,
	"role_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_product_principals_organization_id_company_account_id_application_key_pk" PRIMARY KEY("organization_id","company_account_id","application_key"),
	CONSTRAINT "company_product_principals_application_local_unique" UNIQUE("organization_id","application_key","local_user_id"),
	CONSTRAINT "company_product_principals_local_user_id_users_id_fk" FOREIGN KEY ("local_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "company_product_principals_organization_key_check" CHECK ("organization_key" ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "company_product_principals_application_key_check" CHECK ("application_key" ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "company_product_principals_role_key_check" CHECK ("role_key" ~ '^[A-Z][A-Z0-9_]{0,63}$')
);
