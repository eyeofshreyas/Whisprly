import "./index.css";
import logo from "./assets/logo.svg";
import { memo, useEffect, useState, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { onAuthChange, signOutUser, type User } from "./auth";
import LoginScreen from "./LoginScreen";

const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en",   label: "English" },
  { code: "es",   label: "Spanish" },
  { code: "fr",   label: "French" },
  { code: "de",   label: "German" },
  { code: "it",   label: "Italian" },
  { code: "pt",   label: "Portuguese" },
  { code: "ru",   label: "Russian" },
  { code: "ja",   label: "Japanese" },
  { code: "zh",   label: "Chinese" },
  { code: "hi",   label: "Hindi" },
  { code: "ar",   label: "Arabic" },
];

type Status = "idle" | "recording" | "transcribing";

interface TranscriptEntry {
  id?:       number;
  text:      string;
  raw_text?: string;
  engine:    string;
  mode?:     string;
  timestamp: string;
}

interface StatusPayload {
  status: Status;
  message?: string;
}

interface Settings {
  groqApiKey: string;
  pythonCmd: string;
  language: string;
  postprocessModel?: string;
  customVocabulary?: string;
  customInstructions?: string;
}

const BAR_COUNT = 36;
const HEIGHTS = [3, 6, 10, 16, 22, 28, 24, 18, 13, 7, 4, 9, 16, 23, 28, 26, 20, 14, 8, 5, 10, 18, 25, 28, 22, 16, 10, 6, 4, 8, 14, 22, 27, 24, 18, 11];

// ── Icons ─────────────────────────────────────────────────────────────────────

const svgBase = {
  width: 15,
  height: 15,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.6",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IcHome() {
  return (
    <svg {...svgBase}>
      <path d="M1.5 7L8 2l6.5 5V14.5H10.5V10H5.5v4.5H1.5V7z" />
    </svg>
  );
}

function IcBook() {
  return (
    <svg {...svgBase}>
      <path d="M3 3A1.5 1.5 0 0 1 4.5 1.5H13.5v12H4.5A1.5 1.5 0 0 1 3 12V3z" />
      <path d="M3 12A1.5 1.5 0 0 0 4.5 13.5H13.5" />
      <line x1="6.5" y1="5" x2="10.5" y2="5" />
      <line x1="6.5" y1="7.5" x2="10.5" y2="7.5" />
    </svg>
  );
}

function IcSnippets() {
  return (
    <svg {...svgBase}>
      <polyline points="5.5,4.5 2,8 5.5,11.5" />
      <polyline points="10.5,4.5 14,8 10.5,11.5" />
      <line x1="9.5" y1="2" x2="6.5" y2="14" />
    </svg>
  );
}

function IcStyle() {
  return (
    <svg {...svgBase}>
      <path d="M8 1.5l1.7 3.5 3.8.55-2.75 2.65.65 3.8L8 10.3l-3.4 1.7.65-3.8L2.5 5.55l3.8-.55L8 1.5z" />
    </svg>
  );
}

function IcNotes() {
  return (
    <svg {...svgBase}>
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
      <line x1="5.5" y1="8.5" x2="10.5" y2="8.5" />
      <line x1="5.5" y1="11.5" x2="8.5" y2="11.5" />
    </svg>
  );
}

function IcSettings() {
  return (
    <svg {...svgBase}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.45 3.45l.85.85M11.7 11.7l.85.85M3.45 12.55l.85-.85M11.7 4.3l.85-.85" />
    </svg>
  );
}

function IcHelp() {
  return (
    <svg {...svgBase}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6.2 6.2a1.9 1.9 0 1 1 1.9 1.9V9" />
      <circle cx="8" cy="11.5" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IcCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="8.5" height="8.5" rx="1.5" />
      <path d="M3.5 10H2.5A1.5 1.5 0 0 1 1 8.5v-7A1.5 1.5 0 0 1 2.5 0h7A1.5 1.5 0 0 1 11 1.5v1" />
    </svg>
  );
}

function IcCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2.5,8 6.5,12 13.5,4" />
    </svg>
  );
}

function IcTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 14,4" />
      <path d="M5.5 4V2.5h5V4" />
      <path d="M3.5 4l1 9.5h7l1-9.5" />
      <line x1="6.5" y1="7" x2="6.5" y2="11" />
      <line x1="9.5" y1="7" x2="9.5" y2="11" />
    </svg>
  );
}

function IcLogOut() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H2.5A1.5 1.5 0 0 0 1 3.5v9A1.5 1.5 0 0 0 2.5 14H6" />
      <polyline points="10.5,11 14,8 10.5,5" />
      <line x1="14" y1="8" x2="6" y2="8" />
    </svg>
  );
}

function IcBell() {
  return (
    <svg {...svgBase}>
      <path d="M13.5 13.5H2.5l1.5-1.5V7.5A4 4 0 0 1 12 7.5V12l1.5 1.5z" />
      <path d="M6.2 13.5a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  );
}

function IcSun() {
  return (
    <svg {...svgBase}>
      <circle cx="8" cy="8" r="3.2" />
      <line x1="8" y1="1" x2="8" y2="2.5" />
      <line x1="8" y1="13.5" x2="8" y2="15" />
      <line x1="1" y1="8" x2="2.5" y2="8" />
      <line x1="13.5" y1="8" x2="15" y2="8" />
      <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
      <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
      <line x1="3.05" y1="12.95" x2="4.1" y2="11.9" />
      <line x1="11.9" y1="4.1" x2="12.95" y2="3.05" />
    </svg>
  );
}

function IcMoon() {
  return (
    <svg {...svgBase}>
      <path d="M13.5 10A6 6 0 0 1 6 2.5a6.5 6.5 0 1 0 7.5 7.5z" />
    </svg>
  );
}

function IcMic() {
  return (
    <svg {...svgBase}>
      <rect x="6" y="1.5" width="4" height="8" rx="2" />
      <path d="M3.5 7a4.5 4.5 0 0 0 9 0" />
      <line x1="8" y1="13" x2="8" y2="15.5" />
      <line x1="5.5" y1="15.5" x2="10.5" y2="15.5" />
    </svg>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning ☀️";
  if (h < 17) return "Good afternoon 👋";
  return "Good evening 🌙";
}

// ── Sub-components ────────────────────────────────────────────────────────────

const MiniWaveform = memo(function MiniWaveform({ status }: { status: Status }) {
  return (
    <div className={`mini-wave mini-wave--${status}`}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="mini-bar"
          style={{
            "--base-h": `${HEIGHTS[i % HEIGHTS.length]}px`,
            animationDelay: `${(i * 0.035).toFixed(3)}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatWords(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function groupByDate(entries: TranscriptEntry[]) {
  const groups: Record<string, TranscriptEntry[]> = {};
  for (const e of entries) {
    const d = new Date(e.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "TODAY";
    else if (d.toDateString() === yesterday.toDateString()) label = "YESTERDAY";
    else label = d.toLocaleDateString([], { month: "long", day: "numeric" }).toUpperCase();
    (groups[label] ??= []).push(e);
  }
  return groups;
}

function totalWords(entries: TranscriptEntry[]) {
  return entries.reduce((sum, e) => sum + e.text.split(/\s+/).filter(Boolean).length, 0);
}

function activeDays(entries: TranscriptEntry[]) {
  return new Set(entries.map((e) => new Date(e.timestamp).toDateString())).size;
}

// ── Nav data ──────────────────────────────────────────────────────────────────

type SetupProgress = {
  stage: "checking" | "installing_winget" | "installing_ollama" | "pulling_model" | "done" | "error";
  percent: number;
  message: string;
};

type NavItem = { id: string; Icon: React.ComponentType; label: string };
const NAV_ITEMS: NavItem[] = [
  { id: "home",       Icon: IcHome,     label: "Home"       },
  { id: "dictionary", Icon: IcBook,     label: "Dictionary" },
  { id: "snippets",   Icon: IcSnippets, label: "Snippets"   },
  { id: "style",      Icon: IcStyle,    label: "Style"      },
  { id: "notes",      Icon: IcNotes,    label: "Notes"      },
];

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [status, setStatus]         = useState<Status>("idle");
  const [statusMsg, setStatusMsg]   = useState("");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [settings, setSettings]     = useState<Settings>({ groqApiKey: "", pythonCmd: "python", language: "auto", postprocessModel: "llama-3.1-8b-instant", customVocabulary: "", customInstructions: "" });
  const [saved, setSaved]           = useState(false);
  const [outputMode, setOutputMode] = useState<"prose" | "email" | "code" | "auto">("prose");
  const [activeNav, setActiveNav]   = useState("home");
  const [copiedKey, setCopiedKey]   = useState<string | null>(null);
  const [lightMode, setLightMode]   = useState(false);
  const [user, setUser]           = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TranscriptEntry[] | null>(null);

  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [newTag, setNewTag] = useState("");

  const updateVocabulary = useCallback((vocabStr: string) => {
    setSettings((s) => {
      const updated = { ...s, customVocabulary: vocabStr };
      invoke("save_settings", {
        groqApiKey: updated.groqApiKey,
        pythonCmd:  updated.pythonCmd,
        language:   updated.language,
        postprocessModel: updated.postprocessModel ?? "llama-3.1-8b-instant",
        customVocabulary: updated.customVocabulary ?? "",
        customInstructions: updated.customInstructions ?? "",
      }).catch(console.error);
      return updated;
    });
  }, []);

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return;
    const cleanTag = newTag.trim();
    const vocab = settings?.customVocabulary || "";
    const tags = vocab.split(",").map(t => t.trim()).filter(Boolean);
    if (!tags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) {
      const updatedTags = [...tags, cleanTag];
      updateVocabulary(updatedTags.join(", "));
    }
    setNewTag("");
  }, [newTag, settings?.customVocabulary, updateVocabulary]);

  const handleDeleteTag = useCallback((tagToDelete: string) => {
    const vocab = settings?.customVocabulary || "";
    const tags = vocab.split(",").map(t => t.trim()).filter(Boolean);
    const updatedTags = tags.filter(t => t !== tagToDelete);
    updateVocabulary(updatedTags.join(", "));
  }, [settings?.customVocabulary, updateVocabulary]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (status === "recording") {
      setRecordingSeconds(0);
      interval = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const formatRecordingTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const unStatus = listen<StatusPayload>("status", (e) => {
      setStatus(e.payload.status);
      setStatusMsg(e.payload.message ?? "");
    });

    const unSetup = listen<SetupProgress>("setup_progress", (e) => {
      const p = e.payload;
      if (p.stage === "done") {
        setToastMessage(p.message);
        setSetupProgress(null);
        setShowToast(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setShowToast(false), 4000);
      } else {
        setSetupProgress(p);
      }
    });

    const unAuth = onAuthChange((u) => {
      void (async () => {
        try {
          setUser(u);
          if (u) {
            // Load settings from Rust (already loaded from disk on startup)
            const rustSettings = await invoke<Settings>("get_settings").catch(() => null);
            if (rustSettings) setSettings(rustSettings);
            // Load transcripts from SQLite
            const entries = await invoke<TranscriptEntry[]>("get_transcript_log").catch(() => []);
            setTranscripts(entries);
          } else {
            setTranscripts([]);
            setSettings({ groqApiKey: "", pythonCmd: "python", language: "auto", postprocessModel: "llama-3.1-8b-instant", customVocabulary: "", customInstructions: "" });
          }
        } catch (err) {
          console.error("Auth change handler failed:", err);
        } finally {
          setAuthReady(true);
        }
      })();
    });

    return () => {
      unStatus.then((f) => f());
      unSetup.then((f) => f());
      unAuth();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const unTranscript = listen<TranscriptEntry>("transcript", (e) => {
      const entry = e.payload;
      setTranscripts((prev) => [entry, ...prev].slice(0, 200));
    });

    return () => { unTranscript.then((f) => f()); };
  }, [user]);

  useEffect(() => {
    invoke<string>("get_output_mode")
      .then((m) => setOutputMode(m as "prose" | "email" | "code" | "auto"))
      .catch(console.error);
  }, []);

  const saveSettings = useCallback(async () => {
    await invoke("save_settings", {
      groqApiKey: settings.groqApiKey,
      pythonCmd:  settings.pythonCmd,
      language:   settings.language,
      postprocessModel: settings.postprocessModel ?? "llama-3.1-8b-instant",
      customVocabulary: settings.customVocabulary ?? "",
      customInstructions: settings.customInstructions ?? "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const copyEntry = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }).catch(() => {});
  }, []);

  const deleteEntry = useCallback((id: number | undefined) => {
    if (!id) return;
    setTranscripts(prev => prev.filter(t => t.id !== id));
    invoke("delete_transcript", { id }).catch(console.error);
  }, []);

  const clearAll = useCallback(async () => {
    setTranscripts([]);
    setSearchResults(null);
    setSearchQuery("");
    await invoke("clear_all_db_transcripts").catch(console.error);
  }, []);

  const searchGenRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim() === "") {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const gen = ++searchGenRef.current;
      try {
        const results = await invoke<TranscriptEntry[]>("search_transcripts", { query: q });
        if (gen === searchGenRef.current) {
          setSearchResults(results);
        }
      } catch {
        if (gen === searchGenRef.current) {
          setSearchResults([]);
        }
      }
    }, 200);
  }, []);

  const words  = totalWords(transcripts);
  const days   = activeDays(transcripts);
  const displayList = searchResults ?? transcripts;
  const groups = groupByDate(displayList);

  if (!authReady) {
    return (
      <div className={`app${lightMode ? " light-mode" : ""}`} style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--border-bright)", borderTopColor: "var(--cyan)", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`app${lightMode ? " light-mode" : ""}`}>
        <LoginScreen onSignIn={() => {}} />
      </div>
    );
  }

  return (
    <div className={`app${lightMode ? " light-mode" : ""}${setupProgress ? " has-setup-bar" : ""}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-name">Whisprly</span>
          </div>

          <nav className="nav">
            {NAV_ITEMS.map(({ id, Icon, label }) => (
              <button
                key={id}
                aria-label={label}
                className={`nav-item${activeNav === id ? " nav-item--active" : ""}`}
                onClick={() => setActiveNav(id)}
                aria-current={activeNav === id ? "page" : undefined}
              >
                <Icon />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button
            className="sidebar-util"
            aria-label="Settings"
            onClick={() => setActiveNav("settings")}
          >
            <IcSettings />
            <span className="nav-label">Settings</span>
          </button>
          <button className="sidebar-util" aria-label="Help" onClick={() => setActiveNav("help")}>
            <IcHelp />
            <span className="nav-label">Help</span>
          </button>
          <button className="sidebar-user" onClick={() => setActiveNav("profile")}>
            <div className="user-avatar">
              {user.photoURL
                ? <img src={user.photoURL} className="avatar-photo" alt="" />
                : user.displayName?.[0]?.toUpperCase() ?? "S"
              }
            </div>
            <div className="user-info">
              <p className="user-name">{user.displayName ?? "User"}</p>
              <p className="user-plan">{user.email ?? ""}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="content">
        <div key={activeNav} className="content-page">
        {activeNav === "settings" ? (
          <div className="settings-page">
            <div className="page-header">
              <h1 className="page-title">Settings</h1>
              <button className="close-btn" onClick={() => setActiveNav("home")} aria-label="Close settings">✕</button>
            </div>
            <div className="settings-form">
              <div className="settings-section">
                <p className="settings-section-title">Cloud Transcription</p>
                <div className="field-group">
                  <label className="field-label">Groq API Key</label>
                  <input
                    type="password"
                    className="field-input"
                    value={settings.groqApiKey}
                    onChange={(e) => setSettings((s) => ({ ...s, groqApiKey: e.target.value }))}
                    placeholder="gsk_..."
                  />
                  <span className="field-hint">Fast cloud transcription via Groq Whisper</span>
                </div>
                <div className="field-group">
                  <label className="field-label">Postprocessing Model</label>
                  <input
                    type="text"
                    className="field-input"
                    value={settings.postprocessModel ?? "llama-3.1-8b-instant"}
                    onChange={(e) => setSettings((s) => ({ ...s, postprocessModel: e.target.value }))}
                    placeholder="llama-3.1-8b-instant"
                  />
                  <span className="field-hint">Cloud Groq LLM model or Local Ollama model ID used for speech correction</span>
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="lang-select">Transcription Language</label>
                  <select
                    id="lang-select"
                    className="field-select"
                    value={settings.language ?? "auto"}
                    onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <span className="field-hint">Override Whisper language detection</span>
                </div>
              </div>
              <div className="settings-section">
                <p className="settings-section-title">Output Mode</p>
                <div className="field-group">
                  <label className="field-label">Polish style</label>
                  <div className="mode-selector">
                    {(["prose", "email", "code", "auto"] as const).map((m) => (
                      <button
                        key={m}
                        className={`mode-btn${outputMode === m ? " mode-btn--active" : ""}`}
                        onClick={() => {
                          setOutputMode(m);
                          invoke("set_output_mode", { mode: m }).catch(console.error);
                        }}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  <span className="field-hint">Applied to every transcript after Whisper</span>
                </div>
              </div>
              <div className="settings-section">
                <p className="settings-section-title">Local Fallback</p>
                <div className="field-group">
                  <label className="field-label">Python command</label>
                  <input
                    type="text"
                    className="field-input"
                    value={settings.pythonCmd}
                    onChange={(e) => setSettings((s) => ({ ...s, pythonCmd: e.target.value }))}
                    placeholder="python"
                  />
                  <span className="field-hint">Used when Groq key is absent or fails</span>
                </div>
              </div>
              <div className="settings-section">
                <p className="settings-section-title">Accuracy & Formatting Tuning</p>
                <div className="field-group">
                  <label className="field-label">Custom Vocabulary</label>
                  <input
                    type="text"
                    className="field-input"
                    value={settings.customVocabulary ?? ""}
                    onChange={(e) => setSettings((s) => ({ ...s, customVocabulary: e.target.value }))}
                    placeholder="Tauri, SQLite, Rust, Groq, Shreyas"
                  />
                  <span className="field-hint">Comma-separated list of jargon or proper nouns to guide spelling accuracy</span>
                </div>
                <div className="field-group">
                  <label className="field-label">Custom Formatting Instructions</label>
                  <textarea
                    className="field-input"
                    value={settings.customInstructions ?? ""}
                    onChange={(e) => setSettings((s) => ({ ...s, customInstructions: e.target.value }))}
                    placeholder="e.g. Always format headings in bold. Use British English spellings."
                    rows={3}
                    style={{ resize: "vertical", height: "auto" }}
                  />
                  <span className="field-hint">Instructions for LLM formatting (e.g. British English, specific markdown structures)</span>
                </div>
              </div>
              <button className="save-btn" onClick={saveSettings}>
                {saved ? "Saved ✓" : "Save settings"}
              </button>
            </div>
          </div>
        ) : activeNav === "profile" ? (
          <div className="profile-page">
            <div className="page-header">
              <h1 className="page-title">Profile</h1>
              <button className="close-btn" onClick={() => setActiveNav("home")} aria-label="Close profile">✕</button>
            </div>
            <div className="profile-body">
              <div className="profile-avatar-lg">
                {user.photoURL
                  ? <img src={user.photoURL} className="profile-photo" alt="" />
                  : <img src={logo} className="profile-logo-img" alt="" />
                }
              </div>
              <h2 className="profile-name">{user.displayName ?? "User"}</h2>
              <p className="profile-email">{user.email ?? ""}</p>
              <div className="profile-stats-row">
                <div className="profile-stat">
                  <span className="profile-stat-value">{days}</span>
                  <span className="profile-stat-label">{days === 1 ? "day" : "days"} active</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-value">{formatWords(words)}</span>
                  <span className="profile-stat-label">words dictated</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-value">{transcripts.length}</span>
                  <span className="profile-stat-label">recordings</span>
                </div>
              </div>
              <div className="profile-actions">
                <button className="logout-btn" onClick={() => signOutUser().catch(console.error)}>
                  <IcLogOut />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        ) : activeNav === "help" ? (
          <div className="help-page">
            <div className="page-header">
              <h1 className="page-title">Help</h1>
              <button className="close-btn" onClick={() => setActiveNav("home")} aria-label="Close help">✕</button>
            </div>
            <div className="help-body">
              <div className="help-section">
                <div className="help-step-num">1</div>
                <div className="help-step-content">
                  <h3 className="help-step-title">Start dictating</h3>
                  <p className="help-step-desc">Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd> and speak. Release both keys when you're done.</p>
                </div>
              </div>
              <div className="help-section">
                <div className="help-step-num">2</div>
                <div className="help-step-content">
                  <h3 className="help-step-title">Text is typed automatically</h3>
                  <p className="help-step-desc">After you release, Whisprly transcribes your speech and types it into whatever app or text field was focused before you pressed the hotkey.</p>
                </div>
              </div>
              <div className="help-section">
                <div className="help-step-num">3</div>
                <div className="help-step-content">
                  <h3 className="help-step-title">Your history is saved here</h3>
                  <p className="help-step-desc">Every transcription appears in the Home feed. Click any entry to copy it. Hover to reveal the delete button.</p>
                </div>
              </div>
              <div className="help-section">
                <div className="help-step-num">4</div>
                <div className="help-step-content">
                  <h3 className="help-step-title">Works best with a Groq key</h3>
                  <p className="help-step-desc">Groq gives you fast, accurate cloud transcription. Go to <strong>Settings</strong> and paste your free API key from console.groq.com.</p>
                </div>
              </div>
              <div className="help-section">
                <div className="help-step-num">5</div>
                <div className="help-step-content">
                  <h3 className="help-step-title">Tips</h3>
                  <p className="help-step-desc">
                    — Click any transcript to copy it to clipboard<br />
                    — Works in any app: Word, Chrome, VS Code, Slack<br />
                    — The floating pill shows recording / transcribing status<br />
                    — Click the pill to cancel a recording
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="content-header">
              <div className="header-row">
                <div>
                  <p className="header-greeting">{getGreeting()}</p>
                  <h1 className="welcome">{`Welcome back, ${user.displayName?.split(" ")[0] ?? "there"}`}</h1>
                </div>
                <div className="header-actions">
                  <button className="header-action-btn" aria-label="Notifications">
                    <IcBell />
                  </button>
                  <button
                    className="header-action-btn"
                    aria-label={lightMode ? "Switch to dark mode" : "Switch to light mode"}
                    onClick={() => setLightMode(m => !m)}
                  >
                    {lightMode ? <IcMoon /> : <IcSun />}
                  </button>
                  <div
                    className="header-avatar-btn"
                    title="View profile"
                    style={{ cursor: "pointer", overflow: "hidden" }}
                    onClick={() => setActiveNav("profile")}
                  >
                    {user.photoURL
                      ? <img src={user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      : user.displayName?.[0]?.toUpperCase() ?? "S"
                    }
                  </div>
                </div>
              </div>
              <p className="subtitle">Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd> to dictate</p>
            </div>

            {/* Bento Grid Layout */}
            <div className="bento-grid">
              
              {/* Column 1: History Feed Card */}
              <section className="bento-card bento-feed-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="12" height="12" rx="1.5" />
                      <line x1="5" y1="6" x2="11" y2="6" />
                      <line x1="5" y1="9" x2="11" y2="9" />
                    </svg>
                    Transcription Feed
                  </h2>
                </div>

                <input
                  className="search-input"
                  type="search"
                  placeholder="Search transcripts…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ marginBottom: "12px" }}
                />

                {displayList.length > 0 && searchResults === null && (
                  <div className="feed-header" style={{ padding: 0, marginBottom: "8px", border: "none" }}>
                    <button className="clear-all-btn" onClick={clearAll}>Clear all</button>
                  </div>
                )}

                <div className="bento-feed-list">
                  {displayList.length === 0 ? (
                    searchResults !== null ? (
                      <div className="empty">
                        <p className="empty-title">No results</p>
                        <p className="empty-sub">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="empty">
                        <div className="empty-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="2" width="6" height="12" rx="3" />
                            <path d="M5 10a7 7 0 0 0 14 0" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                            <line x1="8" y1="22" x2="16" y2="22" />
                          </svg>
                        </div>
                        <p className="empty-title">No recordings yet</p>
                        <p className="empty-sub">Press your hotkey and start speaking</p>
                        <div className="empty-kbd-row">
                          <kbd>Ctrl</kbd>
                          <span className="empty-kbd-sep">+</span>
                          <kbd>Win</kbd>
                        </div>
                      </div>
                    )
                  ) : (
                    Object.entries(groups).map(([date, entries]) => (
                      <div key={date} className="date-group" style={{ animation: "none", padding: 0 }}>
                        <div className="date-label">{date}</div>
                        {entries.map((t, i) => {
                          const key    = `${t.timestamp}-${i}`;
                          const copied = copiedKey === key;
                          return (
                            <div
                              key={key}
                              className={`entry${copied ? " entry--copied" : ""}`}
                              style={{ "--entry-index": Math.min(i, 5) } as React.CSSProperties}
                              onClick={() => copyEntry(t.text, key)}
                              title="Click to copy"
                            >
                              <div className="entry-header">
                                <div className="entry-time">{formatTime(t.timestamp)}</div>
                                <div className="entry-actions">
                                  <span className={`entry-copy${copied ? " entry-copy--done" : ""}`} aria-hidden="true">
                                    {copied ? <IcCheck /> : <IcCopy />}
                                  </span>
                                  <span
                                    className="entry-delete"
                                    aria-label="Delete"
                                    onClick={e => { e.stopPropagation(); deleteEntry(t.id); }}
                                  >
                                    <IcTrash />
                                  </span>
                                </div>
                              </div>
                              <p className="entry-text">{t.text}</p>
                              {t.mode && (
                                <div className="entry-footer">
                                  <span className="mode-badge">{t.mode}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Column 2: Active Recorder & Stats Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Recorder Card */}
                <section className="bento-card bento-recorder-card">
                  <div className="bento-recorder-state">
                    <span className={`bento-state-indicator bento-state-indicator--${status}`}>
                      {status !== "idle" && <span className={`bento-recording-dot bento-recording-dot--${status}`} />}
                      {status === "idle" ? "Ready" : status === "recording" ? "Recording Active" : "Transcribing…"}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--text-3)" }}>
                      {status === "idle" ? "Shortcut: Ctrl + Win" : `Mode: ${outputMode.toUpperCase()}`}
                    </span>
                  </div>

                  <div className={`bento-waveform-container bento-waveform-container--${status}`}>
                    {status === "idle" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "var(--text-3)", textAlign: "center" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                          <rect x="9" y="2" width="6" height="12" rx="3" />
                          <path d="M5 10a7 7 0 0 0 14 0" />
                          <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                        <span style={{ fontSize: "10px", fontWeight: 500 }}>Hold hotkey to record</span>
                      </div>
                    ) : (
                      Array.from({ length: 16 }).map((_, i) => (
                        <span key={i} className="bento-wave-bar" />
                      ))
                    )}
                  </div>

                  <div className="bento-recorder-stats">
                    <span className="bento-timer">
                      {status === "recording" ? formatRecordingTime(recordingSeconds) : status === "transcribing" ? "..." : "00:00"}
                    </span>
                    <div className="bento-controls">
                      {status !== "idle" && (
                        <button className="bento-control-btn bento-control-btn--primary" onClick={() => invoke("stop_recording").catch(() => {})}>
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="stat-card" style={{ margin: 0, padding: "14px 16px" }}>
                    <span className="stat-value" style={{ color: "var(--accent)" }}>{days} days</span>
                    <span className="stat-label">Active Streak 🔥</span>
                  </div>
                  <div className="stat-card" style={{ margin: 0, padding: "14px 16px" }}>
                    <span className="stat-value" style={{ color: "var(--green)" }}>{formatWords(words)}</span>
                    <span className="stat-label">Words Dictated ✍️</span>
                  </div>
                </div>

              </div>

              {/* Column 3: Custom Vocab & Style Presets */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Vocabulary Cloud */}
                <section className="bento-card">
                  <div className="card-header">
                    <h2 className="card-title">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 3A1.5 1.5 0 0 1 4.5 1.5H13.5v12H4.5A1.5 1.5 0 0 1 3 12V3z" />
                        <path d="M3 12A1.5 1.5 0 0 0 4.5 13.5H13.5" />
                        <line x1="6.5" y1="5" x2="10.5" y2="5" />
                      </svg>
                      Vocabulary
                    </h2>
                  </div>

                  <div className="vocab-tags-container">
                    {(settings.customVocabulary
                      ? settings.customVocabulary.split(",").map(t => t.trim()).filter(Boolean)
                      : []
                    ).map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                        <button className="tag-delete" onClick={() => handleDeleteTag(tag)}>✕</button>
                      </span>
                    ))}
                  </div>

                  <div className="tag-input-wrapper">
                    <input
                      type="text"
                      className="tag-input"
                      placeholder="Add proper noun..."
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddTag(); }}
                    />
                    <button className="tag-add-btn" onClick={handleAddTag}>+</button>
                  </div>
                </section>

                {/* Formatting Style Presets */}
                <section className="bento-card">
                  <div className="card-header">
                    <h2 className="card-title">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M8 1.5l1.7 3.5 3.8.55-2.75 2.65.65 3.8L8 10.3l-3.4 1.7.65-3.8L2.5 5.55l3.8-.55L8 1.5z" />
                      </svg>
                      Formatting Style
                    </h2>
                  </div>

                  <div className="presets-list">
                    {([
                      { id: "auto", name: "Smart Auto", desc: "Format based on active app", icon: "🤖" },
                      { id: "prose", name: "Clean Prose", desc: "Structured paragraphs", icon: "✍️" },
                      { id: "email", name: "Email Formal", desc: "Add email layouts/greetings", icon: "✉️" },
                      { id: "code", name: "Code / CLI", desc: "Raw CLI commands & snippets", icon: "💻" }
                    ] as const).map(p => (
                      <div
                        key={p.id}
                        className={`preset-card${outputMode === p.id ? " preset-card--active" : ""}`}
                        onClick={() => {
                          setOutputMode(p.id);
                          invoke("set_output_mode", { mode: p.id }).catch(console.error);
                        }}
                      >
                        <div className="preset-icon">{p.icon}</div>
                        <div className="preset-info">
                          <span className="preset-name">{p.name}</span>
                          <span className="preset-desc">{p.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>

            </div>
          </>
        )}
        </div>
      </main>

      {setupProgress && (
        <div className={`setup-bar${setupProgress.stage === "error" ? " setup-bar--error" : ""}`}>
          <span className="setup-bar__icon">
            {setupProgress.stage === "error" ? "✕" : "⬇"}
          </span>
          <span className="setup-bar__message">{setupProgress.message}</span>
          {setupProgress.stage !== "error" && (
            <div className="setup-bar__track">
              <div
                className="setup-bar__fill"
                style={{ width: `${setupProgress.percent}%` }}
              />
            </div>
          )}
          {setupProgress.stage !== "error" && (
            <span className="setup-bar__percent">
              {setupProgress.percent}%
            </span>
          )}
        </div>
      )}

      {showToast && (
        <div className="setup-toast">✓ {toastMessage}</div>
      )}
    </div>
  );
}
