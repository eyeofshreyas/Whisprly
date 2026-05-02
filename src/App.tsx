import "./index.css";
import { memo, useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

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

const BAR_COUNT = 24;
const HEIGHTS = [3, 6, 10, 16, 22, 18, 12, 7, 4, 8, 14, 20, 24, 18, 10, 6, 3, 7, 13, 20, 22, 16, 9, 5];

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
            animationDelay: `${(i * 0.045).toFixed(3)}s`,
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

  const saveSettings = useCallback(async () => {
    await invoke("save_settings", { groqApiKey: settings.groqApiKey, pythonCmd: settings.pythonCmd });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const copyEntry = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }).catch(() => {});
  }, []);

  const words  = totalWords(transcripts);
  const days   = activeDays(transcripts);
  const groups = groupByDate(transcripts);

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <svg className="brand-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#7c3aed" />
              <rect x="11.5" y="6" width="9" height="14" rx="4.5" fill="white" />
              <path d="M7.5 16c0 4.694 3.806 8.5 8.5 8.5s8.5-3.806 8.5-8.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" fill="none" />
              <line x1="16" y1="24.5" x2="16" y2="27.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
              <line x1="11.5" y1="27.5" x2="20.5" y2="27.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <span className="brand-name">Whisprly</span>
            <span className="pro-badge">PRO</span>
          </div>

          <nav className="nav">
            {NAV_ITEMS.map(({ id, Icon, label }) => (
              <button
                key={id}
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
            onClick={() => { setActiveNav("home"); setShowSettings(true); }}
            aria-label="Open settings"
          >
            <IcSettings />
            <span className="nav-label">Settings</span>
          </button>
          <button className="sidebar-util" aria-label="Help">
            <IcHelp />
            <span className="nav-label">Help</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="content">
        {showSettings ? (
          <div className="settings-page">
            <div className="page-header">
              <h1 className="page-title">Settings</h1>
              <button className="close-btn" onClick={() => setShowSettings(false)} aria-label="Close settings">✕</button>
            </div>
            <div className="settings-form">
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
                <label className="field-label">Python command</label>
                <input
                  type="text"
                  className="field-input"
                  value={settings.pythonCmd}
                  onChange={(e) => setSettings((s) => ({ ...s, pythonCmd: e.target.value }))}
                  placeholder="python"
                />
                <span className="field-hint">Local Whisper fallback</span>
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
              <h1 className="welcome">Welcome back</h1>
              <p className="subtitle">Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd> to dictate</p>
            </div>

            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-value">{days}</span>
                <span className="stat-label">{days === 1 ? "day" : "days"} active</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{formatWords(words)}</span>
                <span className="stat-label">words dictated</span>
              </div>
              <div className="stat-card">
                <span className={`stat-dot stat-dot--${status}`} />
                <span className="stat-label stat-status">
                  {statusMsg || (status === "idle" ? "Ready" : status === "recording" ? "Recording" : "Transcribing")}
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                  </div>
                  <p className="empty-title">No recordings yet</p>
                  <p className="empty-sub">Hold Ctrl + Win to start speaking</p>
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
                          onClick={() => copyEntry(t.text, key)}
                          title="Click to copy"
                        >
                          <div className="entry-time">{formatTime(t.timestamp)}</div>
                          <div className="entry-body">
                            <p className="entry-text">{t.text}</p>
                            <span className={`engine-badge engine-badge--${t.engine}`}>{t.engine}</span>
                          </div>
                          <span className={`entry-copy${copied ? " entry-copy--done" : ""}`} aria-hidden="true">
                            {copied ? <IcCheck /> : <IcCopy />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
