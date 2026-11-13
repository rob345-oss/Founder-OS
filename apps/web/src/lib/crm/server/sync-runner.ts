import { getCrmConfig } from "../config";
import { fetchAllTgLeads } from "../tg-client";
import { syncLeadsIntoStore } from "./repository";
import { finishSyncRun, recordSyncRunFailure, recordSyncRunStart, recordSyncRunSuccess } from "./sync-log";

export type AutomatedSyncResult =
  | { ok: true; upserted: number; created: number; leadCount: number; runId: string }
  | { ok: false; error: string; status?: number; runId?: string };

export async function runAutomatedWaitlistSync(bearer: string): Promise<AutomatedSyncResult> {
  const runId = await recordSyncRunStart("waitlist_leads");
  try {
    const leadsResult = await fetchAllTgLeads(bearer);
    if (!leadsResult.ok) {
      await recordSyncRunFailure(runId, leadsResult.error);
      return { ok: false, error: leadsResult.error, status: leadsResult.status, runId };
    }
    const sync = await syncLeadsIntoStore(leadsResult.data);
    const watermark =
      leadsResult.data
        .map((l) => l.updated_at ?? l.created_at)
        .filter(Boolean)
        .sort()
        .pop() ?? null;
    await recordSyncRunSuccess(runId, {
      leadsSeen: leadsResult.data.length,
      upserted: sync.upserted,
      created: sync.created,
      watermark,
    });
    return { ok: true, ...sync, leadCount: leadsResult.data.length, runId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    await finishSyncRun(runId, "failed", { errorMessage: message });
    return { ok: false, error: message, runId };
  }
}

export function resolveAutomatedSyncBearer(override?: string): string | undefined {
  return override?.trim() || getCrmConfig().tgSyncBearer;
}
