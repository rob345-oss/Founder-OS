import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { closeMarketingSqliteForTests, resetMarketingSqliteForTests } from "@/lib/marketing/server/db";
import {
  assertSocialStatusTransition,
  createSocialPost,
  duplicateSocialPost,
  listSocialPosts,
  recordManualPostMetrics,
  updateSocialPost,
} from "@/lib/marketing/server/social-repository";

describe("social repository (sqlite)", () => {
  let tmpDb: string;

  afterEach(() => {
    closeMarketingSqliteForTests();
    if (tmpDb && fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it("creates post, transitions status, and stores manual metrics separately", async () => {
    tmpDb = path.join(os.tmpdir(), `mcc-social-${Date.now()}.db`);
    delete process.env.CRM_DATABASE_URL;
    delete process.env.MARKETING_DATABASE_URL;
    process.env.MARKETING_DATA_DIR = path.dirname(tmpDb);
    resetMarketingSqliteForTests(tmpDb);

    await expect(createSocialPost({ platform: "linkedin", status: "publishing" })).rejects.toThrow(/MARKETING_PUBLISH_ARMED/);

    const post = await createSocialPost({
      platform: "linkedin",
      bodyText: "Guardian hello",
      status: "draft",
    });
    expect(post.status).toBe("draft");

    assertSocialStatusTransition("draft", "scheduled");
    const scheduled = await updateSocialPost(post.id, {
      status: "scheduled",
      scheduledAt: new Date("2026-12-01T10:00:00Z").toISOString(),
    });
    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.externalPublishState).toBe("scheduled_internal");

    const published = await updateSocialPost(post.id, { status: "published", publishedAt: new Date().toISOString() });
    expect(published.status).toBe("published");

    await recordManualPostMetrics(post.id, { impressions: 1000, likes: 40, comments: 5, shares: 2 });
    const withMetrics = await recordManualPostMetrics(post.id, { impressions: 1200, likes: 55 });
    expect(withMetrics.source).toBe("manual");
    expect(withMetrics.impressions).toBe(1200);
  });

  it("rejects rescheduling a published post", async () => {
    tmpDb = path.join(os.tmpdir(), `mcc-social-pub-${Date.now()}.db`);
    delete process.env.CRM_DATABASE_URL;
    delete process.env.MARKETING_DATABASE_URL;
    process.env.MARKETING_DATA_DIR = path.dirname(tmpDb);
    resetMarketingSqliteForTests(tmpDb);

    const post = await createSocialPost({
      platform: "instagram",
      bodyText: "Published",
      status: "published",
      publishedAt: new Date("2026-01-01T12:00:00Z").toISOString(),
      isManualTrackOnly: true,
    });
    await expect(
      updateSocialPost(post.id, { scheduledAt: new Date("2026-02-01T12:00:00Z").toISOString() }),
    ).rejects.toThrow(/published/);
  });

  it("filters posts by scheduled range", async () => {
    tmpDb = path.join(os.tmpdir(), `mcc-social-range-${Date.now()}.db`);
    delete process.env.CRM_DATABASE_URL;
    delete process.env.MARKETING_DATABASE_URL;
    process.env.MARKETING_DATA_DIR = path.dirname(tmpDb);
    resetMarketingSqliteForTests(tmpDb);

    await createSocialPost({
      platform: "linkedin",
      status: "scheduled",
      scheduledAt: "2026-12-01T10:00:00Z",
    });
    await createSocialPost({
      platform: "linkedin",
      status: "scheduled",
      scheduledAt: "2027-01-15T10:00:00Z",
    });
    const inRange = await listSocialPosts({
      rangeFrom: "2026-11-01T00:00:00Z",
      rangeTo: "2026-12-31T23:59:59Z",
    });
    expect(inRange).toHaveLength(1);
  });

  it("duplicates a post as draft without schedule", async () => {
    tmpDb = path.join(os.tmpdir(), `mcc-social-dup-${Date.now()}.db`);
    delete process.env.CRM_DATABASE_URL;
    delete process.env.MARKETING_DATABASE_URL;
    process.env.MARKETING_DATA_DIR = path.dirname(tmpDb);
    resetMarketingSqliteForTests(tmpDb);

    const post = await createSocialPost({
      platform: "x",
      bodyText: "Original",
      internalLabel: "Story",
      status: "scheduled",
      scheduledAt: "2026-12-01T10:00:00Z",
    });
    const dup = await duplicateSocialPost(post.id);
    expect(dup.status).toBe("draft");
    expect(dup.scheduledAt).toBeNull();
    expect(dup.bodyText).toBe("Original");
  });
});