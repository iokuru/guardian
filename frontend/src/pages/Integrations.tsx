import { useState, useEffect } from "react";
import { Plus, Key, Copy, Check, Trash2, Code2, Globe, Shield } from "lucide-react";
import type { ApiKeyRecord } from "../types/guardian";
import { getApiKeys, createApiKey, revokeApiKey, getIntegrationSnippets } from "../api/client";
import { CodeBlock } from "../components/CodeBlock";
import { copyToClipboard } from "../utils/clipboard";

export function Integrations() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [snippets, setSnippets] = useState<{ language: string; filename: string; code: string }[]>([]);
  const [apiEndpoint, setApiEndpoint] = useState<string>("http://127.0.0.1:8000/analysis");
  const [activeLang, setActiveLang] = useState<string>("Python");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    Promise.allSettled([getApiKeys(), getIntegrationSnippets()]).then(([keysRes, snipsRes]) => {
      if (!isCurrent) return;
      if (keysRes.status === "fulfilled") {
        setKeys(keysRes.value);
      }
      if (snipsRes.status === "fulfilled") {
        if (snipsRes.value.api_endpoint) {
          setApiEndpoint(snipsRes.value.api_endpoint);
        }
        if (snipsRes.value.snippets && snipsRes.value.snippets.length > 0) {
          setSnippets(snipsRes.value.snippets);
          setActiveLang(snipsRes.value.snippets[0].language);
        }
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setError(null);

    try {
      const created = await createApiKey(newKeyName.trim(), ["action:evaluate", "reviews:read"]);
      setKeys((prev) => [created, ...prev]);
      if (created.key) {
        setGeneratedKey(created.key);
      }
      setNewKeyName("");
      setIsCreatingKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    }
  }

  async function handleRevoke(id: number) {
    try {
      await revokeApiKey(id);
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  }

  async function copyKey(text: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  async function copyEndpointText() {
    const ok = await copyToClipboard(apiEndpoint);
    if (ok) {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    }
  }

  const activeSnippet =
    snippets.find((s) => s.language.toLowerCase() === activeLang.toLowerCase()) || snippets[0];

  return (
    <div className="overview-editorial-wrap space-y-8">
      {/* Header */}
      <div className="page-header-block flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-main-heading">Integrations</h1>
          <p className="page-sub-heading">
            API credentials and client integration for automated systems and agent loops.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary flex items-center gap-1.5 self-start"
          onClick={() => {
            setIsCreatingKey(true);
            setGeneratedKey(null);
          }}
        >
          <Plus size={14} />
          <span>Create API key</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* New Key Notification Box */}
      {generatedKey && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <Key size={14} />
            <span>API key created successfully</span>
          </div>
          <p className="text-xs text-[#a1a1aa]">
            Copy this secret key now. For security purposes, it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#18181b] border border-[#27272a] px-3 py-2 rounded text-xs font-mono text-emerald-300 break-all">
              {generatedKey}
            </code>
            <button
              type="button"
              className="btn-secondary !h-8 !px-3"
              onClick={() => copyKey(generatedKey)}
            >
              {copiedKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedKey ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Key Dialog */}
      {isCreatingKey && (
        <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214] space-y-3">
          <h3 className="text-sm font-semibold text-white">Create API key</h3>
          <p className="text-xs text-[#71717a]">
            Provide an identifier for the automated agent or service calling Guardian.
          </p>
          <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <input
              type="text"
              placeholder="e.g. customer-support-agent"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#ea4b71]"
              autoFocus
            />
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                className="btn-secondary !h-8 !px-3"
                onClick={() => setIsCreatingKey(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary !h-8 !px-3"
                disabled={!newKeyName.trim()}
              >
                Generate key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 1. API Access Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
          <h2 className="section-title flex items-center gap-2">
            <Globe size={15} className="text-[#ea4b71]" />
            <span>API access</span>
          </h2>
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214] space-y-2">
            <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider block">API endpoint</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#18181b] border border-[#27272a] px-3 py-2 rounded text-xs font-mono text-zinc-200 truncate">
                {apiEndpoint}
              </code>
              <button
                type="button"
                className="btn-secondary !h-8 !px-2.5"
                onClick={copyEndpointText}
                title="Copy endpoint"
              >
                {copiedEndpoint ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214] space-y-2">
            <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider block">Authentication</span>
            <div className="bg-[#18181b] border border-[#27272a] px-3 py-2 rounded text-xs font-mono text-zinc-300">
              Authorization: Bearer gdn_live_••••••••
            </div>
          </div>
        </div>
      </div>

      {/* 2. API Keys Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
          <h2 className="section-title flex items-center gap-2">
            <Shield size={15} className="text-[#ea4b71]" />
            <span>API keys</span>
          </h2>
          <span className="text-xs text-[#71717a]">{keys.length} keys</span>
        </div>

        <div className="dev-table-container">
          <table className="dev-table">
            <thead>
              <tr>
                <th style={{ width: "220px" }}>Key name</th>
                <th style={{ width: "180px" }}>Key prefix</th>
                <th>Scopes</th>
                <th style={{ width: "140px" }}>Created</th>
                <th style={{ width: "100px", textAlign: "right" }}>Status</th>
                <th style={{ width: "60px" }}></th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-xs text-[#71717a]">
                    No API keys created yet. Click "Create API key" to generate one.
                  </td>
                </tr>
              ) : (
                keys.map((k) => {
                  const isRevoked = Boolean(k.revoked_at);
                  return (
                    <tr key={k.id} className="dev-table-row">
                      <td>
                        <strong className="text-xs text-[#09090b] dark:text-zinc-200">{k.name}</strong>
                      </td>
                      <td>
                        <code className="mono-text text-xs text-[#71717a] font-mono">
                          {k.prefix}••••••••
                        </code>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s, idx) => (
                            <span key={idx} className="tag-pill text-[10px] font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-[#71717a] font-mono">
                          {new Date(k.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            isRevoked
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isRevoked ? "revoked" : "active"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!isRevoked && (
                          <button
                            type="button"
                            className="text-[#71717a] hover:text-rose-400 transition-colors p-1"
                            onClick={() => handleRevoke(k.id)}
                            title="Revoke key"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SDK Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#27272a]">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Code2 size={16} className="text-[#ea4b71]" />
              <span>SDK</span>
            </h2>
            <p className="text-xs text-[#71717a] mt-0.5">
              Call Guardian pre-flight checks directly before automated tool calls or shell executions.
            </p>
          </div>

          <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg p-0.5 self-start">
            {["Python", "TypeScript", "cURL"].map((lang) => (
              <button
                key={lang}
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeLang.toLowerCase() === lang.toLowerCase()
                    ? "bg-[#27272a] text-white"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
                onClick={() => setActiveLang(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {activeLang.toLowerCase() === "python" && (
          <div className="flex items-center gap-2 text-xs text-[#a1a1aa] bg-[#121214] border border-[#27272a] px-3 py-2 rounded-lg font-mono">
            <span className="text-[#71717a]">Install:</span>
            <span className="text-emerald-400">pip install guardian-sdk</span>
          </div>
        )}

        {activeSnippet ? (
          <CodeBlock
            code={activeSnippet.code}
            language={activeSnippet.language.toLowerCase() === "curl" ? "bash" : activeSnippet.language.toLowerCase()}
            label={activeSnippet.filename}
          />
        ) : (
          <div className="p-8 text-center text-xs text-[#71717a] border border-[#27272a] rounded-xl">
            Loading code examples...
          </div>
        )}
      </div>
    </div>
  );
}
