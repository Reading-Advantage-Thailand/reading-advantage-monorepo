const admin = require('firebase-admin');
const { updateCefrLevel, updateRaLevel } = require('./recalculateLevel');

jest.mock('firebase-admin', () => {
  const mockUpdate = jest.fn();
  const mockDoc = jest.fn().mockReturnValue({
    update: mockUpdate,
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: jest.fn().mockReturnValue({
        cefrLevel: 5,
        raLevel: 5,
      }),
    }),
  });
  const mockCollection = jest.fn().mockReturnValue({
    doc: mockDoc,
    get: jest.fn().mockResolvedValue({
      forEach: jest.fn(),
    }),
  });

  return {
    initializeApp: jest.fn(),
    firestore: jest.fn().mockImplementation(() => ({
      collection: mockCollection,
    })),
    credential: {
      cert: jest.fn(),
    },
  };
});

describe('recalculateLevel', () => {
  it('updates the cefrLevel of a document', async () => {
    await updateCefrLevel('A0-', { id: 'doc1' });

    expect(admin.firestore().collection).toHaveBeenCalledWith('articles');
    expect(admin.firestore().collection().doc).toHaveBeenCalledWith('doc1');
    expect(admin.firestore().collection().doc().update).toHaveBeenCalledWith({ cefrLevel: 'A0-' });
  });

  it('updates the raLevel of a document', async () => {
    await updateRaLevel(0, { id: 'doc1' });

    expect(admin.firestore().collection).toHaveBeenCalledWith('articles');
    expect(admin.firestore().collection().doc).toHaveBeenCalledWith('doc1');
    expect(admin.firestore().collection().doc().update).toHaveBeenCalledWith({ raLevel: 0 });
  });
});