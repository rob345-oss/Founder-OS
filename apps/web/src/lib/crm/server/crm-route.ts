import { assertCrmPersistenceForHost } from "../config";
import { classifyDataError, jsonErrorResponse } from "../http-json";

/** Ensures hosted CRM uses Postgres and returns JSON failures instead of empty 500s. */
export async function runCrmDataHandler(handler: () => Promise<Response>): Promise<Response> {
  try {
    assertCrmPersistenceForHost();
    return await handler();
  } catch (err) {
    const { message, code, status } = classifyDataError(err, "crm");
    if (process.env.NODE_ENV !== "test") {
      console.error(`[crm-api] ${code}`, err instanceof Error ? err.message : err);
    }
    return jsonErrorResponse({ error: "CRM data error", detail: message, code }, status);
  }
}