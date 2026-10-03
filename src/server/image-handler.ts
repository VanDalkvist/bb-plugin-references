import { resolve, extname } from "node:path";
import { readFile, stat, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface ImageResponse {
  status: number;
  body: Buffer | string;
  headers: Record<string, string>;
}

const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

export function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
  const resolvedTarget = resolve(targetPath);
  return allowedRoots.some((root) => {
    const resolvedRoot = resolve(root);
    if (resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + "/")) {
      return true;
    }
    // Also check canonical /private symlinks on macOS
    if (resolvedRoot.startsWith("/var/") && resolvedTarget.startsWith("/private/var/")) {
      const altTarget = resolvedTarget.slice("/private".length);
      return altTarget === resolvedRoot || altTarget.startsWith(resolvedRoot + "/");
    }
    if (resolvedTarget.startsWith("/var/") && resolvedRoot.startsWith("/private/var/")) {
      const altRoot = resolvedRoot.slice("/private".length);
      return resolvedTarget === altRoot || resolvedTarget.startsWith(altRoot + "/");
    }
    return false;
  });
}

export async function handleImageRequest(
  rawPath: string,
  allowedRoots: string[]
): Promise<ImageResponse> {
  const resolved = resolve(rawPath);

  if (!isPathAllowed(resolved, allowedRoots)) {
    return {
      status: 403,
      body: "Forbidden: Path traversal detected outside allowed roots",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    };
  }

  if (!existsSync(resolved)) {
    return {
      status: 404,
      body: "Not Found: Image does not exist",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    };
  }

  try {
    const canonical = await realpath(resolved);
    if (!isPathAllowed(canonical, allowedRoots)) {
      return {
        status: 403,
        body: "Forbidden: Canonical path outside allowed roots",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      };
    }

    const fileStat = await stat(canonical);
    if (!fileStat.isFile()) {
      return {
        status: 400,
        body: "Bad Request: Path is not a regular file",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      };
    }

    const ext = extname(canonical).toLowerCase();
    const contentType = ALLOWED_IMAGE_MIME_TYPES[ext];

    if (!contentType) {
      return {
        status: 403,
        body: "Forbidden: Unsupported or disallowed file type for image serving",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      };
    }

    const content = await readFile(canonical);
    const etag = `"${fileStat.size}-${Math.floor(fileStat.mtimeMs)}"`;

    return {
      status: 200,
      body: content,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "ETag": etag,
        "X-Content-Type-Options": "nosniff",
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 500,
      body: `Internal Server Error: ${message}`,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    };
  }
}
