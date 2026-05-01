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
    await invoke("save_settings", {
      groqApiKey: settings.groqApiKey,
      pythonCmd: settings.pythonCmd,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const dot = { idle: "#6b7280", recording: "#ef4444", transcribing: "#f59e0b" }[status];
  const label = { idle: "Idle", recording: "Recording...", transcribing: "Transcribing..." }[status];

  return (
    <div className="app">
      <header>
        <h1>WisperFlow</h1>
        <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} title="Settings">
          {showSettings ? "✕" : "⚙"}
        </button>
      </header>

      <div className="status-bar">
        <span className="dot" style={{ background: dot }} />
        <span className="status-label">{label}</span>
        {statusMsg && <span className="status-msg">{statusMsg}</span>}
      </div>

      <p className="hint">
        Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd> to dictate
      </p>

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
        <h2>Recent Transcripts</h2>
        {transcripts.length === 0 ? (
          <p className="empty">No transcripts yet — start dictating!</p>
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
    </div>
  );
}
