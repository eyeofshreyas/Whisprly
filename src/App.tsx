import "./index.css";
import logo from "./assets/logo.png";
import { memo, useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { onAuthChange, signOutUser, type User } from "./auth";
import {
  saveSettings as saveSettings_fs,
  loadSettings,
  saveTranscript,
  loadTranscripts,
} from "./firestore";
import LoginScreen from "./LoginScreen";

type Status = "idle" | "recording" | "transcribing";

interface TranscriptEntry {
  text: string;
  engine: string;
  timestamp: number;
}

interface StatusPayload {
  status: Status;
  message?: string;
}

interface Settings {
  groqApiKey: string;
  pythonCmd: string;
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

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatWords(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function groupByDate(entries: TranscriptEntry[]) {
  const groups: Record<string, TranscriptEntry[]> = {};
  for (const e of entries) {
    const d = new Date(e.timestamp * 1000);
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
  return new Set(entries.map((e) => new Date(e.timestamp * 1000).toDateString())).size;
}

// ── Nav data ──────────────────────────────────────────────────────────────────

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
  const [settings, setSettings]     = useState<Settings>({ groqApiKey: "", pythonCmd: "python" });
  const [showSettings, setShowSettings] = useState(false);
  const [saved, setSaved]           = useState(false);
  const [activeNav, setActiveNav]   = useState("home");
  const [copiedKey, setCopiedKey]   = useState<string | null>(null);
  const [lightMode, setLightMode]   = useState(false);
  const [user, setUser]           = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unStatus = listen<StatusPayload>("status", (e) => {
      setStatus(e.payload.status);
      setStatusMsg(e.payload.message ?? "");
    });

    const unAuth = onAuthChange(async (u) => {
      setUser(u);
      setAuthReady(true);

      if (u) {
        const fsSettings = await loadSettings(u.uid);
        if (fsSettings) {
          setSettings(fsSettings);
          await invoke("save_settings", {
            groqApiKey: fsSettings.groqApiKey,
            pythonCmd:  fsSettings.pythonCmd,
          }).catch(() => {});
        } else {
          const rustSettings = await invoke<Settings>("get_settings").catch(() => null);
          if (rustSettings) setSettings(rustSettings);
        }

        const fsTranscripts = await loadTranscripts(u.uid);
        setTranscripts(fsTranscripts.slice(0, 200));
      } else {
        setTranscripts([]);
        setSettings({ groqApiKey: "", pythonCmd: "python" });
      }
    });

    return () => {
      unStatus.then((f) => f());
      unAuth();
    };
  }, []);

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

  const copyEntry = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }).catch(() => {});
  }, []);

  const words  = totalWords(transcripts);
  const days   = activeDays(transcripts);
  const groups = groupByDate(transcripts);

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
    <div className={`app${lightMode ? " light-mode" : ""}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">
              <img src={logo} className="brand-logo" alt="" />
            </div>
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
            onClick={() => { setActiveNav("home"); setShowSettings(true); }}
          >
            <IcSettings />
            <span className="nav-label">Settings</span>
          </button>
          <button className="sidebar-util" aria-label="Help">
            <IcHelp />
            <span className="nav-label">Help</span>
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.displayName?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div className="user-info">
              <p className="user-name">{user.displayName ?? "User"}</p>
              <p className="user-plan">{user.email ?? ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="content">
        <div key={showSettings ? "settings" : "home"} className="content-page">
        {showSettings ? (
          <div className="settings-page">
            <div className="page-header">
              <h1 className="page-title">Settings</h1>
              <button className="close-btn" onClick={() => setShowSettings(false)} aria-label="Close settings">✕</button>
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
              <button className="save-btn" onClick={saveSettings}>
                {saved ? "Saved ✓" : "Save settings"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="content-header">
              <div className="header-row">
                <div>
                  <p className="header-greeting">{getGreeting()}</p>
                  <h1 className="welcome">Welcome back, Shreyas</h1>
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
                    title="Sign out"
                    style={{ cursor: "pointer" }}
                    onClick={() => signOutUser().catch(console.error)}
                  >
                    {user.displayName?.[0]?.toUpperCase() ?? "S"}
                  </div>
                </div>
              </div>
              <p className="subtitle">Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd> to dictate</p>
            </div>

            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-value stat-value--cyan">{days}</span>
                <span className="stat-label">{days === 1 ? "day" : "days"} active</span>
              </div>
              <div className="stat-card">
                <span className="stat-value stat-value--green">{formatWords(words)}</span>
                <span className="stat-label">words dictated</span>
              </div>
              <div className="stat-card">
                <span className={`status-ring status-ring--${status}`} />
                <span className="stat-label stat-status">
                  {statusMsg || (status === "idle" ? "Ready" : status === "recording" ? "Recording…" : "Transcribing…")}
                </span>
              </div>
            </div>

            {/* Waveform pill */}
            {status !== "idle" && (
              <div className={`wave-pill wave-pill--${status}`}>
                <MiniWaveform status={status} />
                <span className="wave-pill-label">
                  {status === "recording" ? "Listening…" : "Transcribing…"}
                </span>
              </div>
            )}

            {/* Transcript feed */}
            <div className="feed">
              {transcripts.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
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
              ) : (
                Object.entries(groups).map(([date, entries]) => (
                  <div key={date} className="date-group">
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
                            <span className={`entry-copy${copied ? " entry-copy--done" : ""}`} aria-hidden="true">
                              {copied ? <IcCheck /> : <IcCopy />}
                            </span>
                          </div>
                          <p className="entry-text">{t.text}</p>
                          <div className="entry-footer">
                            <span className={`engine-badge engine-badge--${t.engine}`}>{t.engine}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
