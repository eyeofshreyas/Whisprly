import logo from "./assets/logo.png";
import { signInWithGoogle } from "./auth";

interface Props {
  onSignIn: () => void;
}

function IcGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.34 22.56 15.52 22.56 12.25z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginScreen({ onSignIn }: Props) {
  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
      onSignIn();
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
      padding: "40px 32px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 360,
        background: "var(--bg-card)",
        border: "1px solid var(--border-bright)",
        borderRadius: "var(--radius-lg)",
        padding: "40px 36px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        boxShadow: "0 8px 48px rgba(0,0,0,0.24)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            background: "linear-gradient(135deg, var(--cyan), var(--violet))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 24px rgba(0,212,255,0.30)",
          }}>
            <img src={logo} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(10) saturate(0)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 24,
              color: "var(--text-0)",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}>
              Welcome to Whisprly
            </h1>
            <p style={{
              fontSize: 14,
              color: "var(--text-2)",
              marginTop: 6,
              lineHeight: 1.5,
            }}>
              Sign in to sync your transcripts across sessions
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: "var(--border)" }} />

        {/* Sign-in button */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: "100%",
            padding: "13px 20px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-bright)",
            cursor: "pointer",
            background: "var(--bg-surface)",
            color: "var(--text-0)",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "background var(--transition), border-color var(--transition)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card-hover)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cyan)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-bright)";
          }}
        >
          <IcGoogle />
          Continue with Google
        </button>

        <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
