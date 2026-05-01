import admin from "firebase-admin";

// Check if the app has already been initialized
if (!admin.apps.length) {
  const serviceAccountRaw = process.env.SERVICE_ACCOUNT_KEY;
  if (serviceAccountRaw) {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      if (serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
      } else {
        admin.initializeApp();
      }
    } catch {
      admin.initializeApp();
    }
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

export default db;
