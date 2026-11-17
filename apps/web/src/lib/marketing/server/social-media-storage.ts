import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getCrmConfig } from "@/lib/crm/config";
import { ensureCrmDataDir } from "@/lib/crm/server/data-dir";

import { getMarketingConfig } from "../config";

const BUCKET = "marketing-social-media";
const LOCAL_SUBDIR = "marketing-media";

type StorageBackend = "local" | "supabase";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function assertHostedPersistentStorageConfigured(): void {
  if (process.env.VERCEL !== "1") return;
  if (readEnv("MARKETING_MEDIA_STORAGE_ALLOW_LOCAL") === "true") return;
  const service = readEnv("MARKETING_SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = getCrmConfig().supabaseUrl;
  const forced = readEnv("MARKETING_MEDIA_STORAGE")?.toLowerCase();
  if (forced === "supabase" && service && url) return;
  if (forced !== "local" && service && url) return;
  throw new Error(
    "Marketing media on Vercel requires Supabase Storage (MARKETING_MEDIA_STORAGE=supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Ephemeral disk is not permitted.",
  );
}

function resolveBackend(): StorageBackend {
  assertHostedPersistentStorageConfigured();
  const forced = readEnv("MARKETING_MEDIA_STORAGE")?.toLowerCase();
  if (forced === "local") {
    if (process.env.VERCEL === "1" && readEnv("MARKETING_MEDIA_STORAGE_ALLOW_LOCAL") !== "true") {
      throw new Error("MARKETING_MEDIA_STORAGE=local is not allowed on Vercel.");
    }
    return "local";
  }
  if (forced === "supabase") return "supabase";
  const service = readEnv("MARKETING_SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = getCrmConfig().supabaseUrl;
  if (service && url) return "supabase";
  return "local";
}

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = getCrmConfig().supabaseUrl;
  const key = readEnv("MARKETING_SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase storage requires SUPABASE URL and service role key.");
  supabaseAdmin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return supabaseAdmin;
}

export function getMarketingMediaLocalRoot(): string {
  const base = getMarketingConfig().dataDir ? path.resolve(getMarketingConfig().dataDir!) : ensureCrmDataDir();
  const root = path.join(base, LOCAL_SUBDIR);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function buildStorageKey(assetId: string, ext: string): string {
  const safeExt = ext.replace(/[^\w]/g, "").slice(0, 8) || "bin";
  return `${assetId}/${safeExt}.${safeExt === "bin" ? "dat" : safeExt}`;
}

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/quicktime") return "mov";
  return "bin";
}

export function storageKeyForUpload(assetId: string, mimeType: string): string {
  return buildStorageKey(assetId, extForMime(mimeType));
}

export async function writeMarketingMediaObject(storageKey: string, data: Buffer, mimeType: string): Promise<void> {
  const backend = resolveBackend();
  if (backend === "supabase") {
    const client = getSupabaseAdmin();
    const { error } = await client.storage.from(BUCKET).upload(storageKey, data, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const filePath = path.join(getMarketingMediaLocalRoot(), storageKey.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
}

export async function readMarketingMediaObject(storageKey: string): Promise<{ data: Buffer; mimeType: string | null }> {
  const backend = resolveBackend();
  if (backend === "supabase") {
    const client = getSupabaseAdmin();
    const { data, error } = await client.storage.from(BUCKET).download(storageKey);
    if (error || !data) throw new Error(error?.message ?? "Failed to read object");
    const buf = Buffer.from(await data.arrayBuffer());
    return { data: buf, mimeType: data.type || null };
  }
  const filePath = path.join(getMarketingMediaLocalRoot(), storageKey.replace(/\//g, path.sep));
  if (!fs.existsSync(filePath)) throw new Error("Media file not found");
  return { data: fs.readFileSync(filePath), mimeType: null };
}

export async function deleteMarketingMediaObject(storageKey: string): Promise<void> {
  const backend = resolveBackend();
  if (backend === "supabase") {
    const client = getSupabaseAdmin();
    await client.storage.from(BUCKET).remove([storageKey]);
    return;
  }
  const filePath = path.join(getMarketingMediaLocalRoot(), storageKey.replace(/\//g, path.sep));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function marketingMediaStorageBackend(): StorageBackend {
  return resolveBackend();
}