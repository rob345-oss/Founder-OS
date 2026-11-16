import { contactToProfile, type CrmContactProfile } from "@/lib/crm/contact-profile";
import type { CrmContact } from "@/lib/crm/types";

export type ContactQuickAction = {
  key: string;
  label: string;
  href: string;
};

function digitsPhone(profile: CrmContactProfile): string | null {
  const primary = profile.phones.find((p) => p.isPrimary && p.number.trim()) ?? profile.phones.find((p) => p.number.trim());
  if (!primary) return null;
  return `${primary.countryCallingCode}${primary.number}`.replace(/[^\d+]/g, "");
}

export function buildContactQuickActions(contact: CrmContact): ContactQuickAction[] {
  const profile = contactToProfile(contact);
  const actions: ContactQuickAction[] = [];
  const email = contact.primaryEmail;
  if (email) {
    actions.push({ key: "email", label: "Send email", href: `mailto:${encodeURIComponent(email)}` });
  }
  const phone = digitsPhone(profile);
  if (phone) {
    actions.push({ key: "call", label: "Call", href: `tel:${phone}` });
    actions.push({ key: "sms", label: "SMS", href: `sms:${phone}` });
    if (profile.phones.some((p) => p.label === "whatsapp")) {
      actions.push({ key: "whatsapp", label: "WhatsApp", href: `https://wa.me/${phone.replace(/^\+/, "")}` });
    }
  }
  const linkedIn = profile.socialLinks.find((s) => s.platform === "linkedin" && s.url.trim());
  if (linkedIn) {
    actions.push({ key: "linkedin", label: "LinkedIn", href: linkedIn.url });
  }
  return actions;
}