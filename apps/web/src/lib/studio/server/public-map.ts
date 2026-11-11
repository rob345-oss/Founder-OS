import type {
  StudioAuthorizedDirectory,
  StudioMediaItem,
} from "@founder-os/studio";

import { directoryLabelFromPath } from "./store";
import type { StudioDirectoryPublic, StudioMediaPublic } from "../client-api";

export function toPublicDirectory(dir: StudioAuthorizedDirectory): StudioDirectoryPublic {
  return {
    id: dir.id,
    label: dir.label,
    rootLabel: directoryLabelFromPath(dir.rootPath),
    addedAt: dir.addedAt,
    lastScannedAt: dir.lastScannedAt,
  };
}

export function toPublicMedia(
  item: StudioMediaItem,
  directories: StudioAuthorizedDirectory[],
): StudioMediaPublic {
  const dir = directories.find((d) => d.id === item.directoryId);
  const directoryLabel = dir?.label ?? "Unknown source";
  const parent = item.relativePath.includes("/")
    ? item.relativePath.split("/").slice(0, -1).join("/")
    : "";
  return {
    ...item,
    directoryLabel,
    sourceHint: parent ? `${directoryLabel} · ${parent}` : directoryLabel,
  };
}
