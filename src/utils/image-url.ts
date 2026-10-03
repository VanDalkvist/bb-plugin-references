export function isWebUrl(urlOrPath: string): boolean {
  const trimmed = urlOrPath.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  );
}

export function resolveImageUrl(urlOrPath: string): string {
  const trimmed = urlOrPath.trim();
  if (isWebUrl(trimmed)) {
    return trimmed;
  }
  // Local file: route through plugin's secure HTTP image server
  return `/api/v1/plugins/references/http/image?path=${encodeURIComponent(trimmed)}`;
}
