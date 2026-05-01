import { Storage } from '@google-cloud/storage';

const serviceAccountKeyRaw = process.env.SERVICE_ACCOUNT_KEY;
let storage: Storage;

if (serviceAccountKeyRaw) {
  try {
    const serviceAccountKeyJSON = JSON.parse(serviceAccountKeyRaw);
    if (serviceAccountKeyJSON.project_id) {
      storage = new Storage({
        projectId: 'reading-advantage',
        credentials: serviceAccountKeyJSON,
      });
    } else {
      storage = new Storage({ projectId: 'reading-advantage' });
    }
  } catch {
    storage = new Storage({ projectId: 'reading-advantage' });
  }
} else {
  storage = new Storage({ projectId: 'reading-advantage' });
}

export default storage;
