import { runAutomatedWaitlistSync } from "./sync-runner";

export type WaitlistSyncResult =
  | { ok: true; upserted: number; created: number; leadCount: number }
  | { ok: false; error: string; status?: number };

export async function syncWaitlistFromTg(bearer: string): Promise<WaitlistSyncResult> {
  const result = await runAutomatedWaitlistSync(bearer);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }
  return { ok: true, upserted: result.upserted, created: result.created, leadCount: result.leadCount };
}
