import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getAdminDb() {
  const adminApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: required("FIREBASE_PROJECT_ID"),
        clientEmail: required("FIREBASE_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")
      })
    });

  return getFirestore(adminApp);
}
