import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { getCrmConfig } from "../config";

export function ensureCrmDataDir(): string {
  const cfg = getCrmConfig();
  const base =
    cfg.dataDir?.trim() ||
    path.join(process.env.LOCALAPPDATA ?? os.homedir(), "FounderOS", "CRM");
  fs.mkdirSync(base, { recursive: true });
  return base;
}
