import type { Dictionary } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { type Block, type L10n, type Locale, type Media, isMedia, t } from "@/lib/types";
import { toEmbedUrl } from "@/lib/utils";
import { Picture } from "./Picture";

interface Props {
  blocks: Block[];
  locale: Locale;
  dict: Dictionary;
}

function Caption({ text }: { text: string }) {
  if (!text.trim()) return null;
  return <figcaption className="caption meta">{text}</figcaption>;
}

export function Blocks({ blocks, locale, dict }: Props) {
  const visual = (media: Media, sizes: string) => (
    <div data-skew>
      <Picture media={media} locale={locale} sizes={sizes} reveal videoLabels={dict.video} />
    </div>
  );

  return (
    <div className="blocks">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text": {
            const heading = t(b.heading, locale);
            return (
              <section key={i} className="block-text grid wrap">
                {heading && (
                  <h2 className="block-text__heading h3" data-reveal="lines">
                    {heading}
                  </h2>
                )}
                <div className="block-text__body" data-reveal="rise">
                  <RichText text={t(b.body, locale)} className="prose lead" />
                </div>
              </section>
            );
          }
          case "image": {
            const wide = b.size === "wide";
            return (
              <figure key={i} className={`wrap ${wide ? "" : "grid block-image--contained"}`} style={{ margin: 0 }}>
                <div>
                  {visual(b.media, wide ? "100vw" : "(min-width: 900px) 84vw, 100vw")}
                  <Caption text={t(b.caption, locale)} />
                </div>
              </figure>
            );
          }
          case "full":
            return (
              <figure key={i} className="block-full" style={{ margin: 0 }}>
                {visual(b.media, "100vw")}
                <div className="wrap">
                  <Caption text={t(b.caption, locale)} />
                </div>
              </figure>
            );
          case "gallery": {
            const columns = b.columns ?? 2;
            return (
              <div key={i} className={`wrap gallery gallery--${columns}`}>
                {b.items.map((item, j) => (
                  <figure key={j} style={{ margin: 0 }}>
                    {visual(item.media, columns === 3 ? "(min-width: 700px) 33vw, 100vw" : "(min-width: 700px) 50vw, 100vw")}
                    <Caption text={t(item.caption, locale)} />
                  </figure>
                ))}
              </div>
            );
          }
          case "columns": {
            const col = (c: Media | L10n, key: string) =>
              isMedia(c) ? (
                <div key={key}>{visual(c, "(min-width: 800px) 50vw, 100vw")}</div>
              ) : (
                <div key={key} data-reveal="rise">
                  <RichText text={t(c, locale)} className="prose lead" />
                </div>
              );
            return (
              <div key={i} className="wrap columns">
                {col(b.left, "l")}
                {col(b.right, "r")}
              </div>
            );
          }
          case "embed": {
            const src = toEmbedUrl(b.url);
            if (!src) return null;
            const caption = t(b.caption, locale);
            return (
              <figure key={i} className="wrap" style={{ margin: 0 }}>
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
        }
      })}
    </div>
  );
}
