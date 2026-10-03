import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MetadataScraper } from "../src/services/metadata-scraper.ts";

describe("MetadataScraper (TDD)", () => {
  const scraper = new MetadataScraper();

  test("identifies direct image URLs without fetching HTML", async () => {
    const meta = await scraper.scrape("https://example.com/assets/banner.png");
    assert.equal(meta.kind, "image");
    assert.equal(meta.previewUrl, "https://example.com/assets/banner.png");
    assert.equal(meta.title, "banner.png");
  });

  test("parses HTML OpenGraph metadata correctly", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Linear — A better way to build products</title>
          <meta property="og:title" content="Linear • Issue Tracking" />
          <meta property="og:description" content="Linear helps streamline software projects, sprints, and bug tracking." />
          <meta property="og:image" content="https://linear.app/static/og.png" />
          <link rel="icon" href="/favicon.svg" />
        </head>
        <body><h1>Hello</h1></body>
      </html>
    `;

    const parsed = scraper.parseHtml("https://linear.app/homepage", html);

    assert.equal(parsed.kind, "website");
    assert.equal(parsed.title, "Linear • Issue Tracking");
    assert.equal(parsed.description, "Linear helps streamline software projects, sprints, and bug tracking.");
    assert.equal(parsed.previewUrl, "https://linear.app/static/og.png");
    assert.equal(parsed.faviconUrl, "https://linear.app/favicon.svg");
    assert.equal(parsed.domain, "linear.app");
  });

  test("falls back to standard title, description and origin favicon when OG tags are absent", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Simple Tool</title>
          <meta name="description" content="A simple utility for developers." />
        </head>
        <body></body>
      </html>
    `;

    const parsed = scraper.parseHtml("https://tools.dev/subpath", html);

    assert.equal(parsed.kind, "website");
    assert.equal(parsed.title, "My Simple Tool");
    assert.equal(parsed.description, "A simple utility for developers.");
    assert.equal(parsed.domain, "tools.dev");
    assert.equal(parsed.faviconUrl, "https://tools.dev/favicon.ico");
    assert.equal(parsed.previewUrl, null);
  });

  test("identifies GitHub repositories and extracts repo domain", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="GitHub - get-bb/plugin-sdk: Plugin SDK for BB" />
          <meta property="og:image" content="https://opengraph.githubassets.com/123/get-bb/plugin-sdk" />
        </head>
      </html>
    `;

    const parsed = scraper.parseHtml("https://github.com/get-bb/plugin-sdk", html);

    assert.equal(parsed.kind, "github");
    assert.equal(parsed.domain, "github.com");
    assert.equal(parsed.previewUrl, "https://opengraph.githubassets.com/123/get-bb/plugin-sdk");
  });
});
