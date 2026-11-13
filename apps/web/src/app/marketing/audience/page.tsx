"use client";

import { MarketingEmptyState } from "@/components/marketing/MarketingEmptyState";
import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";

const SEGMENTS = [
  {
    id: "older_adults",
    title: "Older adults",
    detail: "Shown only when voluntarily provided via waitlist or assessment flows.",
  },
  {
    id: "caregivers",
    title: "Adult children & caregivers",
    detail: "Derived from CRM tags and protection_audience fields when present — never inferred silently.",
  },
  {
    id: "families",
    title: "Families",
    detail: "Aggregate counts from CRM classifications; no sensitive inference.",
  },
  {
    id: "partners",
    title: "Organizational partners",
    detail: "organization_partner classification in CRM.",
  },
];

export default function MarketingAudiencePage() {
  return (
    <MarketingModuleScaffold
      eyebrow="Growth"
      title="Audience intelligence"
      description="Segmentation grounded in data subjects supplied voluntarily through Titanium Guardian touchpoints."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {SEGMENTS.map((s) => (
          <div key={s.id} className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
            <p className="text-sm font-medium text-[var(--studio-text-primary)]">{s.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--studio-text-secondary)]">{s.detail}</p>
          </div>
        ))}
      </div>
      <MarketingEmptyState
        title="Segment analytics not connected"
        description="Enable CRM field rollups and privacy-reviewed segment queries before showing counts here."
      />
    </MarketingModuleScaffold>
  );
}
