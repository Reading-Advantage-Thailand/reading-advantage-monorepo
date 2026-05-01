import {
  validateContentPack,
  validateVocabularyItem,
  validateContentPackMetadata,
  detectPackFormat,
  CONTENT_PACK_REQUIRED_FIELDS,
  CONTENT_PACK_OPTIONAL_FIELDS,
  VOCABULARY_ITEM_REQUIRED_FIELDS,
  type ContentPackMetadata,
  type VocabularyItem,
  type ContentPackValidationError,
  type PackFormat,
} from './contentPackSchema'

describe('contentPackSchema', () => {
  describe('VOCABULARY_ITEM_REQUIRED_FIELDS', () => {
    it('defines term and translation as required', () => {
      expect(VOCABULARY_ITEM_REQUIRED_FIELDS).toContain('term')
      expect(VOCABULARY_ITEM_REQUIRED_FIELDS).toContain('translation')
    })
  })

  describe('CONTENT_PACK_REQUIRED_FIELDS', () => {
    it('defines required metadata fields', () => {
      expect(CONTENT_PACK_REQUIRED_FIELDS).toContain('packId')
      expect(CONTENT_PACK_REQUIRED_FIELDS).toContain('version')
      expect(CONTENT_PACK_REQUIRED_FIELDS).toContain('items')
    })
  })

  describe('CONTENT_PACK_OPTIONAL_FIELDS', () => {
    it('defines optional metadata fields', () => {
      expect(CONTENT_PACK_OPTIONAL_FIELDS).toContain('name')
      expect(CONTENT_PACK_OPTIONAL_FIELDS).toContain('description')
      expect(CONTENT_PACK_OPTIONAL_FIELDS).toContain('gameType')
      expect(CONTENT_PACK_OPTIONAL_FIELDS).toContain('difficulty')
      expect(CONTENT_PACK_OPTIONAL_FIELDS).toContain('active')
    })
  })

  describe('detectPackFormat', () => {
    it('returns "v1" for array format (legacy)', () => {
      const legacyPack = [{ term: 'hello', translation: 'world' }]
      expect(detectPackFormat(legacyPack)).toBe('v1-legacy')
    })

    it('returns "v2" for object format with items array', () => {
      const v2Pack = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [{ term: 'hello', translation: 'world' }],
      }
      expect(detectPackFormat(v2Pack)).toBe('v2')
    })

    it('returns null for unrecognized format', () => {
      expect(detectPackFormat(null)).toBeNull()
      expect(detectPackFormat(undefined)).toBeNull()
      expect(detectPackFormat('string')).toBeNull()
      expect(detectPackFormat(123)).toBeNull()
    })
  })

  describe('validateVocabularyItem', () => {
    it('returns no errors for valid vocabulary item', () => {
      const item: VocabularyItem = { term: 'hello', translation: 'world' }
      const errors = validateVocabularyItem(item)
      expect(errors).toHaveLength(0)
    })

    it('returns error when term is missing', () => {
      const item = { translation: 'world' } as VocabularyItem
      const errors = validateVocabularyItem(item)
      expect(errors).toContain('Vocabulary item missing required field: term')
    })

    it('returns error when translation is missing', () => {
      const item = { term: 'hello' } as VocabularyItem
      const errors = validateVocabularyItem(item)
      expect(errors).toContain('Vocabulary item missing required field: translation')
    })

    it('returns error when term is not a string', () => {
      const item = { term: 123, translation: 'world' } as VocabularyItem
      const errors = validateVocabularyItem(item)
      expect(errors).toContain('Vocabulary item field "term" must be a string, got number')
    })

    it('returns error when translation is not a string', () => {
      const item = { term: 'hello', translation: 456 } as VocabularyItem
      const errors = validateVocabularyItem(item)
      expect(errors).toContain('Vocabulary item field "translation" must be a string, got number')
    })

    it('returns error when term is empty string', () => {
      const item = { term: '', translation: 'world' }
      const errors = validateVocabularyItem(item)
      expect(errors).toContain('Vocabulary item field "term" cannot be empty')
    })

    it('returns error when translation is empty string', () => {
      const item = { term: 'hello', translation: '' }
      const errors = validateVocabularyItem(item)
      expect(errors).toContain('Vocabulary item field "translation" cannot be empty')
    })

    it('returns multiple errors for multiple issues', () => {
      const item = { term: '', translation: 123 } as VocabularyItem
      const errors = validateVocabularyItem(item)
      expect(errors.length).toBeGreaterThan(1)
    })

    it('accepts vocabulary item with id field', () => {
      const item = { term: 'hello', translation: 'world', id: '1' }
      const errors = validateVocabularyItem(item)
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateContentPackMetadata', () => {
    it('returns no errors for valid v2 pack metadata', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack-v1',
        version: '1.0.0',
        items: [{ term: 'hello', translation: 'world' }],
        name: 'Test Pack',
        description: 'A test content pack',
        gameType: 'vocabulary',
        active: true,
      }
      const errors = validateContentPackMetadata(pack)
      expect(errors).toHaveLength(0)
    })

    it('returns error when packId is missing', () => {
      const pack = {
        version: '1.0.0',
        items: [],
      } as ContentPackMetadata
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack missing required field: packId')
    })

    it('returns error when version is missing', () => {
      const pack = {
        packId: 'test-pack',
        items: [],
      } as ContentPackMetadata
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack missing required field: version')
    })

    it('returns error when items is missing', () => {
      const pack = {
        packId: 'test-pack',
        version: '1.0.0',
      } as ContentPackMetadata
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack missing required field: items')
    })

    it('returns error when items is not an array', () => {
      const pack = {
        packId: 'test-pack',
        version: '1.0.0',
        items: 'not-an-array',
      } as ContentPackMetadata
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack field "items" must be an array, got string')
    })

    it('returns error when items array is empty', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [],
      }
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack items array cannot be empty')
    })

    it('returns error for invalid version format', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: 'not-semver',
        items: [{ term: 'hello', translation: 'world' }],
      }
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack version must be valid semver (e.g., 1.0.0), got "not-semver"')
    })

    it('returns error when difficulty is invalid', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [{ term: 'hello', translation: 'world' }],
        difficulty: 'impossible' as any,
      }
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack difficulty must be one of: easy, normal, hard, extreme')
    })

    it('returns error when gameType is invalid', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [{ term: 'hello', translation: 'world' }],
        gameType: 'puzzle' as any,
      }
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack gameType must be one of: vocabulary, sentence')
    })

    it('returns error for unknown fields', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [{ term: 'hello', translation: 'world' }],
        unknownField: 'should error',
      } as any
      const errors = validateContentPackMetadata(pack)
      expect(errors).toContain('Content pack has unknown field: unknownField')
    })

    it('accepts v2 pack without optional fields', () => {
      const pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [{ term: 'hello', translation: 'world' }],
      }
      const errors = validateContentPackMetadata(pack)
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateContentPack', () => {
    it('validates and converts legacy v1 format to v2', () => {
      const legacyPack = [
        { term: 'hello', translation: 'world' },
        { term: 'foo', translation: 'bar' },
        { term: 'baz', translation: 'qux' },
        { term: 'quux', translation: 'corge' },
        { term: 'grault', translation: 'garply' },
      ]
      const result = validateContentPack(legacyPack)
      expect(result.isValid).toBe(true)
      expect(result.format).toBe('v1-legacy')
      expect(result.metadata!.packId).toMatch(/^legacy-pack-/)
      expect(result.metadata!.items).toEqual(legacyPack)
    })

    it('validates v2 format directly', () => {
      const v2Pack: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [
          { term: 'hello', translation: 'world' },
          { term: 'foo', translation: 'bar' },
          { term: 'baz', translation: 'qux' },
          { term: 'quux', translation: 'corge' },
          { term: 'grault', translation: 'garply' },
        ],
      }
      const result = validateContentPack(v2Pack)
      expect(result.isValid).toBe(true)
      expect(result.format).toBe('v2')
      expect(result.errors).toHaveLength(0)
    })

    it('returns errors for invalid legacy pack with bad items', () => {
      const invalidPack = [{ term: '', translation: '' }]
      const result = validateContentPack(invalidPack)
      expect(result.isValid).toBe(false)
      expect(result.format).toBe('v1-legacy')
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('returns errors for invalid v2 pack', () => {
      const invalidPack = {
        packId: 'test-pack',
        version: 'invalid',
        items: [],
      }
      const result = validateContentPack(invalidPack)
      expect(result.isValid).toBe(false)
      expect(result.format).toBe('v2')
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('returns null for unrecognized format', () => {
      const result = validateContentPack(null)
      expect(result.isValid).toBe(false)
      expect(result.format).toBeNull()
      expect(result.errors).toContain('Unrecognized content pack format: null')
    })

    it('provides actionable error messages', () => {
      const invalidPack: ContentPackMetadata = {
        packId: '',
        version: '1.0.0',
        items: [],
      }
      const result = validateContentPack(invalidPack)
      expect(result.isValid).toBe(false)
      const actionableErrors = result.errors.filter(
        (e) => e.includes('Fix:') || e.includes('Action:')
      )
      expect(actionableErrors.length).toBeGreaterThan(0)
    })

    it('detects items with missing term', () => {
      const packWithBadItem = [
        { translation: 'world' },
      ]
      const result = validateContentPack(packWithBadItem)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('term'))).toBe(true)
    })

    it('validates minimum items requirement', () => {
      const packWithFewItems: ContentPackMetadata = {
        packId: 'test-pack',
        version: '1.0.0',
        items: [
          { term: 'hello', translation: 'world' },
        ],
      }
      const result = validateContentPack(packWithFewItems)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('at least 5 items'))).toBe(true)
    })
  })

  describe('ContentPackValidationError type', () => {
    it('has error code, message, field, and actionable fields', () => {
      const error: ContentPackValidationError = {
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Content pack missing required field: packId',
        field: 'packId',
        value: undefined,
        fix: 'Add a unique packId to your content pack',
      }
      expect(error.code).toBe('MISSING_REQUIRED_FIELD')
      expect(error.message).toBe('Content pack missing required field: packId')
      expect(error.field).toBe('packId')
      expect(error.fix).toContain('Add')
    })
  })

  describe('PackFormat type', () => {
    it('defines valid format types', () => {
      const formats: PackFormat[] = ['v1-legacy', 'v2']
      expect(formats).toContain('v1-legacy')
      expect(formats).toContain('v2')
    })
  })
})
