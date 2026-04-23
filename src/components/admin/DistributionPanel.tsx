"use client";

import QRCode from "react-qr-code";
import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  slug: string;
  title: string;
  appUrl: string;
};

export function DistributionPanel(props: Props) {
  if (!props.appUrl.trim()) {
    return (
      <Alert>
        <AlertTitle>Distribution</AlertTitle>
        <AlertDescription>
          Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_APP_URL</code> in your environment
          (e.g. https://your-app.vercel.app) to generate share links, iframe HTML, and QR codes.
        </AlertDescription>
      </Alert>
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
    <Card>
      <CardHeader>
        <CardTitle>Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor={`pay-url-${slug}`}>Public payment URL</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`pay-url-${slug}`}
              readOnly
              value={payUrl}
              className="min-w-[12rem] flex-1 font-mono text-sm"
            />
            <Button type="button" onClick={() => void copy("url", payUrl)}>
              Copy URL
            </Button>
          </div>
          {copied === "url" ? (
            <p role="status" className="text-xs text-primary">
              Copied link to clipboard.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`iframe-${slug}`}>Embeddable iframe</Label>
          <Textarea
            id={`iframe-${slug}`}
            readOnly
            rows={5}
            value={iframeSnippet}
            className="font-mono text-xs"
          />
          <Button type="button" variant="outline" onClick={() => void copy("iframe", iframeSnippet)}>
            Copy iframe HTML
          </Button>
          {copied === "iframe" ? (
            <p role="status" className="text-xs text-primary">
              Copied HTML snippet.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">QR code (links to public URL)</h3>
          <div
            id={`qr-${slug}`}
            className="inline-block rounded-lg border border-border bg-background p-3"
          >
            <QRCode value={payUrl} size={160} title={`QR code for ${title}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadSvg}>
              Download SVG
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Scans open the same page as the public URL — works for print, posters, and desk signage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function escapeAttr(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
