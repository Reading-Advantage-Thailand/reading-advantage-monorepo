#!/bin/bash
set -e

# Create databases for each app
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE ROLE company_identity_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'company_identity_migrator_local';
    CREATE ROLE company_identity_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'company_identity_runtime_local';
    CREATE DATABASE reading_advantage;
    CREATE DATABASE primary_advantage;
    CREATE DATABASE science_advantage;
    CREATE DATABASE codecamp_advantage;
    CREATE DATABASE sales_advantage;
    CREATE DATABASE company_identity OWNER company_identity_migrator;
    GRANT CONNECT ON DATABASE company_identity TO company_identity_runtime;
    CREATE DATABASE science_advantage_test;
EOSQL

echo "✅ Created product databases plus company_identity with separate local runtime and migration roles"
