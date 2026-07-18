\set ON_ERROR_STOP on

DELETE FROM sales_modules
  WHERE id = '00000000-0000-0000-0000-000000000051';
DELETE FROM sales_rubrics
  WHERE id = '00000000-0000-0000-0000-000000000053';
DELETE FROM users
  WHERE id = '__sales_runtime_concurrency_user__';
