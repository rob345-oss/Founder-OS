import type { ContactListQuery } from "./repository";

export type ContactQueryDialect = "sqlite" | "postgres";

function placeholder(dialect: ContactQueryDialect, index: number): string {
  return dialect === "postgres" ? `$${index}` : "?";
}

export function buildContactListWhere(
  query: ContactListQuery,
  dialect: ContactQueryDialect,
): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (query.archived) parts.push("archived_at IS NOT NULL");
  else parts.push("archived_at IS NULL");

  if (query.q?.trim()) {
    const like = `%${query.q.trim().toLowerCase()}%`;
    const p = (n: number) => placeholder(dialect, params.length + n);
    parts.push(
      `(LOWER(full_name) LIKE ${p(1)} OR LOWER(primary_email) LIKE ${p(2)} OR LOWER(COALESCE(phone,'')) LIKE ${p(3)} OR LOWER(COALESCE(organization,'')) LIKE ${p(4)})`,
    );
    params.push(like, like, like, like);
  }

  if (query.classification) {
    parts.push(
      dialect === "postgres"
        ? `classifications::text LIKE ${placeholder(dialect, params.length + 1)}`
        : `classifications LIKE ${placeholder(dialect, params.length + 1)}`,
    );
    params.push(`%"${query.classification}"%`);
  }
  if (query.relationshipStatus) {
    parts.push(`relationship_status = ${placeholder(dialect, params.length + 1)}`);
    params.push(query.relationshipStatus);
  }
  if (query.pipelineStage) {
    parts.push(`pipeline_stage = ${placeholder(dialect, params.length + 1)}`);
    params.push(query.pipelineStage);
  }
  if (query.tag) {
    parts.push(
      dialect === "postgres"
        ? `tags::text LIKE ${placeholder(dialect, params.length + 1)}`
        : `tags LIKE ${placeholder(dialect, params.length + 1)}`,
    );
    params.push(`%"${query.tag}"%`);
  }
  if (query.source) {
    parts.push(`contact_source LIKE ${placeholder(dialect, params.length + 1)}`);
    params.push(`%${query.source}%`);
  }

  return { clause: parts.join(" AND "), params };
}

export function contactListOrderBy(query: ContactListQuery, dialect: ContactQueryDialect): string {
  const sortCol =
    query.sort === "last_interaction"
      ? "last_interaction_at"
      : query.sort === "next_follow_up"
        ? "next_follow_up_at"
        : "date_added";
  const dir = query.direction === "asc" ? "ASC" : "DESC";
  if (dialect === "sqlite") {
    return `${sortCol} IS NULL, ${sortCol} ${dir}`;
  }
  return `${sortCol} ${dir} NULLS LAST`;
}