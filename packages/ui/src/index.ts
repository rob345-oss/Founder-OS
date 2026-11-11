/**
 * Shared UI primitives for Founder OS web (expand as needed).
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
