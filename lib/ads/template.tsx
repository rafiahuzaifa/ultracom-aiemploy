import { ImageResponse } from "next/og";
import type { AdCreative } from "@/lib/ai/types";
import { AdIcon } from "@/lib/ads/icons";

const WIDTH = 1080;
const HEIGHT = 1350; // 4:5 — Instagram/Facebook's preferred portrait feed ratio

const NAVY = "#0B1F3A";
const ACCENT = "#1E6FEB";
const ACCENT_SOFT = "#EAF2FF";
const SLATE = "#4B5872";

let cachedFonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] | null = null;

/**
 * Google's CSS2 endpoint serves woff2 to modern browser user agents but
 * falls back to plain ttf for older ones — satori/ImageResponse can only
 * parse ttf/otf, so a legacy user agent is used deliberately here.
 */
async function loadGoogleFontTtf(family: string, weight: 400 | 700): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const css = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) Chrome/9.0.601.0 Safari/534.34" },
  }).then((r) => r.text());
  const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|woff)'\)/);
  if (!match) throw new Error(`Could not resolve font URL for ${family} ${weight}`);
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

/** Fetched once per lambda instance and cached across renders in the same warm invocation. */
async function loadFonts() {
  if (cachedFonts) return cachedFonts;

  const [regular, bold] = await Promise.all([loadGoogleFontTtf("Inter", 400), loadGoogleFontTtf("Inter", 700)]);

  cachedFonts = [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ];
  return cachedFonts;
}

export interface AdTemplateProps {
  brandName: string;
  logoUrl?: string;
  websiteUrl?: string;
  tagline?: string;
  creative: AdCreative;
}

function BulletRow({ icon, title, subtitle }: { icon: AdCreative["bullets"][number]["icon"]; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 4px 14px rgba(11,31,58,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: ACCENT_SOFT, flexShrink: 0 }}>
        <AdIcon icon={icon} size={22} color={ACCENT} />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>{title}</div>
        <div style={{ fontSize: 15, color: SLATE }}>{subtitle}</div>
      </div>
    </div>
  );
}

function ServiceTile({ icon, label, subtitle }: { icon: AdCreative["services"][number]["icon"]; label: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: 168, gap: 8 }}>
      <AdIcon icon={icon} size={30} color={ACCENT} />
      <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, textAlign: "center" }}>{label}</div>
      <div style={{ fontSize: 12, color: SLATE, textAlign: "center" }}>{subtitle}</div>
    </div>
  );
}

function domainLabel(url?: string) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export async function renderAdTemplate(props: AdTemplateProps): Promise<{ base64: string; mimeType: string }> {
  const { brandName, logoUrl, websiteUrl, tagline, creative } = props;
  const fonts = await loadFonts();
  const domain = domainLabel(websiteUrl);
  const emphasisFrom = Math.max(0, creative.headlineLines.length - creative.headlineEmphasisLines);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #FFFFFF 0%, #F3F7FF 55%, #EAF2FF 100%)",
          fontFamily: "Inter",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "48px 56px 0 56px" }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} height={56} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 28, fontWeight: 700, color: NAVY }}>{brandName}</div>
          )}
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", padding: "36px 56px 0 56px" }}>
          <div style={{ width: 64, height: 6, background: ACCENT, borderRadius: 3, marginBottom: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            {creative.headlineLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  color: i >= emphasisFrom ? ACCENT : NAVY,
                }}
              >
                {line}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 20, color: SLATE, marginTop: 20, maxWidth: 820 }}>{creative.subheadline}</div>
        </div>

        {/* Bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "36px 56px 0 56px" }}>
          {creative.bullets.map((b, i) => (
            <BulletRow key={i} icon={b.icon} title={b.title} subtitle={b.subtitle} />
          ))}
        </div>

        {/* Decorative feature panel fills the space a literal product screenshot would occupy */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "36px 56px 0 56px" }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 40,
              background: `linear-gradient(135deg, ${NAVY} 0%, #143054 100%)`,
              borderRadius: 28,
              padding: "48px 40px",
            }}
          >
            {creative.bullets.slice(0, 3).map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 200 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 84,
                    height: 84,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                  }}
                >
                  <AdIcon icon={b.icon} size={38} color="#FFFFFF" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "white", textAlign: "center" }}>{b.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "40px 40px 40px 40px", flexWrap: "wrap" }}>
          {creative.services.map((s, i) => (
            <ServiceTile key={i} icon={s.icon} label={s.label} subtitle={s.subtitle} />
          ))}
        </div>

        {/* Footer bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: NAVY,
            padding: "28px 56px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{brandName}</div>
            {tagline && <div style={{ fontSize: 13, color: "#9FB4D8", letterSpacing: 2 }}>{tagline}</div>}
          </div>
          {domain && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: ACCENT,
                color: "white",
                fontSize: 18,
                fontWeight: 700,
                padding: "14px 28px",
                borderRadius: 999,
              }}
            >
              {domain}
            </div>
          )}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  const arrayBuffer = await image.arrayBuffer();
  return { base64: Buffer.from(arrayBuffer).toString("base64"), mimeType: "image/png" };
}
