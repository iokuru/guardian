import { useState, useEffect } from "react";
import { Plus, Key, Copy, Check, Trash2, Code2 } from "lucide-react";
import type { ApiKeyRecord } from "../types/guardian";
import { getApiKeys, createApiKey, revokeApiKey, getIntegrationSnippets } from "../api/client";
import { CodeBlock } from "../components/CodeBlock";
import { copyToClipboard } from "../utils/clipboard";

export function Integrations() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [snippets, setSnippets] = useState<{ language: string; filename: string; code: string }[]>([]);
  const [activeLang, setActiveLang] = useState<string>("Python");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    Promise.allSettled([getApiKeys(), getIntegrationSnippets()]).then(([keysRes, snipsRes]) => {
      if (!isCurrent) return;
      if (keysRes.status === "fulfilled") {
        setKeys(keysRes.value);
      }
      if (snipsRes.status === "fulfilled" && snipsRes.value.snippets) {
        setSnippets(snipsRes.value.snippets);
        if (snipsRes.value.snippets.length > 0) {
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

  const activeSnippet =
    snippets.find((s) => s.language.toLowerCase() === activeLang.toLowerCase()) || snippets[0];

  return (
    <div className="overview-editorial-wrap space-y-8">
      {/* Header */}
      <div className="page-header-block flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-main-heading">Integrations & API</h1>
          <p className="page-sub-heading">
            Connect Guardian guardrails into agent tool execution loops, middleware, and CI pipelines.
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
          <span>New API key</span>
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

      {/* Create Key Modal / Drawer */}
      {isCreatingKey && (
        <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214] space-y-3">
          <h3 className="text-sm font-semibold text-white">Create new API credential</h3>
          <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="e.g. production-deploy-worker"
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

      {/* API Keys Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Active credentials</h2>
          <span className="text-xs text-[#71717a]">{keys.length} registered</span>
        </div>

        <div className="dev-table-container">
          <table className="dev-table">
            <thead>
              <tr>
                <th style={{ width: "200px" }}>Key name</th>
                <th style={{ width: "160px" }}>Prefix</th>
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
                    No API keys registered yet.
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
                        <code className="mono-text text-xs text-[#71717a]">{k.prefix}...</code>
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

      {/* SDK Integration Tabs */}
      <div className="space-y-4 pt-4 border-t border-[#27272a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Code2 size={16} className="text-[#ea4b71]" />
              <span>SDK integration snippets</span>
            </h2>
            <p className="text-xs text-[#71717a] mt-0.5">
              Drop Guardian pre-flight checks directly before automated tool calls or shell executions.
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
