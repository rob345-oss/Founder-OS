/** ISO 3166-1 alpha-2 calling codes for CRM phone entry (subset — full list via libphonenumber metadata at parse time). */
export type CrmCountryOption = {
  iso: string;
  name: string;
  callingCode: string;
  flag: string;
};

function flagEmoji(iso: string): string {
  if (!/^[A-Z]{2}$/i.test(iso)) return "🌐";
  const base = 0x1f1e6 - 65;
  const u = iso.toUpperCase();
  return String.fromCodePoint(base + u.charCodeAt(0), base + u.charCodeAt(1));
}

export const CRM_PHONE_COUNTRIES: CrmCountryOption[] = [
  { iso: "US", name: "United States", callingCode: "+1", flag: flagEmoji("US") },
  { iso: "CA", name: "Canada", callingCode: "+1", flag: flagEmoji("CA") },
  { iso: "ES", name: "Spain", callingCode: "+34", flag: flagEmoji("ES") },
  { iso: "GB", name: "United Kingdom", callingCode: "+44", flag: flagEmoji("GB") },
  { iso: "CO", name: "Colombia", callingCode: "+57", flag: flagEmoji("CO") },
  { iso: "MX", name: "Mexico", callingCode: "+52", flag: flagEmoji("MX") },
  { iso: "DE", name: "Germany", callingCode: "+49", flag: flagEmoji("DE") },
  { iso: "FR", name: "France", callingCode: "+33", flag: flagEmoji("FR") },
  { iso: "IT", name: "Italy", callingCode: "+39", flag: flagEmoji("IT") },
  { iso: "PT", name: "Portugal", callingCode: "+351", flag: flagEmoji("PT") },
  { iso: "IE", name: "Ireland", callingCode: "+353", flag: flagEmoji("IE") },
  { iso: "NL", name: "Netherlands", callingCode: "+31", flag: flagEmoji("NL") },
  { iso: "CH", name: "Switzerland", callingCode: "+41", flag: flagEmoji("CH") },
  { iso: "AU", name: "Australia", callingCode: "+61", flag: flagEmoji("AU") },
  { iso: "JP", name: "Japan", callingCode: "+81", flag: flagEmoji("JP") },
  { iso: "IN", name: "India", callingCode: "+91", flag: flagEmoji("IN") },
  { iso: "BR", name: "Brazil", callingCode: "+55", flag: flagEmoji("BR") },
  { iso: "AR", name: "Argentina", callingCode: "+54", flag: flagEmoji("AR") },
  { iso: "CL", name: "Chile", callingCode: "+56", flag: flagEmoji("CL") },
  { iso: "AE", name: "United Arab Emirates", callingCode: "+971", flag: flagEmoji("AE") },
  { iso: "SA", name: "Saudi Arabia", callingCode: "+966", flag: flagEmoji("SA") },
  { iso: "SG", name: "Singapore", callingCode: "+65", flag: flagEmoji("SG") },
  { iso: "NZ", name: "New Zealand", callingCode: "+64", flag: flagEmoji("NZ") },
  { iso: "SE", name: "Sweden", callingCode: "+46", flag: flagEmoji("SE") },
  { iso: "NO", name: "Norway", callingCode: "+47", flag: flagEmoji("NO") },
  { iso: "DK", name: "Denmark", callingCode: "+45", flag: flagEmoji("DK") },
  { iso: "FI", name: "Finland", callingCode: "+358", flag: flagEmoji("FI") },
  { iso: "PL", name: "Poland", callingCode: "+48", flag: flagEmoji("PL") },
  { iso: "AT", name: "Austria", callingCode: "+43", flag: flagEmoji("AT") },
  { iso: "BE", name: "Belgium", callingCode: "+32", flag: flagEmoji("BE") },
  { iso: "ZA", name: "South Africa", callingCode: "+27", flag: flagEmoji("ZA") },
  { iso: "IL", name: "Israel", callingCode: "+972", flag: flagEmoji("IL") },
  { iso: "KR", name: "South Korea", callingCode: "+82", flag: flagEmoji("KR") },
  { iso: "CN", name: "China", callingCode: "+86", flag: flagEmoji("CN") },
  { iso: "PH", name: "Philippines", callingCode: "+63", flag: flagEmoji("PH") },
];

export function findCountryByIso(iso: string): CrmCountryOption | undefined {
  return CRM_PHONE_COUNTRIES.find((c) => c.iso === iso.toUpperCase());
}

export function findCountryByCallingCode(code: string): CrmCountryOption | undefined {
  const norm = code.startsWith("+") ? code : `+${code.replace(/\D/g, "")}`;
  return CRM_PHONE_COUNTRIES.find((c) => c.callingCode === norm);
}

export function filterCountries(query: string): CrmCountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return CRM_PHONE_COUNTRIES;
  return CRM_PHONE_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q) ||
      c.callingCode.includes(q) ||
      c.callingCode.replace("+", "").includes(q.replace("+", "")),
  );
}

export function defaultCountryIso(): string {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language ?? "";
    const match = /^([a-z]{2})-([A-Z]{2})$/.exec(lang);
    if (match?.[2] && findCountryByIso(match[2])) return match[2];
  }
  return "US";
}