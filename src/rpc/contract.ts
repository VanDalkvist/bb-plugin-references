import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { referenceSchema, tagInfoSchema, projectSummarySchema } from "../types/schema.ts";

export const rpcContract = defineRpcContract({
  references_list: {
    input: z.object({
      projectId: z.string().nullable().optional(),
      tag: z.string().nullable().optional(),
      query: z.string().nullable().optional(),
    }).nullable().optional(),
    output: z.object({
      references: z.array(referenceSchema),
    }),
  },
  references_get: {
    input: z.object({
      projectId: z.string().nullable().optional(),
      id: z.string(),
    }),
    output: z.object({
      reference: referenceSchema.nullable(),
    }),
  },
  references_add: {
    input: z.object({
      projectId: z.string().nullable().optional(),
      urlOrPath: z.string().min(1, "URL or path cannot be empty"),
      title: z.string().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      notes: z.string().nullable().optional(),
      source: z.string().nullable().optional(),
      aspectRatio: z.number().positive().nullable().optional(),
      open: z.boolean().nullable().optional(),
      threadId: z.string().nullable().optional(),
    }),
    output: referenceSchema,
  },
  references_remove: {
    input: z.object({
      projectId: z.string().nullable().optional(),
      id: z.string(),
    }),
    output: z.object({
      removed: z.boolean(),
    }),
  },
  references_tags: {
    input: z.object({
      projectId: z.string().nullable().optional(),
    }).nullable().optional(),
    output: z.object({
      tags: z.array(tagInfoSchema),
    }),
  },
  references_open: {
    input: z.object({
      projectId: z.string().nullable().optional(),
      threadId: z.string().nullable().optional(),
      referenceId: z.string().nullable().optional(),
    }),
    output: z.object({
      ok: z.boolean(),
    }),
  },
  projects_list: {
    input: z.null().optional(),
    output: z.object({
      projects: z.array(projectSummarySchema),
    }),
  },
});

export type ReferencesRpcContract = typeof rpcContract;
