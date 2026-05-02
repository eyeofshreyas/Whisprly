import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./overlay.css";

type Status = "idle" | "recording" | "transcribing";

const BAR_COUNT = 24;
const HEIGHTS = [3, 6, 11, 17, 24, 28, 24, 18, 12, 7, 4, 9, 16, 22, 26, 22, 16, 10, 6, 4, 8, 15, 21, 17];

function Waveform({ status }: { status: Status }) {
  return (
    <div className={`ov-waveform ov-waveform--${status}`}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="ov-wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i % HEIGHTS.length]}px`,
            animationDelay: `${(i * 0.04).toFixed(3)}s`,
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
      title={status === "recording" ? "Click to stop" : undefined}
    >
      <div className="ov-left">
        <span className="ov-dot" />
        <span className="ov-label">
          {status === "recording" ? "Listening" : "Transcribing"}
        </span>
      </div>
      <Waveform status={status} />
    </div>
  );
}
