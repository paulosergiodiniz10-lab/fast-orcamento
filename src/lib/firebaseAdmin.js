import admin from "firebase-admin";

function getAdminApp() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

    // Remove aspas adicionais nas extremidades e converte \n literais
    privateKey = privateKey.trim().replace(/^"(.*)"$/, "$1").replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Variáveis do Firebase Admin ausentes:", {
        projectId: Boolean(projectId),
        clientEmail: Boolean(clientEmail),
        privateKey: Boolean(privateKey),
      });
      throw new Error("Credenciais do Firebase Admin incompletas nas variáveis de ambiente.");
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (err) {
      console.error("Erro ao inicializar Firebase Admin:", err);
      throw err;
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
