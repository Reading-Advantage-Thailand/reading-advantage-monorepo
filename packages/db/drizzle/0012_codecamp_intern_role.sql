-- Migration 0012: Add INTERN role to the role enum
-- See ADR 0003: docs/adr/0003-add-intern-role.md
ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN';
