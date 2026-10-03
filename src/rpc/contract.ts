import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { referenceSchema } from "../types/schema.ts";

export const tagInfoSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export const rpcContract = defineRpcContract({
  references_list: {
    input: z.object({
      projectId: z.string().optional(),
      tag: z.string().optional(),
      query: z.string().optional(),
    }),
    output: z.object({
      references: z.array(referenceSchema),
    }),
  },
  references_get: {
    input: z.object({
      projectId: z.string().optional(),
      id: z.string(),
    }),
    output: z.object({
      reference: referenceSchema.nullable(),
    }),
  },
  references_add: {
    input: z.object({
      projectId: z.string().optional(),
      urlOrPath: z.string().min(1, "URL or path cannot be empty"),
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
      aspectRatio: z.number().positive().optional(),
      open: z.boolean().optional(),
      threadId: z.string().optional(),
    }),
    output: referenceSchema,
  },
  references_remove: {
    input: z.object({
      projectId: z.string().optional(),
      id: z.string(),
    }),
    output: z.object({
      removed: z.boolean(),
    }),
  },
  references_tags: {
    input: z.object({
      projectId: z.string().optional(),
    }),
    output: z.object({
      tags: z.array(tagInfoSchema),
    }),
  },
  references_open: {
    input: z.object({
      projectId: z.string().optional(),
      threadId: z.string().optional(),
      referenceId: z.string().optional(),
    }),
    output: z.object({
      ok: z.boolean(),
    }),
  },
});

export type ReferencesRpcContract = typeof rpcContract;
