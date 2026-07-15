import postgres from "postgres";

const companyIdentitySql = postgres(process.env.COMPANY_AUTH_DATABASE_URL!);

void companyIdentitySql;
