export function buildTrackedUrl(input: {
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string | null;
  utmTerm?: string | null;
}): string {
  const url = new URL(input.destinationUrl);
  url.searchParams.set("utm_source", input.utmSource);
  url.searchParams.set("utm_medium", input.utmMedium);
  url.searchParams.set("utm_campaign", input.utmCampaign);
  if (input.utmContent) url.searchParams.set("utm_content", input.utmContent);
  if (input.utmTerm) url.searchParams.set("utm_term", input.utmTerm);
  return url.toString();
}