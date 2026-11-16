import type { NextRequest } from "next/server";

import type { AudienceFilter, CommunicationType } from "@/lib/crm/email/types";
import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { getEmailCampaign } from "@/lib/crm/server/email-campaign-store";
import { previewCampaignAudience } from "@/lib/crm/server/email-audience";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    audienceFilter?: AudienceFilter;
    excludedContactIds?: string[];
    communicationType?: CommunicationType;
  };

  const campaign = await getEmailCampaign(id);
  const preview = await previewCampaignAudience({
    filter: body.audienceFilter ?? campaign?.audienceFilter ?? { mode: "all_eligible" },
    excludedContactIds: body.excludedContactIds ?? campaign?.excludedContactIds ?? [],
    communicationType:
      body.communicationType ?? campaign?.communicationType ?? ("promotional" as CommunicationType),
  });

  return Response.json({
    totalEligible: preview.totalEligible,
    sample: preview.eligible.slice(0, 25).map((c) => ({
      id: c.id,
      fullName: c.fullName,
      primaryEmail: c.primaryEmail,
      marketingConsent: c.marketingConsent,
    })),
    excluded: preview.excluded.slice(0, 100),
  });
}