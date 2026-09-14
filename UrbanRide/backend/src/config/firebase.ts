import 'dotenv/config';

import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

function getFirebasePrivateKey(): string {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY is not configured.');
  }

  return privateKey.replace(/\\n/g, '\n');
}

function initializeFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured.');
  }

  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL is not configured.');
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: getFirebasePrivateKey(),
    }),
  });
}

export const firebaseApp = initializeFirebase();