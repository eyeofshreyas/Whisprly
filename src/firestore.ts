import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  orderBy,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FSSettings {
  groqApiKey: string;
  pythonCmd:  string;
  language?:  string;
}

export interface FSTranscriptEntry {
  id?:       string;
  text:      string;
  raw_text?: string;
  engine:    string;
  mode?:     string;
  timestamp: number;
}

// ── User profile ──────────────────────────────────────────────────────────

export interface FSUserProfile {
  email:       string | null;
  displayName: string | null;
  photoURL:    string | null;
  lastSeen:    unknown; // serverTimestamp
}

export async function saveUserProfile(uid: string, profile: Omit<FSUserProfile, "lastSeen">): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    ...profile,
    lastSeen: serverTimestamp(),
  }, { merge: true });
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function saveSettings(uid: string, settings: FSSettings): Promise<void> {
  await setDoc(doc(db, "users", uid, "data", "settings"), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

export async function loadSettings(uid: string): Promise<FSSettings | null> {
  const snap = await getDoc(doc(db, "users", uid, "data", "settings"));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    groqApiKey: d.groqApiKey ?? "",
    pythonCmd:  d.pythonCmd  ?? "python",
    language:   d.language   ?? "auto",
  };
}

// ── Transcripts ───────────────────────────────────────────────────────────

export async function saveTranscript(uid: string, entry: Omit<FSTranscriptEntry, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "transcripts"), entry);
  return ref.id;
}

export async function loadTranscripts(uid: string): Promise<FSTranscriptEntry[]> {
  const q = query(
    collection(db, "users", uid, "transcripts"),
    orderBy("timestamp", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const raw = d.data();
    return {
      id:        d.id,
      text:      typeof raw.text      === "string" ? raw.text      : "",
      raw_text:  typeof raw.raw_text  === "string" ? raw.raw_text  : undefined,
      engine:    typeof raw.engine    === "string" ? raw.engine    : "unknown",
      mode:      typeof raw.mode      === "string" ? raw.mode      : undefined,
      timestamp: typeof raw.timestamp === "number" ? raw.timestamp : 0,
    } satisfies FSTranscriptEntry;
  });
}

export async function deleteTranscript(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "transcripts", id));
}

export async function deleteAllTranscripts(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, "users", uid, "transcripts"));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
