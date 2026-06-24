import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./overlay.css";

type Status = "idle" | "recording" | "transcribing";

const HEIGHTS = [2, 5, 8, 11, 8, 4, 7, 3];

function IcSpinner() {
  return (
    <svg className="ov-spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.12)" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function Waveform({ status }: { status: Status }) {
  const barCount = 8;
  return (
    <div className={`ov-waveform ov-waveform--${status}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className="ov-wave-bar"
          style={{
            "--base-h": `${HEIGHTS[i % HEIGHTS.length]}px`,
            animationDelay: `${(i * 0.06).toFixed(3)}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function Overlay() {
  const [status, setStatus] = useState<Status>("recording");
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem("whisprly_accent_color") || "amber";
  });

  useEffect(() => {
    const unsub = listen<{ status: Status }>("status", (e) => {
      setStatus(e.payload.status);
    });
    return () => { unsub.then((f) => f()); };
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setAccentColor(localStorage.getItem("whisprly_accent_color") || "amber");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (accentColor === "purple") {
      root.style.setProperty("--accent-overlay-glow", "rgba(168, 85, 247, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#a855f7");
      root.style.setProperty("--accent-overlay-color2", "#ec4899");
    } else if (accentColor === "blue") {
      root.style.setProperty("--accent-overlay-glow", "rgba(59, 130, 246, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#3b82f6");
      root.style.setProperty("--accent-overlay-color2", "#06b6d4");
    } else if (accentColor === "pink") {
      root.style.setProperty("--accent-overlay-glow", "rgba(236, 72, 153, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#ec4899");
      root.style.setProperty("--accent-overlay-color2", "#f43f5e");
    } else if (accentColor === "amber") {
      root.style.setProperty("--accent-overlay-glow", "rgba(232, 128, 58, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#E8803A");
      root.style.setProperty("--accent-overlay-color2", "#D99040");
    } else if (accentColor === "green") {
      root.style.setProperty("--accent-overlay-glow", "rgba(16, 185, 129, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#10b981");
      root.style.setProperty("--accent-overlay-color2", "#3b82f6");
    } else if (accentColor === "teal") {
      root.style.setProperty("--accent-overlay-glow", "rgba(6, 182, 212, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#06b6d4");
      root.style.setProperty("--accent-overlay-color2", "#22d3ee");
    } else if (accentColor === "rose") {
      root.style.setProperty("--accent-overlay-glow", "rgba(244, 63, 94, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#f43f5e");
      root.style.setProperty("--accent-overlay-color2", "#fda4af");
    } else if (accentColor === "yellow") {
      root.style.setProperty("--accent-overlay-glow", "rgba(234, 179, 8, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#eab308");
      root.style.setProperty("--accent-overlay-color2", "#fef08a");
    } else if (accentColor === "indigo") {
      root.style.setProperty("--accent-overlay-glow", "rgba(99, 102, 241, 0.25)");
      root.style.setProperty("--accent-overlay-color1", "#6366f1");
      root.style.setProperty("--accent-overlay-color2", "#a5b4fc");
    }
  }, [accentColor]);

  const handleClick = () => {
    if (status === "recording") {
      invoke("stop_recording").catch(() => {});
    }
  };

  return (
    <div
      className={`ov-root ov-root--${status}`}
      onClick={handleClick}
      data-tauri-drag-region
      title={status === "recording" ? "Click to stop • Drag to reposition" : "Drag to reposition"}
    >
      <div className="ov-content" data-tauri-drag-region>
        {status === "transcribing" ? <IcSpinner /> : <Waveform status={status} />}
      </div>
    </div>
  );
}
