import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./overlay.css";

type Status = "idle" | "recording" | "transcribing";

const HEIGHTS = [2, 5, 8, 12, 10, 7, 4, 2, 6, 10, 8, 5, 3, 9, 7, 4];

function Waveform({ status }: { status: Status }) {
  return (
    <div className={`ov-waveform ov-waveform--${status}`}>
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="ov-wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i]}px`,
            animationDelay: `${(i * 0.055).toFixed(3)}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function Overlay() {
  const [status, setStatus] = useState<Status>("recording");

  useEffect(() => {
    const unsub = listen<{ status: Status }>("status", (e) => {
      setStatus(e.payload.status);
    });
    return () => { unsub.then((f) => f()); };
  }, []);

  const handleClick = () => {
    if (status === "recording") invoke("stop_recording").catch(() => {});
  };

  return (
    <div
      className={`ov-root ov-root--${status}`}
      onClick={handleClick}
      data-tauri-drag-region
      title={status === "recording" ? "Click to stop • Drag to reposition" : "Drag to reposition"}
    >
      <Waveform status={status} />
    </div>
  );
}
