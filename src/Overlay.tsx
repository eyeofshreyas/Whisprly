import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./overlay.css";

type Status = "idle" | "recording" | "transcribing";

const HEIGHTS = [3, 6, 11, 16, 20, 16, 10, 5, 3, 8, 14, 18];

function Waveform({ status }: { status: Status }) {
  return (
    <div className={`ov-waveform ov-waveform--${status}`}>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="ov-wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i]}px`,
            animationDelay: `${(i * 0.06).toFixed(3)}s`,
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

  return (
    <div className={`ov-root ov-root--${status}`}>
      <Waveform status={status} />
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
