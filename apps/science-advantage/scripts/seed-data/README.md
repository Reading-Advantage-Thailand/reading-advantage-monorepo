# Seed Data Directory

This directory contains curriculum content organized into JSON files for scalable seeding.

## Directory Structure

```
seed-data/
├── standards/           # Learning standards by framework and grade
├── lessons/            # Lesson content by framework, grade, and unit
├── questions/          # Question bank (future - Story #92)
├── curriculum-units/   # Curriculum unit definitions
└── README.md          # This file
```

## File Naming Conventions

- **Standards**: `{framework}-grade-{gradeLevel}.json`
  - Example: `thai-grade-3.json`, `ngss-grade-8.json`

- **Lessons**: `{framework}-g{gradeLevel}-unit-{unitNumber}.json`
  - Example: `thai-g3-unit-1.json`, `ngss-g8-unit-3.json`

- **Questions**: `{lessonId}-questions.json` (future implementation)
  - Example: `g3-being-a-scientist-questions.json`

- **Curriculum Units**: `{framework}-grade-{gradeLevel}.json`
  - Example: `thai-grade-3.json`, `ngss-grade-8.json`

## JSON File Formats

### Standards File Format

```json
{
  "framework": "THAI",
  "gradeLevel": 3,
  "standards": [
    {
      "code": "Sc1.1-G3",
      "description": "Identify and describe characteristics that distinguish living from non-living things"
    }
  ]
}
```

**Required fields:**
- `framework` (string): StandardsAlignment enum value (THAI, NGSS, etc.)
- `gradeLevel` (number): 1-12 for Thai system, 1-12 for others
- `standards` (array): Array of standard objects

**Standard object fields:**
- `code` (string): Unique standard code
- `description` (string): Standard description

### Lessons File Format

```json
{
  "framework": "THAI",
  "gradeLevel": 3,
  "unit": 1,
  "lessons": [
    {
      "id": "g3-being-a-scientist",
      "title": "Being a Scientist / การเป็นนักวิทยาศาสตร์",
      "description": "What do scientists do? Learn about observing, questioning, predicting, testing, and concluding.",
      "content": "Full lesson content in markdown...",
      "order": 1,
      "standards": ["Sc8.1-G3", "Sc8.2-G3"]
    }
  ]
}
```

**Required fields:**
- `framework` (string): StandardsAlignment enum value
- `gradeLevel` (number): Grade level
- `unit` (number): Unit number within grade
- `lessons` (array): Array of lesson objects

**Lesson object fields:**
- `id` (string): Unique lesson identifier
- `title` (string): Lesson title (can include Thai/English)
- `description` (string): Brief description
- `content` (string): Full lesson content (markdown supported)
- `order` (number): Order within unit (1-based)
- `standards` (array): Array of standard codes this lesson addresses

### Curriculum Units File Format

```json
{
  "framework": "THAI",
  "gradeLevel": 3,
  "units": [
    {
      "id": "thai-g3-unit-1",
      "title": "Unit 1: Introduction to Science & Living Things / หน่วยที่ 1: บทนำสู่วิทยาศาสตร์และสิ่งมีชีวิต",
      "description": "Explore what science is and learn about living things and their characteristics.",
      "order": 1,
      "lessonIds": [
        "g3-being-a-scientist",
        "g3-science-safety-tools",
        "g3-making-observations"
      ]
    }
  ]
}
```

**Required fields:**
- `framework` (string): StandardsAlignment enum value
- `gradeLevel` (number): Grade level
- `units` (array): Array of curriculum unit objects

**Unit object fields:**
- `id` (string): Unique unit identifier
- `title` (string): Unit title
- `description` (string): Unit description
- `order` (number): Order within grade (1-based)
- `lessonIds` (array): Array of lesson IDs in this unit (ordered)

### Questions File Format (Future - Story #92)

Format to be defined when question schema is implemented.

## Usage

### Basic Seeding

Run all seed data:
```bash
npm run db:seed
```

### Selective Seeding

Seed specific framework:
```bash
npx tsx prisma/seed.ts --framework=THAI
```

Seed specific grade:
```bash
npx tsx prisma/seed.ts --grade=3
```

Seed specific framework and grade:
```bash
npx tsx prisma/seed.ts --framework=THAI --grade=3
```

Skip demo data:
```bash
npx tsx prisma/seed.ts --skip-demo
```

## Adding New Content

### Adding a New Grade

1. Create standards file: `seed-data/standards/{framework}-grade-{N}.json`
2. Create lessons file(s): `seed-data/lessons/{framework}-g{N}-unit-{M}.json`
3. Create curriculum units file: `seed-data/curriculum-units/{framework}-grade-{N}.json`
4. Run seed to validate: `npm run db:seed`

### Adding a New Unit

1. Create lessons file: `seed-data/lessons/{framework}-g{N}-unit-{M}.json`
2. Update curriculum units file to include the new unit
3. Run seed to validate: `npm run db:seed`

### Adding New Lessons

1. Edit existing lessons file or create new unit file
2. Ensure `order` values are sequential
3. Reference existing standard codes in `standards` array
4. Run seed to validate: `npm run db:seed`

## Validation

All JSON files are validated during seeding using `seed-functions/validate-json.ts`.

Validation checks:
- Required fields are present
- Data types are correct
- Arrays contain expected object structures
- Framework values are valid

If validation fails, the seed process stops with an error message.

## Migration

When database schema changes affect seed data, use the migration script:

```bash
# Dry run (preview changes)
npm run migrate:seed-data -- --type=lessons --migration=add-slug-field --dry-run

# Apply migration
npm run migrate:seed-data -- --type=lessons --migration=add-slug-field

# Migrate all types
npm run migrate:seed-data -- --type=all --migration=add-metadata
```

Backups are created automatically before modifications.

## Best Practices

1. **Idempotency**: All seed operations use `upsert`, so running seed multiple times is safe
2. **Validation**: Always validate JSON structure before committing
3. **Standards First**: Seed standards before lessons that reference them
4. **Lesson IDs**: Use descriptive, unique IDs with grade prefix (e.g., `g3-topic-name`)
5. **Bilingual Content**: Include both Thai and English in titles where appropriate
6. **Content Markdown**: Use markdown formatting in lesson content for rich formatting
7. **Order Values**: Keep order values sequential and 1-based
8. **Backups**: Keep backup files when migrating schema changes

## Troubleshooting

### Validation Errors

If you see validation errors:
1. Check the error message for the specific field/issue
2. Verify JSON syntax is valid (use a JSON validator)
3. Ensure all required fields are present
4. Check data types match the schema

### Duplicate Keys

If you see "Unique constraint failed" errors:
1. Check for duplicate standard codes
2. Check for duplicate lesson IDs
3. Ensure `upsert` logic is correct in seed functions

### Missing Standards

If lessons reference standards that don't exist:
1. Ensure standards are seeded before lessons
2. Verify standard codes match exactly (case-sensitive)
3. Check that framework values align

## Development Workflow

1. **Add Content**: Edit JSON files in appropriate directory
2. **Validate**: Run `npm run db:seed` to test
3. **Verify**: Check database to ensure data loaded correctly
4. **Commit**: Commit JSON files to version control
5. **Deploy**: Seed scripts run automatically in CI/CD

## Related Files

- `prisma/seed.ts` - Main orchestration script
- `prisma/seed-functions/` - Modular seed functions
  - `seed-standards.ts`
  - `seed-lessons.ts`
  - `seed-questions.ts`
  - `seed-curriculum-units.ts`
  - `seed-demo-data.ts`
  - `validate-json.ts`
- `scripts/migrate-seed-data.ts` - Migration helper
