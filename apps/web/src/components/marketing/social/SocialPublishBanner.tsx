export function SocialPublishBanner({ armed }: { armed: boolean }) {
  if (armed) {
    return (
      <div className="mb-6 rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
        External publishing is armed on the server. Adapter dispatch is not enabled in this phase — scheduled posts remain
        internal records only.
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-3 text-sm text-[var(--studio-text-secondary)]">
      <span className="font-medium text-[var(--studio-text-primary)]">Publishing disarmed.</span> Plan, draft, schedule,
      and track posts manually. Nothing posts to LinkedIn, Meta, or other networks until a future approved phase enables{" "}
      <code className="text-xs text-[var(--studio-text-tertiary)]">MARKETING_PUBLISH_ARMED</code>.
    </div>
  );
}