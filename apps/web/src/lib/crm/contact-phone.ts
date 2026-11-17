import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type NormalizedPhone = {
  e164: string | null;
  display: string;
  nationalNumber: string;
  countryIso: string;
  countryCallingCode: string;
  extension: string;
  valid: boolean;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function parseCrmPhoneEntry(
  countryIso: string,
  nationalNumber: string,
  countryCallingCode: string,
  extension = "",
): NormalizedPhone {
  const iso = (countryIso || "US").toUpperCase() as CountryCode;
  const rawNational = nationalNumber.trim();
  const ext = extension.trim().replace(/^x/i, "");
  const cc = countryCallingCode.trim().startsWith("+")
    ? countryCallingCode.trim()
    : `+${digitsOnly(countryCallingCode)}`;

  const withCc = rawNational.startsWith("+") ? rawNational : `${cc}${digitsOnly(rawNational)}`;
  let parsed = parsePhoneNumberFromString(withCc, iso);
  if (!parsed?.isValid()) {
    parsed = parsePhoneNumberFromString(rawNational, iso);
  }

  if (parsed?.isValid()) {
    const e164 = ext ? `${parsed.format("E.164")};ext=${ext}` : parsed.format("E.164");
    return {
      e164,
      display: ext ? `${parsed.formatInternational()} ext. ${ext}` : parsed.formatInternational(),
      nationalNumber: parsed.nationalNumber,
      countryIso: parsed.country ?? iso,
      countryCallingCode: `+${parsed.countryCallingCode}`,
      extension: ext,
      valid: true,
    };
  }

  const fallbackNational = digitsOnly(rawNational);
  return {
    e164: fallbackNational ? `${cc}${fallbackNational}` : null,
    display: [cc, rawNational, ext ? `ext. ${ext}` : ""].filter(Boolean).join(" "),
    nationalNumber: fallbackNational,
    countryIso: iso,
    countryCallingCode: cc,
    extension: ext,
    valid: false,
  };
}

export function phoneDigitsForTel(e164: string | null | undefined, fallbackCode: string, national: string): string {
  if (e164) {
    return e164.replace(/;ext=.*/i, "").replace(/[^\d+]/g, "");
  }
  const cc = fallbackCode.replace(/[^\d+]/g, "");
  const n = digitsOnly(national);
  return `${cc}${n}`;
}

export function normalizePhoneForDuplicateCheck(
  countryIso: string,
  nationalNumber: string,
  countryCallingCode: string,
): string | null {
  const n = parseCrmPhoneEntry(countryIso, nationalNumber, countryCallingCode);
  if (!n.e164) return null;
  return n.e164.replace(/;ext=.*/i, "");
}