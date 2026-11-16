"use client";

import { Pencil } from "lucide-react";

import { crmBtnPrimarySm, crmBtnSecondary } from "@/components/crm/crmUi";
import { composeFullName, contactToProfile } from "@/lib/crm/contact-profile";
import type { CrmContact } from "@/lib/crm/types";

import { ContactAvatar } from "./ContactAvatar";
import { buildContactQuickActions } from "./contactQuickActions";

export function ContactProfileHeader({
  contact,
  onEdit,
}: {
  contact: CrmContact;
  onEdit: () => void;
}) {
  const profile = contactToProfile(contact);
  const name = composeFullName(profile.identity) || contact.primaryEmail;
  const subtitle = [profile.identity.jobTitle, profile.identity.company || contact.organization].filter(Boolean).join(" · ");
  const actions = buildContactQuickActions(contact);

  return (
    <header className="overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-[var(--studio-shadow-panel)]">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
        <ContactAvatar profile={profile} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">Contact</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--studio-text-primary)]">{name}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{subtitle}</p> : null}
          <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{contact.primaryEmail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{contact.pipelineStage.replaceAll("_", " ")}</Badge>
            <Badge muted>{contact.relationshipStatus.replaceAll("_", " ")}</Badge>
            {contact.tags.map((t) => (
              <Badge key={t} muted>
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <button type="button" onClick={onEdit} className={`${crmBtnSecondary} shrink-0 gap-2`}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
          Edit
        </button>
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-6 py-3">
          {actions.map((a) => (
            <a
              key={a.key}
              href={a.href}
              target={a.key === "linkedin" || a.key === "whatsapp" ? "_blank" : undefined}
              rel={a.key === "linkedin" || a.key === "whatsapp" ? "noopener noreferrer" : undefined}
              className={crmBtnPrimarySm}
            >
              {a.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

function Badge({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        muted
          ? "border border-[var(--studio-border)] text-[var(--studio-text-secondary)]"
          : "bg-[var(--studio-accent-muted)] text-[var(--studio-accent)]",
      ].join(" ")}
    >
      {children}
    </span>
  );
}