#!/bin/bash
set -e

# Create databases for each app
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE reading_advantage;
    CREATE DATABASE primary_advantage;
    CREATE DATABASE science_advantage;
    CREATE DATABASE codecamp_advantage;
    CREATE DATABASE science_advantage_test;
EOSQL

echo "✅ Created databases: reading_advantage, primary_advantage, science_advantage, codecamp_advantage, science_advantage_test"
