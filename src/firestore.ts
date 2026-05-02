import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  orderBy,
  limit,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FSSettings {
  groqApiKey: string;
  pythonCmd:  string;
}

export interface FSTranscriptEntry {
  text:      string;
  engine:    string;
  timestamp: number;
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
  };
}

// ── Transcripts ───────────────────────────────────────────────────────────

export async function saveTranscript(uid: string, entry: FSTranscriptEntry): Promise<void> {
  await addDoc(collection(db, "users", uid, "transcripts"), entry);
}

export async function loadTranscripts(uid: string): Promise<FSTranscriptEntry[]> {
  const q = query(
    collection(db, "users", uid, "transcripts"),
    orderBy("timestamp", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as FSTranscriptEntry);
}
