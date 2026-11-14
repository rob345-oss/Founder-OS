import { assertMarketingPersistenceForHost } from "../config";
import { classifyDataError, jsonErrorResponse } from "@/lib/crm/http-json";

/** Ensures hosted Marketing uses Postgres and returns JSON failures instead of empty 500s. */
export async function runMarketingDataHandler(handler: () => Promise<Response>): Promise<Response> {
  try {
    assertMarketingPersistenceForHost();
    return await handler();
  } catch (err) {
    const { message, code, status } = classifyDataError(err, "marketing");
    if (process.env.NODE_ENV !== "test") {
      console.error(`[marketing-api] ${code}`, err instanceof Error ? err.message : err);
    }
    return jsonErrorResponse({ error: "Marketing data error", detail: message, code }, status);
  }
}