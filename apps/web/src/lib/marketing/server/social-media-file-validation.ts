const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/quicktime"]);

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

export type ParsedUploadMeta = {
  assetType: "image" | "video";
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
};

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) return "image/gif";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  if (buf.length >= 8 && buf.toString("ascii", 4, 8) === "ftyp") return "video/quicktime";
  return null;
}

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function readJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function readImageDimensions(mime: string, buf: Buffer): { width: number | null; height: number | null } {
  if (mime === "image/png") {
    const d = readPngDimensions(buf);
    return d ?? { width: null, height: null };
  }
  if (mime === "image/jpeg") {
    const d = readJpegDimensions(buf);
    return d ?? { width: null, height: null };
  }
  return { width: null, height: null };
}

export function validateMarketingMediaUpload(
  filename: string,
  declaredMime: string | null,
  data: Buffer,
): ParsedUploadMeta {
  const sniffed = sniffMime(data);
  const mime = sniffed ?? declaredMime?.toLowerCase() ?? "";
  if (!mime) throw new Error("Could not determine file type. Upload a supported JPEG, PNG, WebP, GIF, or MP4/MOV.");

  let assetType: "image" | "video";
  if (ALLOWED_IMAGE_MIME.has(mime)) assetType = "image";
  else if (ALLOWED_VIDEO_MIME.has(mime)) assetType = "video";
  else throw new Error(`Unsupported file type: ${mime}.`);

  if (sniffed && declaredMime && !declaredMime.toLowerCase().includes(sniffed.split("/")[1]!)) {
    throw new Error("File content does not match the declared type.");
  }

  const byteSize = data.byteLength;
  if (assetType === "image" && byteSize > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB upload limit.`);
  }
  if (assetType === "video" && byteSize > MAX_VIDEO_BYTES) {
    throw new Error(`Video exceeds ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} MB upload limit.`);
  }

  const dims = assetType === "image" ? readImageDimensions(mime, data) : { width: null, height: null };

  const safeName = filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
  if (!safeName) throw new Error("Invalid filename.");

  void safeName;
  return {
    assetType,
    mimeType: mime,
    byteSize,
    width: dims.width,
    height: dims.height,
  };
}