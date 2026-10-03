import { z } from "zod";

export const referenceKindSchema = z.enum(["image", "website", "github", "doc"]);
export type ReferenceKind = z.infer<typeof referenceKindSchema>;

export const referenceSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string().nullable().optional(),
  kind: referenceKindSchema.default("image"),
  urlOrPath: z.string().min(1),
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  addedAt: z.string(),
  notes: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  source: z.string().default("manual"),
  aspectRatio: z.number().positive().nullable().optional(),
});

export type Reference = z.infer<typeof referenceSchema>;

export const createReferenceInputSchema = z.object({
  urlOrPath: z.string().min(1, "URL or path is required"),
  title: z.string().nullable().optional(),
  kind: referenceKindSchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  aspectRatio: z.number().positive().nullable().optional(),
});

export type CreateReferenceInput = z.infer<typeof createReferenceInputSchema>;

export const referenceFilterSchema = z.object({
  tag: z.string().nullable().optional(),
  kind: referenceKindSchema.nullable().optional(),
  query: z.string().nullable().optional(),
});

export type ReferenceFilter = z.infer<typeof referenceFilterSchema>;

export const tagInfoSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export type TagInfo = z.infer<typeof tagInfoSchema>;

export const projectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  previewUrls: z.array(z.string()),
  lastUpdatedAt: z.string().nullable().optional(),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;
