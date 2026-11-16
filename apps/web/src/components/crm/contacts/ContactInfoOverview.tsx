import { contactToProfile } from "@/lib/crm/contact-profile";
import type { CrmContact } from "@/lib/crm/types";

export function ContactInfoOverview({ contact }: { contact: CrmContact }) {
  const profile = contactToProfile(contact);

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Field label="Preferred communication" value={profile.communication.preferredMethod.replaceAll("_", " ")} />
        <Field label="Best time" value={profile.communication.preferredTime.replaceAll("_", " ")} />
        <Field label="Time zone" value={profile.communication.timezone.replaceAll("_", " ")} />
        <Field label="Language" value={profile.communication.preferredLanguage} />
        <Field label="Lead source" value={profile.crm.leadSource || contact.contactSource || "—"} />
        <Field label="Lifecycle" value={profile.crm.lifecycleStage.replaceAll("_", " ")} />
      </dl>

      {profile.emails.length > 0 && (
        <Block title="Email addresses">
          <ul className="space-y-2 text-sm">
            {profile.emails.filter((e) => e.address.trim()).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <a className="text-[var(--studio-accent)] hover:underline" href={`mailto:${e.address}`}>
                  {e.address}
                </a>
                <span className="text-xs text-[var(--studio-text-tertiary)]">
                  {e.label}
                  {e.isPrimary ? " · primary" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {profile.phones.some((p) => p.number.trim()) && (
        <Block title="Phone numbers">
          <ul className="space-y-2 text-sm">
            {profile.phones
              .filter((p) => p.number.trim())
              .map((p) => (
                <li key={p.id}>
                  {p.countryCallingCode} {p.number}
                  <span className="ml-2 text-xs text-[var(--studio-text-tertiary)]">
                    {p.label}
                    {p.isPrimary ? " · primary" : ""}
                  </span>
                </li>
              ))}
          </ul>
        </Block>
      )}

      {profile.socialLinks.length > 0 && (
        <Block title="Social & web">
          <ul className="space-y-2 text-sm">
            {profile.socialLinks.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[var(--studio-accent)] hover:underline">
                  {s.platform.replaceAll("_", " ")}
                </a>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {profile.addresses.length > 0 && (
        <Block title="Addresses">
          <ul className="space-y-3 text-sm">
            {profile.addresses.map((a) => (
              <li key={a.id} className="rounded-xl border border-[var(--studio-border)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--studio-text-tertiary)]">{a.label}</p>
                <p className="mt-1 text-[var(--studio-text-primary)]">
                  {[a.street, a.unit, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(", ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {profile.communication.notes.trim() && (
        <Block title="Communication notes">
          <p className="whitespace-pre-wrap text-sm text-[var(--studio-text-secondary)]">{profile.communication.notes}</p>
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[var(--studio-text-primary)]">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--studio-text-primary)]">{value}</dd>
    </div>
  );
}