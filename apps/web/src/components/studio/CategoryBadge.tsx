import { STUDIO_CATEGORY_LABELS, type StudioContentCategory } from "@founder-os/studio";

const COLORS: Record<StudioContentCategory, string> = {
  hook: "text-sky-300 bg-sky-400/10 border-sky-400/20",
  body: "text-violet-300 bg-violet-400/10 border-violet-400/20",
  cta: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  broll: "text-teal-300 bg-teal-400/10 border-teal-400/20",
  testimonial: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  interview: "text-indigo-300 bg-indigo-400/10 border-indigo-400/20",
  screen_recording: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
  finished_video: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  other: "text-zinc-300 bg-zinc-400/10 border-zinc-400/20",
};

export function CategoryBadge({ category }: { category: StudioContentCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${COLORS[category]}`}
    >
      {STUDIO_CATEGORY_LABELS[category]}
    </span>
  );
}
