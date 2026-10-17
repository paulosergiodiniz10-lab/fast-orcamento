import admin from "firebase-admin";

function getAdminApp() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }
  return admin;
}

export function getAdminDb() {
  const app = getAdminApp();
  if (!app.apps.length) {
    throw new Error("Firebase Admin não foi inicializado corretamente.");
  }
  return app.firestore();
}

export default admin;
