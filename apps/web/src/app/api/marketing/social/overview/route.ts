import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { buildSocialOverview } from "@/lib/marketing/server/social-overview";
import type { SocialPlatformId } from "@/lib/marketing/social-types";
import { SOCIAL_PLATFORMS } from "@/lib/marketing/social-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const platformRaw = sp.get("platform");
  const platform =
    platformRaw && (SOCIAL_PLATFORMS as readonly string[]).includes(platformRaw)
      ? (platformRaw as SocialPlatformId)
      : null;

  const overview = await buildSocialOverview({
    preset: sp.get("preset"),
    start: sp.get("start"),
    end: sp.get("end"),
    platform,
  });
  return Response.json(overview);
}