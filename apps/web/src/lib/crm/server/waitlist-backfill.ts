import { fetchAllTgLeads } from "../tg-client";
import { syncLeadsIntoStore } from "./repository";

export type WaitlistBackfillResult = {
  dryRun: boolean;
  leadCount: number;
  examined: number;
  created: number;
  updated: number;
};

export async function runWaitlistBackfill(bearer: string, opts?: { dryRun?: boolean }): Promise<WaitlistBackfillResult> {
  const dryRun = Boolean(opts?.dryRun);
  const leadsResult = await fetchAllTgLeads(bearer);
  if (!leadsResult.ok) {
    throw new Error(leadsResult.error);
  }
  const leadCount = leadsResult.data.length;
  if (dryRun) {
    return { dryRun: true, leadCount, examined: leadCount, created: 0, updated: 0 };
  }
  const sync = await syncLeadsIntoStore(leadsResult.data);
  return {
    dryRun: false,
    leadCount,
    examined: leadCount,
    created: sync.created,
    updated: sync.upserted - sync.created,
  };
}