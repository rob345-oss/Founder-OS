import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { buildTrackedUrl } from "@/lib/marketing/server/social-utm";
import { getMarketingDriver, newId, nowIso, withMarketingPgClient, getMarketingSqlite } from "@/lib/marketing/server/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (typeof body.destinationUrl !== "string" || !body.destinationUrl.trim()) {
    return Response.json({ error: "destinationUrl is required" }, { status: 400 });
  }
  if (typeof body.utmCampaign !== "string" || !body.utmCampaign.trim()) {
    return Response.json({ error: "utmCampaign is required" }, { status: 400 });
  }

  const trackedUrl = buildTrackedUrl({
    destinationUrl: body.destinationUrl.trim(),
    utmSource: typeof body.utmSource === "string" ? body.utmSource : "linkedin",
    utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : "social",
    utmCampaign: body.utmCampaign.trim(),
    utmContent: typeof body.utmContent === "string" ? body.utmContent : null,
    utmTerm: typeof body.utmTerm === "string" ? body.utmTerm : null,
  });

  const label = typeof body.label === "string" ? body.label : "Campaign link";
  const id = newId();
  const ts = nowIso();
  const row = {
    id,
    campaign_id: typeof body.campaignId === "string" ? body.campaignId : null,
    post_id: typeof body.postId === "string" ? body.postId : null,
    label,
    destination_url: body.destinationUrl.trim(),
    utm_source: typeof body.utmSource === "string" ? body.utmSource : "linkedin",
    utm_medium: typeof body.utmMedium === "string" ? body.utmMedium : "social",
    utm_campaign: body.utmCampaign.trim(),
    utm_content: typeof body.utmContent === "string" ? body.utmContent : null,
    utm_term: typeof body.utmTerm === "string" ? body.utmTerm : null,
    tracked_url: trackedUrl,
    created_at: ts,
  };

  if (getMarketingDriver() === "postgres") {
    await withMarketingPgClient(async (q) => {
      await q(
        `INSERT INTO marketing_social_attribution_links
        (id, campaign_id, post_id, label, destination_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tracked_url, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.id,
          row.campaign_id,
          row.post_id,
          row.label,
          row.destination_url,
          row.utm_source,
          row.utm_medium,
          row.utm_campaign,
          row.utm_content,
          row.utm_term,
          row.tracked_url,
          row.created_at,
        ],
      );
    });
  } else {
    getMarketingSqlite()
      .prepare(
        `INSERT INTO marketing_social_attribution_links
        (id, campaign_id, post_id, label, destination_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tracked_url, created_at)
        VALUES (@id, @campaign_id, @post_id, @label, @destination_url, @utm_source, @utm_medium, @utm_campaign, @utm_content, @utm_term, @tracked_url, @created_at)`,
      )
      .run(row);
  }

  return Response.json({ id, trackedUrl, label }, { status: 201 });
}