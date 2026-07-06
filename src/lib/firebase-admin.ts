import "server-only";
import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (server-side).
 *
 * Configure as variáveis de ambiente:
 *  - FIREBASE_PROJECT_ID
 *  - FIREBASE_CLIENT_EMAIL
 *  - FIREBASE_PRIVATE_KEY   (com \n escapados)
 *
 * Se NÃO estiverem configuradas, o sistema usa um armazenamento em memória
 * (fallback) para que o preview continue funcionando. Assim que você preencher
 * as credenciais, os dados passam a ser salvos no Firestore real.
 */

let firestore: Firestore | null = null;
let firebaseEnabled = false;

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  // Suporta chave com \n escapados ou base64
  if (key.includes("BEGIN PRIVATE KEY")) {
    return key.replace(/\\n/g, "\n");
  }
  try {
    const decoded = Buffer.from(key, "base64").toString("utf8");
    if (decoded.includes("BEGIN PRIVATE KEY")) return decoded;
  } catch {
    /* ignore */
  }
  return key.replace(/\\n/g, "\n");
}

function initFirebase() {
  if (firestore !== null || firebaseEnabled) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    firebaseEnabled = false;
    return;
  }

  try {
    let app: App;
    if (getApps().length > 0) {
      app = getApps()[0]!;
    } else {
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    firestore = getFirestore(app);
    firebaseEnabled = true;
  } catch (err) {
    console.error("Falha ao inicializar Firebase Admin:", err);
    firebaseEnabled = false;
  }
}

export function isFirebaseEnabled(): boolean {
  initFirebase();
  return firebaseEnabled;
}

export function getDb(): Firestore | null {
  initFirebase();
  return firestore;
}
