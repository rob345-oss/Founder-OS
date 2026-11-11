export const STUDIO_MEDIA_DRAG_MIME = "application/founder-os-studio-media+json";

export type StudioMediaDragPayload = {
  ids: string[];
  primaryId?: string;
};

export function writeMediaDragData(dt: DataTransfer, ids: string[]): void {
  const payload: StudioMediaDragPayload = { ids, primaryId: ids[0] };
  dt.setData(STUDIO_MEDIA_DRAG_MIME, JSON.stringify(payload));
  dt.setData("text/plain", ids.join(","));
  dt.effectAllowed = "copyMove";
}

export function readMediaDragData(dt: DataTransfer): StudioMediaDragPayload | null {
  const raw = dt.getData(STUDIO_MEDIA_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StudioMediaDragPayload;
    if (!parsed.ids?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
