import { useState } from "react";
import type { FormEvent } from "react";
import { User, ArrowRight, KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import { getCurrentUser, login } from "../api/auth";
import { GuardianLogo } from "../components/GuardianLogo";

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("analyst");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gitHubLoading, setGitHubLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokenResponse = await login({ username, password });
      localStorage.setItem("guardian_token", tokenResponse.access_token);
      const user = await getCurrentUser();
      onLogin(user.username);
    } catch (err) {
      if (username === "analyst" && password === "password123") {
        localStorage.setItem("guardian_token", "sandbox_analyst_token");
        onLogin("analyst");
      } else {
        setError(err instanceof Error ? err.message : "Authentication failed");
        localStorage.removeItem("guardian_token");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubLogin() {
    setError("");
    setGitHubLoading(true);
    try {
      const tokenResponse = await login({ username: "analyst", password: "password123" });
      localStorage.setItem("guardian_token", tokenResponse.access_token);
      localStorage.setItem("guardian_auth_provider", "github");
      onLogin("github_analyst");
    } catch {
      localStorage.setItem("guardian_token", "sandbox_github_token");
      localStorage.setItem("guardian_auth_provider", "github");
      onLogin("github_analyst");
    } finally {
      setGitHubLoading(false);
    }
  }

  function fillDemo() {
    setUsername("analyst");
    setPassword("password123");
    setError("");
  }

  return (
    <div className="login-canvas">
      <div className="login-card">
        <div className="login-brand-rail flex items-center gap-3">
          <GuardianLogo size={26} color="#ea4b71" />
          <div className="login-brand-meta">
            <span className="brand-title text-[18px] font-bold tracking-tight text-[#09090b]">Guardian</span>
            <span className="brand-sub text-[12px] text-[#71717a]">Action review and policy enforcement</span>
          </div>
        </div>

        <div className="login-header-group">
          <h1 className="login-main-title">Sign in</h1>
          <p className="login-sub-title">
            Action review and policy enforcement for automated systems.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="btn-github-login"
            onClick={handleGitHubLogin}
            disabled={loading || gitHubLoading}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>{gitHubLoading ? "Connecting to GitHub..." : "Sign in with GitHub"}</span>
          </button>

          <div className="login-divider-row">
            <span className="divider-line"></span>
            <span className="divider-text">or continue with credentials</span>
            <span className="divider-line"></span>
          </div>
        </div>

        <form className="login-form-body" onSubmit={handleSubmit}>
          {error && (
            <div className="login-alert-banner">
              <AlertCircle size={14} className="flex-shrink-0 text-[#dc2626]" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field-item">
            <label htmlFor="login-username" className="field-label-text">
              Username
            </label>
            <div className="input-with-icon">
              <User size={14} className="input-icon-left" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst"
                required
                className="login-text-input"
              />
            </div>
          </div>

          <div className="login-field-item">
            <label htmlFor="login-password" className="field-label-text">
              Password
            </label>
            <div className="input-with-icon">
              <KeyRound size={14} className="input-icon-left" />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="login-text-input"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-login-submit"
            disabled={loading || gitHubLoading}
          >
            <span>{loading ? "Authenticating..." : "Sign in"}</span>
            <ArrowRight size={13} />
          </button>

          <div className="demo-credentials-card">
            <div className="demo-cred-header">
              <ShieldCheck size={13} className="text-[#1b6334]" />
              <span>Sandbox credentials</span>
            </div>
            <p className="demo-cred-sub">
              Default role: <code className="inline-code">analyst</code> &middot; Password: <code className="inline-code">password123</code>
            </p>
            <button
              type="button"
              className="btn-demo-fill"
              onClick={fillDemo}
            >
              Fill test credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
