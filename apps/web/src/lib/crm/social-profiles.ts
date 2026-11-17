import type { CrmContactSocialEntry } from "./contact-profile";

const PLATFORM_HOSTS: Record<string, RegExp> = {
  linkedin: /^https?:\/\/(www\.)?linkedin\.com\//i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\//i,
  facebook: /^https?:\/\/(www\.)?facebook\.com\//i,
  x: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i,
  youtube: /^https?:\/\/(www\.)?youtube\.com\//i,
  github: /^https?:\/\/(www\.)?github\.com\//i,
  tiktok: /^https?:\/\/(www\.)?tiktok\.com\//i,
  telegram: /^https?:\/\/(t\.me|telegram\.me)\//i,
};

export function normalizeSocialUrl(platform: CrmContactSocialEntry["platform"], url: string, handle?: string): string {
  const trimmed = url.trim();
  if (trimmed) {
    try {
      const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      return u.toString();
    } catch {
      return trimmed;
    }
  }
  const h = (handle ?? "").trim().replace(/^@/, "");
  if (!h) return "";
  switch (platform) {
    case "linkedin":
      return `https://www.linkedin.com/in/${encodeURIComponent(h)}`;
    case "instagram":
      return `https://www.instagram.com/${encodeURIComponent(h)}`;
    case "x":
      return `https://x.com/${encodeURIComponent(h)}`;
    case "facebook":
      return `https://www.facebook.com/${encodeURIComponent(h)}`;
    case "youtube":
      return h.startsWith("@") ? `https://www.youtube.com/${h}` : `https://www.youtube.com/@${encodeURIComponent(h)}`;
    case "github":
      return `https://github.com/${encodeURIComponent(h)}`;
    case "tiktok":
      return `https://www.tiktok.com/@${encodeURIComponent(h)}`;
    case "telegram":
      return `https://t.me/${encodeURIComponent(h)}`;
    default:
      return h.includes(".") ? (h.startsWith("http") ? h : `https://${h}`) : "";
  }
}

export function socialUrlLooksValid(platform: CrmContactSocialEntry["platform"], url: string): boolean {
  if (!url.trim()) return true;
  const re = PLATFORM_HOSTS[platform];
  if (!re) {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  return re.test(url);
}