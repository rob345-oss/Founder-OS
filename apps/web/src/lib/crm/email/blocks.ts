import type { EmailBlock } from "./types";

const BRAND = {
  accent: "#5b8cff",
  text: "#1a1d26",
  muted: "#5c6370",
  background: "#f6f7f9",
  footer: "#8b919c",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function alignStyle(align?: "left" | "center"): string {
  return align === "center" ? "text-align:center;" : "text-align:left;";
}

export function defaultEmailBlocks(locale: "en" | "es"): EmailBlock[] {
  if (locale === "es") {
    return [
      { type: "heading", level: 1, text: "Hola, {{first_name}}", align: "center" },
      {
        type: "paragraph",
        text: "Gracias por su interés en Titanium Guardian. Estamos construyendo herramientas que devuelven el control a las personas.",
      },
      { type: "button", label: "Conocer más", href: "https://titaniumguardian.com", align: "center" },
      { type: "divider" },
      {
        type: "paragraph",
        text: "Titanium Guardian — claridad, respeto y tranquilidad para usted y su familia.",
        align: "center",
      },
    ];
  }
  return [
    { type: "heading", level: 1, text: "Hello, {{first_name}}", align: "center" },
    {
      type: "paragraph",
      text: "Thank you for your interest in Titanium Guardian. We're building tools that put control back in your hands.",
    },
    { type: "button", label: "Learn more", href: "https://titaniumguardian.com", align: "center" },
    { type: "divider" },
    {
      type: "paragraph",
      text: "Titanium Guardian — clarity, respect, and peace of mind for you and your family.",
      align: "center",
    },
  ];
}

export function renderBlocksToHtml(blocks: EmailBlock[], opts?: { unsubscribeUrl?: string }): string {
  const rows = blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const size = block.level === 1 ? "28px" : block.level === 2 ? "22px" : "18px";
          return `<tr><td style="padding:12px 24px;${alignStyle(block.align)}"><h${block.level} style="margin:0;font-size:${size};color:${BRAND.text};font-weight:600;">${escapeHtml(block.text)}</h${block.level}></td></tr>`;
        }
        case "paragraph":
          return `<tr><td style="padding:8px 24px;${alignStyle(block.align)};font-size:16px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(block.text).replaceAll("\n", "<br/>")}</td></tr>`;
        case "button":
          return `<tr><td style="padding:16px 24px;${alignStyle(block.align)}"><a href="${escapeHtml(block.href)}" style="display:inline-block;background:${BRAND.accent};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(block.label)}</a></td></tr>`;
        case "divider":
          return `<tr><td style="padding:8px 24px;"><hr style="border:none;border-top:1px solid #e3e5ea;margin:0;" /></td></tr>`;
        case "image":
          return `<tr><td style="padding:12px 24px;text-align:center;"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="max-width:100%;height:auto;border-radius:8px;" /></td></tr>`;
        case "spacer":
          return `<tr><td style="height:${Math.max(8, block.height)}px;line-height:${Math.max(8, block.height)}px;font-size:0;">&nbsp;</td></tr>`;
        default:
          return "";
      }
    })
    .join("");

  const footer = opts?.unsubscribeUrl
    ? `<tr><td style="padding:24px;text-align:center;font-size:12px;color:${BRAND.footer};"><a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:${BRAND.footer};">Unsubscribe</a></td></tr>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:${BRAND.background};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8eaee;">${rows}${footer}</table></td></tr></table></body></html>`;
}

export function renderBlocksToText(blocks: EmailBlock[], opts?: { unsubscribeUrl?: string }): string {
  const lines: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        lines.push(block.text, "");
        break;
      case "paragraph":
        lines.push(block.text, "");
        break;
      case "button":
        lines.push(`${block.label}: ${block.href}`, "");
        break;
      case "divider":
        lines.push("---", "");
        break;
      case "image":
        lines.push(`[${block.alt}] ${block.src}`, "");
        break;
      case "spacer":
        break;
      default:
        break;
    }
  }
  if (opts?.unsubscribeUrl) lines.push(`Unsubscribe: ${opts.unsubscribeUrl}`);
  return lines.join("\n").trim();
}

export function parseBlocks(raw: unknown): EmailBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is EmailBlock => {
    if (!b || typeof b !== "object") return false;
    const t = (b as { type?: string }).type;
    return typeof t === "string" && ["heading", "paragraph", "button", "divider", "image", "spacer"].includes(t);
  });
}