"use client";

export function VideoPreview({
  src,
  aspectClassName = "aspect-video",
}: {
  src?: string | null;
  aspectClassName?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-black ${aspectClassName}`}
    >
      {src ? (
        <video src={src} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--studio-text-tertiary)]">
          Import or select media to preview
        </div>
      )}
    </div>
  );
}
