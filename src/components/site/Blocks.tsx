import type { Dictionary } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { type Block, type Locale, type MediaRecord, t } from "@/lib/types";
import { toEmbedUrl } from "@/lib/utils";
import { Picture } from "./Picture";
import { Video } from "./Video";

interface Props {
  blocks: Block[];
  media: Record<string, MediaRecord>;
  locale: Locale;
  dict: Dictionary;
}

function Caption({ text }: { text: string }) {
  if (!text.trim()) return null;
  return <figcaption className="caption meta">{text}</figcaption>;
}

function Visual({ id, media, locale, sizes, dict }: { id: string | null; media: Record<string, MediaRecord>; locale: Locale; sizes: string; dict: Dictionary }) {
  const m = id ? media[id] : undefined;
  if (!m) return null;
  if (m.kind === "video")
    return <Video media={m} autoplay label={t(m.alt, locale)} labels={dict.video} />;
  return <Picture media={m} locale={locale} sizes={sizes} reveal />;
}

export function Blocks({ blocks, media, locale, dict }: Props) {
  return (
    <div className="blocks">
      {blocks.map((b) => {
        switch (b.type) {
          case "text": {
            const heading = t(b.heading, locale);
            const body = t(b.body, locale);
            if (!heading && !body) return null;
            return (
              <section key={b.id} className="block-text grid wrap">
                {heading && (
                  <h2 className="block-text__heading h3" data-reveal="lines">
                    {heading}
                  </h2>
                )}
                <div className="block-text__body" data-reveal="rise">
                  <RichText text={body} className="prose lead" />
                </div>
              </section>
            );
          }
          case "image": {
            if (!b.mediaId || !media[b.mediaId]) return null;
            const wide = b.size === "wide";
            return (
              <figure key={b.id} className={`wrap ${wide ? "" : "grid block-image--contained"}`} style={{ margin: 0 }}>
                <div>
                  <Visual id={b.mediaId} media={media} locale={locale} dict={dict} sizes={wide ? "100vw" : "(min-width: 900px) 84vw, 100vw"} />
                  <Caption text={t(b.caption, locale)} />
                </div>
              </figure>
            );
          }
          case "full": {
            if (!b.mediaId || !media[b.mediaId]) return null;
            return (
              <figure key={b.id} className="block-full" style={{ margin: 0 }}>
                <Visual id={b.mediaId} media={media} locale={locale} dict={dict} sizes="100vw" />
                <div className="wrap">
                  <Caption text={t(b.caption, locale)} />
                </div>
              </figure>
            );
          }
          case "gallery": {
            const items = b.items.filter((i) => i.mediaId && media[i.mediaId]);
            if (!items.length) return null;
            return (
              <div key={b.id} className={`wrap gallery gallery--${b.columns}`}>
                {items.map((item, i) => (
                  <figure key={i} style={{ margin: 0 }}>
                    <Visual
                      id={item.mediaId}
                      media={media}
                      locale={locale}
                      dict={dict}
                      sizes={b.columns === 3 ? "(min-width: 700px) 33vw, 100vw" : "(min-width: 700px) 50vw, 100vw"}
                    />
                    <Caption text={t(item.caption, locale)} />
                  </figure>
                ))}
              </div>
            );
          }
          case "columns": {
            const col = (c: typeof b.left, key: string) =>
              c.kind === "image" ? (
                <Visual key={key} id={c.mediaId} media={media} locale={locale} dict={dict} sizes="(min-width: 800px) 50vw, 100vw" />
              ) : (
                <div key={key} data-reveal="rise">
                  <RichText text={t(c.text, locale)} className="prose lead" />
                </div>
              );
            return (
              <div key={b.id} className="wrap columns">
                {col(b.left, "l")}
                {col(b.right, "r")}
              </div>
            );
          }
          case "video": {
            const caption = t(b.caption, locale);
            if (b.source === "embed") {
              const src = toEmbedUrl(b.url);
              if (!src) return null;
              return (
                <figure key={b.id} className="wrap" style={{ margin: 0 }}>
                  <div className="embed" data-reveal="image">
                    <iframe
                      src={src}
                      title={caption || "Video"}
                      loading="lazy"
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                  <Caption text={caption} />
                </figure>
              );
            }
            const m = b.mediaId ? media[b.mediaId] : undefined;
            if (!m || m.kind !== "video") return null;
            return (
              <figure key={b.id} className="wrap" style={{ margin: 0 }}>
                <Video media={m} autoplay={b.autoplay} label={caption || t(m.alt, locale)} labels={dict.video} />
                <Caption text={caption} />
              </figure>
            );
          }
        }
      })}
    </div>
  );
}
