import { z } from 'zod';

// Discord Embed Field schema
export const DiscordEmbedFieldSchema = z.object({
  name: z.string(),
  value: z.string(),
  inline: z.boolean().optional(),
});

// Discord Embed Footer schema
export const DiscordEmbedFooterSchema = z.object({
  text: z.string(),
  icon_url: z.string().optional(),
});

// Discord Embed Author schema
export const DiscordEmbedAuthorSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  icon_url: z.string().optional(),
});

// Discord Embed schema
export const DiscordEmbedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  color: z.number().optional(),
  fields: z.array(DiscordEmbedFieldSchema).optional(),
  footer: DiscordEmbedFooterSchema.optional(),
  author: DiscordEmbedAuthorSchema.optional(),
  timestamp: z.string().optional(),
  thumbnail: z.object({ url: z.string() }).optional(),
  image: z.object({ url: z.string() }).optional(),
});

// Discord Webhook Payload schema
export const DiscordWebhookPayloadSchema = z.object({
  content: z.string().optional(),
  embeds: z.array(DiscordEmbedSchema).optional(),
  username: z.string().optional(),
  avatar_url: z.string().optional(),
});

// Inferred types from schemas
export type DiscordEmbedField = z.infer<typeof DiscordEmbedFieldSchema>;
export type DiscordEmbedFooter = z.infer<typeof DiscordEmbedFooterSchema>;
export type DiscordEmbedAuthor = z.infer<typeof DiscordEmbedAuthorSchema>;
export type DiscordEmbed = z.infer<typeof DiscordEmbedSchema>;
export type DiscordWebhookPayload = z.infer<typeof DiscordWebhookPayloadSchema>;
