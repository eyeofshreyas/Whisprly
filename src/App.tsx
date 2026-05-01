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

const BAR_COUNT = 28;
const HEIGHTS = [3, 6, 10, 16, 22, 18, 12, 7, 4, 8, 14, 20, 24, 18, 10, 6, 3, 7, 13, 20, 22, 16, 9, 5, 3, 8, 15, 10];

function Waveform({ status }: { status: Status }) {
  return (
    <div className={`waveform waveform--${status}`}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i % HEIGHTS.length]}px`,
            animationDelay: `${(i * 0.045).toFixed(3)}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ groqApiKey: "", pythonCmd: "python" });
  const [showSettings, setShowSettings] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke<TranscriptEntry[]>("get_transcript_log").then(setTranscripts).catch(() => {});
    invoke<Settings>("get_settings").then(setSettings).catch(() => {});

    const unStatus = listen<StatusPayload>("status", (e) => {
      setStatus(e.payload.status);
      setStatusMsg(e.payload.message ?? "");
    });
    const unTranscript = listen<TranscriptEntry>("transcript", (e) => {
      setTranscripts((prev) => [e.payload, ...prev].slice(0, 50));
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

  const statusLabel = { idle: "Hold Ctrl + Win to speak", recording: "Listening...", transcribing: "Transcribing..." }[status];

  return (
    <div className="app">
      <header>
        <span className="logo">WisperFlow</span>
        <div className="header-right">
          <span className="lang-badge">EN · HI</span>
          <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} title="Settings">
            {showSettings ? "✕" : "⚙"}
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="panel">
          <h2>Settings</h2>
          <label>
            Groq API Key
            <input
              type="password"
              value={settings.groqApiKey}
              onChange={(e) => setSettings((s) => ({ ...s, groqApiKey: e.target.value }))}
              placeholder="gsk_..."
            />
          </label>
          <label>
            Python command
            <input
              type="text"
              value={settings.pythonCmd}
              onChange={(e) => setSettings((s) => ({ ...s, pythonCmd: e.target.value }))}
              placeholder="python"
            />
          </label>
          <button onClick={saveSettings}>{saved ? "Saved ✓" : "Save"}</button>
        </div>
      )}

      <div className="transcripts">
        {transcripts.length === 0 ? (
          <p className="empty">No transcripts yet</p>
        ) : (
          transcripts.map((t, i) => (
            <div key={i} className="entry">
              <div className="entry-meta">
                <span className="badge">{t.engine}</span>
                <span className="time">{new Date(t.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
              <p className="entry-text">{t.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="bottom-bar">
        <div className={`recorder-pill recorder-pill--${status}`}>
          <Waveform status={status} />
        </div>
        <p className="status-label">
          {statusMsg || statusLabel}
        </p>
      </div>
    </div>
  );
}
