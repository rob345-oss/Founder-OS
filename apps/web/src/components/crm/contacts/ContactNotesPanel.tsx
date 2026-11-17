"use client";

import { Pin, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { crmBtnPrimarySm, crmBtnSecondary } from "@/components/crm/crmUi";
import { addCrmNote, deleteCrmNote, updateCrmNote } from "@/lib/crm/client-api";
import { CRM_NOTE_CATEGORIES } from "@/lib/crm/types";
import type { CrmNote, CrmNoteCategory } from "@/lib/crm/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2.5 text-sm text-[var(--studio-text-primary)]";

export function ContactNotesPanel({
  contactId,
  token,
  notes,
  onChange,
}: {
  contactId: string;
  token: string | null;
  notes: CrmNote[];
  onChange: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<CrmNoteCategory>("general");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter((n) => n.body.toLowerCase().includes(term) || n.category.includes(term));
  }, [notes, q]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !draft.trim()) return;
    await addCrmNote(token, contactId, draft, { category });
    setDraft("");
    await onChange();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--studio-text-tertiary)]">Notes are private CRM information — not used for automated enrichment.</p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--studio-text-tertiary)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes"
          className={`${fieldClass} pl-9`}
        />
      </div>

      <form onSubmit={(e) => void onAdd(e)} className="space-y-2 rounded-xl border border-[var(--studio-border)] p-4">
        <label className="block text-xs font-medium text-[var(--studio-text-secondary)]">New note</label>
        <textarea
          rows={4}
          className={fieldClass}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What did you learn from this interaction?"
        />
        <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value as CrmNoteCategory)}>
          {CRM_NOTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button type="submit" className={crmBtnPrimarySm} disabled={!token || !draft.trim()}>
          Save note
        </button>
      </form>

      <ul className="space-y-3">
        {filtered.map((note) => (
          <li
            key={note.id}
            className={[
              "rounded-xl border p-4",
              note.pinned
                ? "border-[var(--studio-accent)]/50 bg-[var(--studio-accent-muted)]/30"
                : "border-[var(--studio-border)] bg-[var(--studio-bg-1)]",
            ].join(" ")}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--studio-text-tertiary)]">
              <span>
                {note.category.replaceAll("_", " ")} · {new Date(note.createdAt).toLocaleString()}
                {note.updatedAt !== note.createdAt ? ` · edited ${new Date(note.updatedAt).toLocaleString()}` : null}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={crmBtnSecondary}
                  title={note.pinned ? "Unpin" : "Pin"}
                  onClick={() => {
                    if (!token) return;
                    void updateCrmNote(token, contactId, note.id, { pinned: !note.pinned }).then(() => onChange());
                  }}
                >
                  <Pin className={`h-3.5 w-3.5 ${note.pinned ? "fill-current" : ""}`} />
                </button>
                <button
                  type="button"
                  className={crmBtnSecondary}
                  onClick={() => {
                    setEditingId(note.id);
                    setEditBody(note.body);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={crmBtnSecondary}
                  onClick={() => {
                    if (!token || !window.confirm("Delete this note?")) return;
                    void deleteCrmNote(token, contactId, note.id).then(() => onChange());
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea rows={4} className={fieldClass} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={crmBtnPrimarySm}
                    onClick={() => {
                      if (!token) return;
                      void updateCrmNote(token, contactId, note.id, { body: editBody }).then(() => {
                        setEditingId(null);
                        void onChange();
                      });
                    }}
                  >
                    Save
                  </button>
                  <button type="button" className={crmBtnSecondary} onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-[var(--studio-text-primary)]">{note.body}</p>
            )}
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p className="text-sm text-[var(--studio-text-tertiary)]">No notes yet.</p>}
    </div>
  );
}