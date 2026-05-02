# Firebase + Google Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Sign-In (Firebase Auth) and persist user settings + transcript history to Firestore, replacing the current in-memory-only storage.

**Architecture:** Firebase JS SDK v10 (modular) runs entirely in the Tauri webview (WebView2 on Windows). Auth uses `signInWithPopup` with Google provider — WebView2 is Chromium-based so OAuth popups work. Firestore stores each user's settings and transcripts under `users/{uid}/`. On sign-in the frontend loads Firestore data and pushes settings to the Rust backend via the existing `save_settings` Tauri command. New transcripts are written to Firestore as they arrive from the backend event.

**Tech Stack:** `firebase` v10 (modular SDK), Cloud Firestore, Firebase Auth (Google provider), Vite env vars (`VITE_` prefix), React `useState`/`useEffect`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `.env.local` | Create | Firebase config values (never committed) |
| `.gitignore` | Modify | Exclude `.env.local` |
| `src/firebase.ts` | Create | Initialize Firebase app, export `auth` + `db` |
| `src/auth.ts` | Create | `signInWithGoogle`, `signOutUser`, `onAuthChange` |
| `src/firestore.ts` | Create | Typed CRUD for settings + transcripts collections |
| `src/LoginScreen.tsx` | Create | Full-screen login UI (DetectFlow aesthetic) |
| `src/App.tsx` | Modify | Auth gate, Firestore load/save wired into existing state |
| `src-tauri/capabilities/default.json` | Modify | Add `shell:allow-open` for OAuth popup support |

---

## Task 1: Firebase Console + Google Cloud Setup (external config)

*Manual steps — do these before touching code.*

- [ ] **Step 1: Create Firebase project**
  - Go to https://console.firebase.google.com → "Add project"
  - Name it `whisprly`, disable Google Analytics if not needed
  - Click "Create project"

- [ ] **Step 2: Enable Google Sign-In**
  - In Firebase Console → Authentication → Sign-in method
  - Enable "Google" provider → set Project support email → Save

- [ ] **Step 3: Add authorized domain for Tauri**
  - Authentication → Settings → Authorized domains
  - Add `tauri://localhost` (Tauri's webview origin on Windows)
  - Add `localhost` (for `npm run dev` mode)

- [ ] **Step 4: Create Firestore database**
  - Firestore Database → Create database
  - Choose "Start in production mode" → select a region → Done

- [ ] **Step 5: Set Firestore security rules**
  - Firestore → Rules tab → replace with:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{uid}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
  ```
  → Publish

- [ ] **Step 6: Get Firebase config**
  - Project Settings (gear icon) → General → Your apps
  - "Add app" → Web (`</>`) → name it `whisprly-desktop` → Register
  - Copy the `firebaseConfig` object — you'll need it in Task 2

- [ ] **Step 7: Add Google OAuth client for desktop**
  - In Google Cloud Console (https://console.cloud.google.com) → APIs & Services → Credentials
  - Find the OAuth 2.0 Client ID auto-created by Firebase
  - Under "Authorized JavaScript origins" add `tauri://localhost` and `http://localhost:1420`
  - Save

---

## Task 2: Install Firebase SDK + environment setup

- [ ] **Step 1: Install Firebase**
  ```bash
  npm install firebase
  ```
  Expected output: `added N packages` with no errors.

- [ ] **Step 2: Create `.env.local`**

  Create file at project root `c:\WisperFlow\.env.local` with your Firebase config values from Task 1 Step 6:
  ```
  VITE_FIREBASE_API_KEY=AIza...
  VITE_FIREBASE_AUTH_DOMAIN=whisprly-XXXXX.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=whisprly-XXXXX
  VITE_FIREBASE_STORAGE_BUCKET=whisprly-XXXXX.appspot.com
  VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
  VITE_FIREBASE_APP_ID=1:123456789:web:abc123
  ```

- [ ] **Step 3: Add `.env.local` to `.gitignore`**

  Open `.gitignore` (create it at project root if it doesn't exist) and add:
  ```
  .env.local
  .env.*.local
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add package.json package-lock.json .gitignore
  git commit -m "feat: install firebase sdk"
  ```

---

## Task 3: Create `src/firebase.ts` — Firebase initialization

- [ ] **Step 1: Create the file**

  Create `c:\WisperFlow\src\firebase.ts`:
  ```typescript
  import { initializeApp } from "firebase/app";
  import { getAuth } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";

  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db   = getFirestore(app);
  ```

- [ ] **Step 2: Verify TypeScript accepts it**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output (zero errors).

- [ ] **Step 3: Commit**
  ```bash
  git add src/firebase.ts
  git commit -m "feat: initialize firebase app"
  ```

---

## Task 4: Create `src/auth.ts` — Auth helpers

- [ ] **Step 1: Create the file**

  Create `c:\WisperFlow\src\auth.ts`:
  ```typescript
  import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    type User,
  } from "firebase/auth";
  import { auth } from "./firebase";

  const googleProvider = new GoogleAuthProvider();

  export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

  export async function signOutUser(): Promise<void> {
    await signOut(auth);
  }

  export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  export type { User };
  ```

- [ ] **Step 2: Verify types**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output.

- [ ] **Step 3: Commit**
  ```bash
  git add src/auth.ts
  git commit -m "feat: add google auth helpers"
  ```

---

## Task 5: Create `src/firestore.ts` — Firestore data layer

- [ ] **Step 1: Create the file**

  Create `c:\WisperFlow\src\firestore.ts`:
  ```typescript
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
  ```

- [ ] **Step 2: Verify types**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output.

- [ ] **Step 3: Commit**
  ```bash
  git add src/firestore.ts
  git commit -m "feat: add firestore data layer"
  ```

---

## Task 6: Create `src/LoginScreen.tsx` — Login UI

- [ ] **Step 1: Create the file**

  Create `c:\WisperFlow\src\LoginScreen.tsx`:
  ```tsx
  import logo from "./assets/logo.png";
  import { signInWithGoogle } from "./auth";

  interface Props {
    onSignIn: () => void;
  }

  function IcGoogle() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.34 22.56 15.52 22.56 12.25z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }

  export default function LoginScreen({ onSignIn }: Props) {
    async function handleGoogleSignIn() {
      try {
        await signInWithGoogle();
        onSignIn();
      } catch (err) {
        console.error("Sign-in failed:", err);
      }
    }

    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: "40px 32px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }} />

        {/* Card */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          background: "var(--bg-card)",
          border: "1px solid var(--border-bright)",
          borderRadius: "var(--radius-lg)",
          padding: "40px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 8px 48px rgba(0,0,0,0.24)",
        }}>
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 15,
              background: "linear-gradient(135deg, var(--cyan), var(--violet))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 24px rgba(0,212,255,0.30)",
            }}>
              <img src={logo} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(10) saturate(0)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 24,
                color: "var(--text-0)",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
              }}>
                Welcome to Whisprly
              </h1>
              <p style={{
                fontSize: 14,
                color: "var(--text-2)",
                marginTop: 6,
                lineHeight: 1.5,
              }}>
                Sign in to sync your transcripts across sessions
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "100%", height: 1, background: "var(--border)" }} />

          {/* Sign-in button */}
          <button
            onClick={handleGoogleSignIn}
            style={{
              width: "100%",
              padding: "13px 20px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-bright)",
              cursor: "pointer",
              background: "var(--bg-surface)",
              color: "var(--text-0)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "background var(--transition), border-color var(--transition)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card-hover)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cyan)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-bright)";
            }}
          >
            <IcGoogle />
            Continue with Google
          </button>

          <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", lineHeight: 1.6 }}>
            By signing in you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify types**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output.

- [ ] **Step 3: Commit**
  ```bash
  git add src/LoginScreen.tsx
  git commit -m "feat: add login screen ui"
  ```

---

## Task 7: Update Tauri capabilities for OAuth popup

The OAuth popup opens a new window. Tauri v2 requires `window:allow-create` capability to allow popups spawned by the webview. Also update authorized domains.

- [ ] **Step 1: Update `src-tauri/capabilities/default.json`**

  Replace the file content with:
  ```json
  {
    "identifier": "default",
    "description": "Default capability for Whisprly",
    "windows": ["main", "overlay"],
    "permissions": [
      "core:default"
    ]
  }
  ```

  > **Note:** `core:default` already includes `window:default` which permits popups opened by `window.open()` inside the webview. No additional permission is needed for Firebase's `signInWithPopup`. If the popup is blocked at runtime, add `"core:window:allow-create"` to the permissions array.

- [ ] **Step 2: Verify the app still builds**
  ```bash
  cd src-tauri && cargo check 2>&1 | tail -5
  ```
  Expected: `Finished ... target(s) in Xs`

---

## Task 8: Wire auth + Firestore into `src/App.tsx`

This is the largest change. We add:
1. Auth state tracking — show `LoginScreen` when no user
2. On sign-in: load settings from Firestore → push to Rust backend via `save_settings`
3. On sign-in: load transcript history from Firestore
4. On new `transcript` event: save to Firestore
5. On settings save: also write to Firestore
6. Sign-out button in the header avatar

- [ ] **Step 1: Add imports at the top of `src/App.tsx`**

  After the existing imports (after `import { invoke } from "@tauri-apps/api/core";`), add:
  ```typescript
  import { onAuthChange, signOutUser, type User } from "./auth";
  import { saveSettings, loadSettings, saveTranscript, loadTranscripts } from "./firestore";
  import LoginScreen from "./LoginScreen";
  ```

- [ ] **Step 2: Add `user` state inside the `App` component**

  After the existing `useState` declarations (after `const [copiedKey, ...]`), add:
  ```typescript
  const [user, setUser]           = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  ```

- [ ] **Step 3: Replace the existing `useEffect` with an expanded version**

  Replace the entire existing `useEffect` block:
  ```typescript
  useEffect(() => {
    invoke<TranscriptEntry[]>("get_transcript_log").then(setTranscripts).catch(() => {});
    invoke<Settings>("get_settings").then(setSettings).catch(() => {});

    const unStatus = listen<StatusPayload>("status", (e) => {
      setStatus(e.payload.status);
      setStatusMsg(e.payload.message ?? "");
    });
    const unTranscript = listen<TranscriptEntry>("transcript", (e) => {
      setTranscripts((prev) => [e.payload, ...prev].slice(0, 200));
    });
    return () => {
      unStatus.then((f) => f());
      unTranscript.then((f) => f());
    };
  }, []);
  ```

  With this version that handles auth + Firestore:
  ```typescript
  useEffect(() => {
    // Listen for Tauri status events
    const unStatus = listen<StatusPayload>("status", (e) => {
      setStatus(e.payload.status);
      setStatusMsg(e.payload.message ?? "");
    });

    // When auth state resolves, load data from Firestore
    const unAuth = onAuthChange(async (u) => {
      setUser(u);
      setAuthReady(true);

      if (u) {
        // Load settings from Firestore → push to Rust backend
        const fsSettings = await loadSettings(u.uid);
        if (fsSettings) {
          setSettings(fsSettings);
          await invoke("save_settings", {
            groqApiKey: fsSettings.groqApiKey,
            pythonCmd:  fsSettings.pythonCmd,
          }).catch(() => {});
        } else {
          // First sign-in: seed settings from Rust backend's defaults
          const rustSettings = await invoke<Settings>("get_settings").catch(() => null);
          if (rustSettings) setSettings(rustSettings);
        }

        // Load transcript history from Firestore
        const fsTranscripts = await loadTranscripts(u.uid);
        setTranscripts(fsTranscripts.slice(0, 200));
      } else {
        // Signed out: clear local state
        setTranscripts([]);
        setSettings({ groqApiKey: "", pythonCmd: "python" });
      }
    });

    return () => {
      unStatus.then((f) => f());
      unAuth();
    };
  }, []);
  ```

- [ ] **Step 4: Wire new transcripts to Firestore**

  After the `useEffect` above, add a separate effect that listens for new transcripts and saves them:
  ```typescript
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const unTranscript = listen<TranscriptEntry>("transcript", (e) => {
      const entry = e.payload;
      setTranscripts((prev) => [entry, ...prev].slice(0, 200));
      saveTranscript(uid, {
        text:      entry.text,
        engine:    entry.engine,
        timestamp: entry.timestamp,
      }).catch(console.error);
    });

    return () => { unTranscript.then((f) => f()); };
  }, [user]);
  ```

- [ ] **Step 5: Update `saveSettings` callback to also write Firestore**

  Replace the existing `saveSettings` callback:
  ```typescript
  const saveSettings = useCallback(async () => {
    await invoke("save_settings", { groqApiKey: settings.groqApiKey, pythonCmd: settings.pythonCmd });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);
  ```

  With:
  ```typescript
  const saveSettings = useCallback(async () => {
    await invoke("save_settings", { groqApiKey: settings.groqApiKey, pythonCmd: settings.pythonCmd });
    if (user) {
      await saveSettings_fs(user.uid, {
        groqApiKey: settings.groqApiKey,
        pythonCmd:  settings.pythonCmd,
      }).catch(console.error);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings, user]);
  ```

  > **Important:** The Firestore `saveSettings` function is imported as `saveSettings` from `./firestore` which conflicts with the local `saveSettings` callback name. Rename the import at the top of the file:
  ```typescript
  import { saveSettings as saveSettings_fs, loadSettings, saveTranscript, loadTranscripts } from "./firestore";
  ```

- [ ] **Step 6: Show `LoginScreen` before auth resolves or when signed out**

  In the `return` of the `App` component, wrap the existing JSX:
  ```tsx
  // Before the existing `return (`:
  if (!authReady) {
    return (
      <div className={`app${lightMode ? " light-mode" : ""}`} style={{ alignItems: "center", justifyContent: "center" }}>
        {/* Spinner while Firebase resolves auth state */}
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--border-bright)", borderTopColor: "var(--cyan)", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`app${lightMode ? " light-mode" : ""}`}>
        <LoginScreen onSignIn={() => {/* onAuthChange fires automatically */}} />
      </div>
    );
  }
  ```

  Add the `spin` keyframe to `src/index.css`:
  ```css
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  ```

- [ ] **Step 7: Add sign-out to the header avatar button**

  Replace the static avatar div in the header:
  ```tsx
  <div className="header-avatar-btn">S</div>
  ```

  With a clickable sign-out button:
  ```tsx
  <div
    className="header-avatar-btn"
    title="Sign out"
    style={{ cursor: "pointer" }}
    onClick={() => signOutUser().catch(console.error)}
  >
    {user.displayName?.[0]?.toUpperCase() ?? "S"}
  </div>
  ```

  Also update the sidebar user section to show the real display name:
  ```tsx
  <div className="sidebar-user">
    <div className="user-avatar">
      {user.displayName?.[0]?.toUpperCase() ?? "S"}
    </div>
    <div className="user-info">
      <p className="user-name">{user.displayName ?? "User"}</p>
      <p className="user-plan">{user.email ?? ""}</p>
    </div>
  </div>
  ```

- [ ] **Step 8: Verify TypeScript**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output (zero errors). Fix any type errors before continuing.

- [ ] **Step 9: Commit**
  ```bash
  git add src/App.tsx src/index.css
  git commit -m "feat: wire firebase auth and firestore into app"
  ```

---

## Task 9: End-to-end manual verification

*There is no test suite — verify manually with `npm run dev`.*

- [ ] **Step 1: Start the Vite dev server**
  ```bash
  npm run dev
  ```
  Open `http://localhost:1420` in a browser (or run `npm run tauri dev` for the desktop shell).

- [ ] **Step 2: Verify login screen appears**
  - Expected: Login card with Whisprly logo and "Continue with Google" button.
  - Expected: App content (transcript feed) is NOT visible.

- [ ] **Step 3: Sign in**
  - Click "Continue with Google"
  - Expected: Google OAuth popup opens
  - Sign in with a Google account
  - Expected: Popup closes, main app loads with the user's initial in the sidebar + header avatar

- [ ] **Step 4: Verify settings persistence**
  - Click Settings in the sidebar
  - Enter a Groq API key (use a fake one like `gsk_test123`)
  - Click "Save settings"
  - Reload the page / restart the app
  - Sign in again
  - Open Settings → the Groq API key should still be there (loaded from Firestore)

- [ ] **Step 5: Verify transcript persistence**
  - Use Ctrl + Win to make a dictation (requires running via `npm run tauri dev`)
  - The transcript appears in the feed
  - Reload the app, sign in again
  - The transcript should still appear (loaded from Firestore)

- [ ] **Step 6: Verify sign-out**
  - Click the user avatar in the header
  - Expected: App shows LoginScreen, transcript feed is cleared from UI
  - Sign in again — data reloads from Firestore

- [ ] **Step 7: Verify light mode still works**
  - Sign in, click the ☀ toggle in the header
  - LoginScreen and loading spinner should also respect light mode (they use CSS vars)

---

## Task 10: Final commit + cleanup

- [ ] **Step 1: Remove unused import in App.tsx**

  After completing Task 8, the original `invoke("get_transcript_log")` call is removed. Double-check that `get_transcript_log` is no longer called anywhere:
  ```bash
  grep -n "get_transcript_log" src/App.tsx
  ```
  Expected: no output. If it still appears, remove that line.

- [ ] **Step 2: Final type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output.

- [ ] **Step 3: Final commit**
  ```bash
  git add -A
  git commit -m "feat: firebase google auth + firestore persistence"
  ```

---

## Known Constraints + Gotchas

| Issue | Mitigation |
|-------|-----------|
| Google may block OAuth in embedded webviews | Tauri uses WebView2 on Windows (Chromium-based) — popups work. If blocked, add `"allowedNavigationDestinations": ["https://accounts.google.com"]` to `tauri.conf.json` under `app.windows[0]` |
| `signInWithPopup` fails in `npm run dev` browser | Add `http://localhost:1420` to authorized origins in Google Cloud Console (Task 1 Step 7) |
| Firestore import name conflicts with local `saveSettings` | The import is renamed to `saveSettings_fs` in Task 8 Step 5 |
| Settings not in Firestore on first sign-in | Handled in Task 8 Step 3: falls back to Rust backend's `.env`-seeded defaults |
| Groq API key visible in Firestore | Firestore security rules restrict reads to the owning UID only — acceptable for personal use |
