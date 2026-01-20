import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
// In production (Cloud Functions), it uses default credentials automatically.
// For local dev, we might need service account or rely on GOOGLE_APPLICATION_CREDENTIALS
const apps = getApps();
if (apps.length === 0) {
  initializeApp();
}

export const db = getFirestore();
export const storage = getStorage();
export const auth = getAuth();
