"use client";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { ContentCalendarWorkspace } from "@/components/marketing/social/calendar/ContentCalendarWorkspace";

export default function SocialCalendarPage() {
  return (
    <MarketingModuleScaffold
      layout="fluid"
      eyebrow="Social command center"
      title="Content calendar"
      description="Plan, schedule, and track social content in month, week, and list views. Drag posts to reschedule; publishing remains disarmed until explicitly enabled on the server."
    >
      <ContentCalendarWorkspace />
    </MarketingModuleScaffold>
  );
}