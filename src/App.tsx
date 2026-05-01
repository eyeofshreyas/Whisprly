import "./index.css";
import { useEffect, useState, useCallback } from "react";
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

function MiniWaveform({ status }: { status: Status }) {
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
}

function NavIcon({ icon }: { icon: string }) {
  return <span className="nav-icon">{icon}</span>;
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  }
  return groups;
}

function totalWords(entries: TranscriptEntry[]) {
  return entries.reduce((sum, e) => sum + e.text.split(/\s+/).filter(Boolean).length, 0);
}

function streakDays(entries: TranscriptEntry[]) {
  const days = new Set(entries.map((e) => new Date(e.timestamp * 1000).toDateString()));
  return days.size;
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ groqApiKey: "", pythonCmd: "python" });
  const [showSettings, setShowSettings] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeNav, setActiveNav] = useState("home");

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

  const words = totalWords(transcripts);
  const streak = streakDays(transcripts);
  const groups = groupByDate(transcripts);

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-name">Whisprly</span>
            <span className="pro-badge">PRO</span>
          </div>

          <nav className="nav">
            {[
              { id: "home", icon: "⌂", label: "Home" },
              { id: "dictionary", icon: "◈", label: "Dictionary" },
              { id: "snippets", icon: "❐", label: "Snippets" },
              { id: "style", icon: "◉", label: "Style" },
              { id: "notes", icon: "☰", label: "Notes" },
            ].map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? "nav-item--active" : ""}`}
                onClick={() => setActiveNav(item.id)}
              >
                <NavIcon icon={item.icon} />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-util" onClick={() => { setActiveNav("home"); setShowSettings(true); }}>
            <NavIcon icon="⚙" />
            <span className="nav-label">Settings</span>
          </button>
          <button className="sidebar-util">
            <NavIcon icon="?" />
            <span className="nav-label">Help</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="content">
        {showSettings && activeNav === "home" ? (
          <div className="settings-page">
            <div className="page-header">
              <h1 className="page-title">Settings</h1>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
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
                <span className="field-hint">Used for fast cloud transcription via Groq Whisper</span>
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
                <span className="field-hint">Used for local Whisper fallback</span>
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
              <div className="header-text">
                <h1 className="welcome">Welcome back</h1>
                <p className="subtitle">Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd> to dictate</p>
              </div>
              <button className="settings-trigger" onClick={() => setShowSettings(true)} title="Settings">
                ⚙
              </button>
            </div>

            {/* Stats row */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-value">{streak}</span>
                <span className="stat-label">{streak === 1 ? "day" : "day"} streak</span>
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
                  {status === "recording" ? "Listening..." : "Transcribing..."}
                </span>
              </div>
            )}

            {/* Transcript feed */}
            <div className="feed">
              {transcripts.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🎙</div>
                  <p className="empty-title">No recordings yet</p>
                  <p className="empty-sub">Hold Ctrl + Win to start speaking</p>
                </div>
              ) : (
                Object.entries(groups).map(([date, entries]) => (
                  <div key={date} className="date-group">
                    <div className="date-label">{date}</div>
                    {entries.map((t, i) => (
                      <div key={i} className="entry">
                        <div className="entry-time">{formatTime(t.timestamp)}</div>
                        <div className="entry-body">
                          <p className="entry-text">{t.text}</p>
                          <span className={`engine-badge engine-badge--${t.engine}`}>{t.engine}</span>
                        </div>
                      </div>
                    ))}
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
