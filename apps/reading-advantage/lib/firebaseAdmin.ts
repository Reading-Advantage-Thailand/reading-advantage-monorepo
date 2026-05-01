import * as admin from "firebase-admin"
import type { ServiceAccount } from "firebase-admin"

let _app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (_app) return _app;

  if (admin.apps.length > 0) {
    _app = admin.app();
    return _app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    try {
      const cert: ServiceAccount = { projectId, clientEmail, privateKey };
      _app = admin.initializeApp({ credential: admin.credential.cert(cert) });
      return _app;
    } catch {
      // Fall through to default init
    }
  }

  _app = admin.initializeApp();
  return _app;
}

// Backward-compatible lazy export
export const firebaseAdmin = new Proxy({} as admin.app.App, {
  get(_target, prop) {
    return (getFirebaseAdmin() as any)[prop];
  },
});
