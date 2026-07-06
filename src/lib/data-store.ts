import "server-only";
import { getDb, isFirebaseEnabled } from "./firebase-admin";

/**
 * Camada de dados unificada.
 * - Se Firebase estiver configurado -> usa Firestore.
 * - Caso contrário -> usa armazenamento em memória (persiste enquanto o server roda).
 *
 * Cada documento tem um `id` string. Datas são armazenadas como ISO string
 * para consistência entre memória e Firestore.
 */

type Doc = Record<string, any> & { id: string };

// ---------- Memory fallback ----------
const globalForStore = globalThis as unknown as {
  __financeMemStore?: Record<string, Doc[]>;
  __financeSeeded?: boolean;
};

if (!globalForStore.__financeMemStore) {
  globalForStore.__financeMemStore = {};
}
const mem = globalForStore.__financeMemStore;

function memCol(name: string): Doc[] {
  if (!mem[name]) mem[name] = [];
  return mem[name];
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ---------- Public API ----------
export async function listDocs(collection: string): Promise<Doc[]> {
  if (isFirebaseEnabled()) {
    const db = getDb()!;
    const snap = await db.collection(collection).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }
  return [...memCol(collection)];
}

export async function addDoc(collection: string, data: Record<string, any>): Promise<Doc> {
  const clean = normalize(data);
  if (isFirebaseEnabled()) {
    const db = getDb()!;
    const ref = await db.collection(collection).add(clean);
    return { id: ref.id, ...clean };
  }
  const doc: Doc = { id: genId(), ...clean };
  memCol(collection).push(doc);
  return doc;
}

export async function getDoc(collection: string, id: string): Promise<Doc | null> {
  if (isFirebaseEnabled()) {
    const db = getDb()!;
    const snap = await db.collection(collection).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as any) };
  }
  return memCol(collection).find((d) => d.id === id) ?? null;
}

export async function updateDoc(collection: string, id: string, data: Record<string, any>): Promise<Doc | null> {
  const clean = normalize(data);
  if (isFirebaseEnabled()) {
    const db = getDb()!;
    await db.collection(collection).doc(id).set(clean, { merge: true });
    const snap = await db.collection(collection).doc(id).get();
    return { id: snap.id, ...(snap.data() as any) };
  }
  const col = memCol(collection);
  const idx = col.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  col[idx] = { ...col[idx], ...clean };
  return col[idx];
}

export async function deleteDoc(collection: string, id: string): Promise<void> {
  if (isFirebaseEnabled()) {
    const db = getDb()!;
    await db.collection(collection).doc(id).delete();
    return;
  }
  const col = memCol(collection);
  const idx = col.findIndex((d) => d.id === id);
  if (idx !== -1) col.splice(idx, 1);
}

export async function countDocs(collection: string): Promise<number> {
  const docs = await listDocs(collection);
  return docs.length;
}

// convert Date -> ISO for storage consistency
function normalize(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (v === undefined) {
      out[k] = null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function markSeeded() {
  globalForStore.__financeSeeded = true;
}
export function isSeeded() {
  return !!globalForStore.__financeSeeded;
}

export function storageMode(): "firebase" | "memory" {
  return isFirebaseEnabled() ? "firebase" : "memory";
}
