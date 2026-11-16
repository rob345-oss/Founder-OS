import { User } from "lucide-react";

import { composeFullName, type CrmContactProfile } from "@/lib/crm/contact-profile";

function initialsFromProfile(profile: CrmContactProfile): string {
  const name = composeFullName(profile.identity);
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function ContactAvatar({
  profile,
  size = "md",
}: {
  profile: CrmContactProfile;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-20 w-20 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-14 w-14 text-base";
  const photo = profile.identity.photoDataUrl;

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-[var(--studio-border)]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[var(--studio-accent-muted)] font-semibold text-[var(--studio-accent)] ring-1 ring-[var(--studio-border)]`}
      aria-hidden
    >
      {initialsFromProfile(profile) || <User className="h-1/2 w-1/2 opacity-70" strokeWidth={1.75} />}
    </div>
  );
}