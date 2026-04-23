"use client";

import QRCode from "react-qr-code";
import { useCallback, useState } from "react";

type Props = {
  slug: string;
  title: string;
  appUrl: string;
};

export function DistributionPanel(props: Props) {
  if (!props.appUrl.trim()) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-lg font-semibold">Distribution</h2>
        <p className="mt-2 text-sm">
          Set <code className="rounded bg-white px-1">NEXT_PUBLIC_APP_URL</code> in your environment
          (e.g. https://your-app.vercel.app) to generate share links, iframe HTML, and QR codes.
        </p>
      </section>
    );
  }

  return <DistributionPanelContent {...props} />;
}

function DistributionPanelContent({ slug, title, appUrl }: Props) {
  const base = appUrl.replace(/\/$/, "");
  const payUrl = `${base}/pay/${slug}`;
  const embedUrl = `${base}/embed/${slug}`;
  const iframeSnippet = `<iframe\n  title="${escapeAttr(title)} — payment"\n  src="${embedUrl}"\n  width="100%"\n  style="border:0;min-height:720px;max-width:480px;margin:0 auto;display:block;"\n  loading="lazy"\n></iframe>`;

  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("error");
    }
  }, []);

  const downloadSvg = () => {
    const el = document.getElementById(`qr-${slug}`);
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qpp-${slug}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Distribution</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor={`pay-url-${slug}`}>
          Public payment URL
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`pay-url-${slug}`}
            readOnly
            value={payUrl}
            className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => void copy("url", payUrl)}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
          >
            Copy URL
          </button>
        </div>
        {copied === "url" ? (
          <p role="status" className="text-xs text-teal-800">
            Copied link to clipboard.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor={`iframe-${slug}`}>
          Embeddable iframe
        </label>
        <textarea
          id={`iframe-${slug}`}
          readOnly
          rows={5}
          value={iframeSnippet}
          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => void copy("iframe", iframeSnippet)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        >
          Copy iframe HTML
        </button>
        {copied === "iframe" ? (
          <p role="status" className="text-xs text-teal-800">
            Copied HTML snippet.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-800">QR code (links to public URL)</h3>
        <div
          id={`qr-${slug}`}
          className="inline-block rounded-lg border border-zinc-200 bg-white p-3"
        >
          <QRCode value={payUrl} size={160} title={`QR code for ${title}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadSvg}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            Download SVG
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Scans open the same page as the public URL — works for print, posters, and desk signage.
        </p>
      </div>
    </section>
  );
}

function escapeAttr(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
