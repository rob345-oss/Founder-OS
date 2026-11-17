import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MARKETING_APP = path.resolve(process.cwd(), "src/app/marketing");
const API_MARKETING = path.resolve(process.cwd(), "src/app/api/marketing");

function collectPageRoutes(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...collectPageRoutes(full, rel));
      continue;
    }
    if (entry.name === "page.tsx" || entry.name === "page.ts") {
      const route = `/${base.replace(/\\/g, "/")}`.replace(/\/page$/, "").replace(/\/+/g, "/");
      routes.push(route || "/");
    }
  }
  return routes;
}

describe("Marketing Command Center route inventory", () => {
  it("includes all marketing app router pages under /marketing", () => {
    const pages = collectPageRoutes(MARKETING_APP).map((r) =>
      r === "/" ? "/marketing" : `/marketing${r}`,
    );
    expect(pages.length).toBeGreaterThanOrEqual(15);
    expect(pages).toContain("/marketing/social/calendar");
    expect(pages).toContain("/marketing/social/create");
    expect(pages).toContain("/marketing/settings");
  });

  it("includes marketing API route handlers", () => {
    const walk = (d: string, prefix = ""): string[] => {
      if (!fs.existsSync(d)) return [];
      const out: string[] = [];
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) out.push(...walk(full, rel));
        else if (entry.name === "route.ts") out.push(`/api/marketing/${prefix}`);
      }
      return out;
    };
    const apis = walk(API_MARKETING);
    expect(apis).toContain("/api/marketing/overview");
    expect(apis).toContain("/api/marketing/social/posts");
  });
});