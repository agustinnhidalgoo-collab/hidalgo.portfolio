import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Versión en edición (JSON de ProjectContent). */
  draft: text("draft").notNull(),
  /** Última versión publicada (JSON de ProjectContent) o null. */
  published: text("published"),
  publishedAt: integer("published_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["image", "video", "file"] }).notNull(),
  originalName: text("original_name").notNull(),
  file: text("file").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  blur: text("blur"),
  variants: text("variants").notNull().default("[]"),
  alt: text("alt").notNull().default('{"es":"","en":""}'),
  createdAt: integer("created_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
