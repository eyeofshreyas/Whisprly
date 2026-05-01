import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./overlay.css";

type Status = "idle" | "recording" | "transcribing";

const HEIGHTS = [3, 5, 9, 14, 19, 15, 10, 6, 3, 7, 12, 17, 20, 15, 9, 5, 3, 6, 11, 17, 19, 14, 8, 4];

function Waveform({ status }: { status: Status }) {
  return (
    <div className={`ov-waveform ov-waveform--${status}`}>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="ov-wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i % HEIGHTS.length]}px`,
            animationDelay: `${(i * 0.05).toFixed(3)}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function Overlay() {
  const [status, setStatus] = useState<Status>("recording");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = listen<{ status: Status; message?: string }>("status", (e) => {
      setStatus(e.payload.status);
      setMsg(e.payload.message ?? "");
    });
    return () => { unsub.then((f) => f()); };
  }, []);

  const label = { idle: "", recording: "Listening...", transcribing: "Transcribing..." }[status];

  return (
    <div className={`ov-root ov-root--${status}`}>
      <Waveform status={status} />
      <span className="ov-label">{msg || label}</span>
      {status === "recording" && (
        <button
          className="ov-stop"
          onClick={() => invoke("stop_recording").catch(() => {})}
          title="Stop"
        >
          <span className="ov-stop-icon" />
        </button>
      )}
    </div>
  );
}
