"use client";

import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Copy, QrCode, Share2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  slug: string;
  title: string;
  appUrl: string;
};

export function DistributionPanel(props: Props) {
  const t = useTranslations("distribution");
  if (!props.appUrl.trim()) {
    return (
      <Alert>
        <AlertTitle>{t("title")}</AlertTitle>
        <AlertDescription>
          {t("envMissing")}
        </AlertDescription>
      </Alert>
    );
  }

  return <DistributionPanelContent {...props} />;
}

function DistributionPanelContent({ slug, title, appUrl }: Props) {
  const t = useTranslations("distribution");
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
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Share2 className="size-5" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <CardTitle className="text-lg">{t("title")}</CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor={`pay-url-${slug}`}>{t("publicUrl")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`pay-url-${slug}`}
              readOnly
              value={payUrl}
              className="min-w-[12rem] flex-1 rounded-xl font-mono text-sm"
            />
            <Button
              type="button"
              className="gap-1.5 rounded-full"
              onClick={() => void copy("url", payUrl)}
            >
              <Copy className="size-3.5" aria-hidden />
              {t("copyUrl")}
            </Button>
          </div>
          {copied === "url" ? (
            <p role="status" className="text-xs text-primary">
              {t("copiedUrl")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`iframe-${slug}`}>{t("iframe")}</Label>
          <Textarea
            id={`iframe-${slug}`}
            readOnly
            rows={5}
            value={iframeSnippet}
            className="rounded-xl font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 rounded-full border-foreground/12"
            onClick={() => void copy("iframe", iframeSnippet)}
          >
            <Copy className="size-3.5" aria-hidden />
            {t("copyIframe")}
          </Button>
          {copied === "iframe" ? (
            <p role="status" className="text-xs text-primary">
              {t("copiedIframe")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <QrCode className="size-4 text-primary" strokeWidth={1.5} aria-hidden />
            {t("qrHeading")}
          </h3>
          <div
            id={`qr-${slug}`}
            className="inline-block rounded-2xl border border-foreground/8 bg-card p-4 shadow-sm"
          >
            <QRCode value={payUrl} size={160} title={`QR code for ${title}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-foreground/12"
              onClick={downloadSvg}
            >
              {t("downloadSvg")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("qrHelp")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function escapeAttr(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
