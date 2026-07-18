\set ON_ERROR_STOP on

INSERT INTO sales_modules (id, slug, title, description, phase, "order")
  VALUES ('00000000-0000-0000-0000-000000000051', '__runtime_probe__', 'Probe', 'Probe', 'Foundations', 1)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_lessons (id, module_id, title, type, content, "order", review_status)
  VALUES ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000051', 'Probe', 'roleplay', 'Probe', 1, 'approved')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_rubrics (id, name, criteria_json, review_status)
  VALUES ('00000000-0000-0000-0000-000000000053', 'Probe', '[]'::jsonb, 'approved')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_roleplay_scenarios (id, lesson_id, persona_name, persona_role, situation, objective, rubric_id, "order")
  VALUES ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000052', 'Probe', 'Probe', 'Probe', 'Probe', '00000000-0000-0000-0000-000000000053', 1)
  ON CONFLICT (id) DO NOTHING;
