import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import "./overlay.css";

type Status = "idle" | "recording" | "transcribing";

const HEIGHTS = [3, 6, 10, 16, 22, 18, 12, 7, 4, 8, 14, 20, 24, 18, 10, 6, 3, 7, 13, 20, 22, 16, 9, 5, 3, 8, 15, 10];

function Waveform({ status }: { status: Status }) {
  return (
    <div className={`ov-waveform ov-waveform--${status}`}>
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="ov-wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i % HEIGHTS.length]}px`,
            animationDelay: `${(i * 0.045).toFixed(3)}s`,
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
    </div>
  );
}
