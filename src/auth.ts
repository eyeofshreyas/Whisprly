import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { invoke } from "@tauri-apps/api/core";
import { auth } from "./firebase";

// Opens the system browser for Google OAuth (PKCE via Rust), then signs in
// to Firebase using the returned ID token. Works in Tauri's WebView2 where
// signInWithRedirect/signInWithPopup fail due to embedded-WebView restrictions.
export async function signInWithGoogle(): Promise<void> {
  const result = await invoke<{ idToken: string | null; accessToken: string | null }>(
    "start_google_oauth",
  );
  if (!result.idToken && !result.accessToken) {
    throw new Error("No tokens returned from OAuth flow");
  }
  // Use only the access_token — Firebase accepts it via Google's userinfo API.
  // Passing the id_token would fail because its audience is the Desktop OAuth
  // client, not Firebase's web client (auth/invalid-credential).
  const credential = GoogleAuthProvider.credential(null, result.accessToken);
  await signInWithCredential(auth, credential);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export type { User };
