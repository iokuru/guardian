import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: number | string;
  label?: string;
  showCopy?: boolean;
}

export function CodeBlock({
  code,
  language = "text",
  maxHeight = 320,
  label,
  showCopy = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="code-block-container">
      {(label || showCopy) && (
        <div className="code-block-header">
          <span className="code-block-label">{label || language}</span>
          {showCopy && (
            <button
              type="button"
              className="code-copy-btn"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check size={12} className="copy-check-icon" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
      <pre
        className="code-block-pre"
        style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
