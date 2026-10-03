import { basename } from "node:path";

export interface ScrapedMetadata {
  kind: "image" | "website" | "github";
  title?: string;
  description?: string;
  previewUrl?: string | null;
  faviconUrl?: string | null;
  domain?: string;
}

const DIRECT_IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".bmp",
  ".ico",
  ".avif",
]);

export class MetadataScraper {
  private isDirectImage(url: string): boolean {
    try {
      const parsed = new URL(url);
      const ext = parsed.pathname.slice(parsed.pathname.lastIndexOf(".")).toLowerCase();
      return DIRECT_IMAGE_EXTS.has(ext);
    } catch {
      return false;
    }
  }

  private resolveUrl(base: string, relativeOrAbsolute?: string | null): string | null {
    if (!relativeOrAbsolute) return null;
    try {
      return new URL(relativeOrAbsolute, base).href;
    } catch {
      return relativeOrAbsolute;
    }
  }

  parseHtml(baseUrl: string, html: string): ScrapedMetadata {
    let domain: string | undefined;
    try {
      domain = new URL(baseUrl).hostname;
    } catch {}

    const isGithub = domain?.includes("github.com") ?? false;
    const kind = isGithub ? "github" : "website";

    // Fast regex extraction for standard tags
    const getMeta = (propOrName: string): string | undefined => {
      // Matches <meta property="..." content="..."> or <meta name="..." content="...">
      // Also handles inverted order: <meta content="..." property="...">
      const regex1 = new RegExp(
        `<meta\\s+[^>]*(?:property|name)=["']${propOrName}["'][^>]*content=["']([^"']+)["']`,
        "i"
      );
      const m1 = html.match(regex1);
      if (m1 && m1[1]) return m1[1].trim();

      const regex2 = new RegExp(
        `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${propOrName}["']`,
        "i"
      );
      const m2 = html.match(regex2);
      if (m2 && m2[1]) return m2[1].trim();

      return undefined;
    };

    // 1. Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle =
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      (titleMatch && titleMatch[1] ? titleMatch[1].trim() : undefined) ||
      domain ||
      baseUrl;

    // Decode basic HTML entities in title
    const title = rawTitle
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&bull;/g, "•");

    // 2. Description
    const description =
      getMeta("og:description") ||
      getMeta("twitter:description") ||
      getMeta("description");

    // 3. Preview Image (OG / Twitter image)
    const rawImage = getMeta("og:image") || getMeta("twitter:image");
    const cleanImage = rawImage?.replace(/&amp;/g, "&");
    const previewUrl = this.resolveUrl(baseUrl, cleanImage);

    // 4. Favicon
    let rawFavicon: string | undefined;
    const iconMatch = html.match(
      /<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["']/i
    );
    if (iconMatch && iconMatch[1]) {
      rawFavicon = iconMatch[1];
    } else {
      const appleIconMatch = html.match(
        /<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
      );
      if (appleIconMatch && appleIconMatch[1]) {
        rawFavicon = appleIconMatch[1];
      }
    }

    const faviconUrl = rawFavicon
      ? this.resolveUrl(baseUrl, rawFavicon)
      : this.resolveUrl(baseUrl, "/favicon.ico");

    return {
      kind,
      title,
      description,
      previewUrl,
      faviconUrl,
      domain,
    };
  }

  async scrape(url: string): Promise<ScrapedMetadata> {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { kind: "image" };
    }

    if (this.isDirectImage(url)) {
      const filename = basename(new URL(url).pathname);
      return {
        kind: "image",
        title: filename,
        previewUrl: url,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let domain: string | undefined;
        try {
          domain = new URL(url).hostname;
        } catch {}
        return {
          kind: "website",
          title: domain || url,
          domain,
          faviconUrl: this.resolveUrl(url, "/favicon.ico"),
        };
      }

      // Read at most 128KB of HTML to find head tags quickly
      const reader = response.body?.getReader();
      let html = "";
      if (reader) {
        const decoder = new TextDecoder();
        let bytesRead = 0;
        const MAX_BYTES = 131072; // 128 KB
        while (bytesRead < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          bytesRead += value.length;
          html += decoder.decode(value, { stream: true });
          if (html.includes("</head>")) break;
        }
      } else {
        html = await response.text();
      }

      return this.parseHtml(url, html);
    } catch {
      let domain: string | undefined;
      try {
        domain = new URL(url).hostname;
      } catch {}
      return {
        kind: "website",
        title: domain || url,
        domain,
        faviconUrl: this.resolveUrl(url, "/favicon.ico"),
      };
    }
  }
}
