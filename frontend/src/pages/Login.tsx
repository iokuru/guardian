import { useState, type FormEvent } from "react";
import { getCurrentUser, login } from "../api/auth";

interface LoginProps { onLogin: (user: { username: string; role: string }) => void; }

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const token = await login({ username, password });
      localStorage.setItem("guardian_token", token.access_token);
      const user = await getCurrentUser();
      onLogin({ username: user.username, role: user.role });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); }
    finally { setLoading(false); }
  }

  return <main className="login-page page-enter"><div className="login-grid"><section className="login-brand"><div className="brand-row"><div className="brand-mark">G</div><div><div className="brand-name">GUARDIAN</div><div className="brand-subtitle">Security Control</div></div></div><div className="login-statement"><span>SECURE ACCESS</span><h1>Control what<br />your agents<br />can do.</h1><p>Policy enforcement for AI-powered systems and sensitive actions.</p></div><div className="login-footer"><span>RISK ENGINE</span><strong><i className="status-dot" /> Operational</strong></div></section><section className="login-form-area"><form className="login-form" onSubmit={handleSubmit}><div><div className="eyebrow">AUTHENTICATION</div><h2>Sign in</h2><p>Enter your GUARDIAN workspace credentials.</p></div><label>Username<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>{error && <div className="inline-error">{error}</div>}<button className="primary-button full" disabled={loading}>{loading ? "Authenticating..." : "Sign in"}<span>↗</span></button><small className="form-note">Protected by JWT authentication · Session expires after 30 minutes</small></form></section></div></main>;
}
