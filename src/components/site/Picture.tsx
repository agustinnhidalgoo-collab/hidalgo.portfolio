import type { CSSProperties } from "react";
import { mediaUrl } from "@/lib/media-url";
import { type Locale, type MediaRecord, t } from "@/lib/types";

interface Props {
  media?: MediaRecord | null;
  locale: Locale;
  sizes?: string;
  className?: string;
  eager?: boolean;
  fill?: boolean;
  alt?: string;
  style?: CSSProperties;
  reveal?: boolean;
  filterId?: string;
}

export function imageSources(media: MediaRecord) {
  if (!media.variants.length) return { src: mediaUrl(media.file), srcSet: undefined };
  const sorted = [...media.variants].sort((a, b) => a.w - b.w);
  return {
    src: mediaUrl(sorted[Math.min(sorted.length - 1, 2)].file),
    srcSet: sorted.map((v) => `${mediaUrl(v.file)} ${v.w}w`).join(", "),
  };
}

/** Imagen responsiva con variantes WEBP y un difuminado de baja resolución mientras carga. */
export function Picture({ media, locale, sizes = "100vw", className = "", eager, fill, alt, style, reveal, filterId }: Props) {
  if (!media || media.kind !== "image") {
    return <div className={`media media__placeholder ${className}`} aria-hidden="true" />;
  }
  const { src, srcSet } = imageSources(media);
  return (
    <div
      className={`media ${fill ? "media--fill" : ""} ${className}`}
      style={{ backgroundImage: media.blur ? `url(${media.blur})` : undefined, ...style }}
      data-reveal={reveal ? "image" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        alt={alt ?? t(media.alt, locale)}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        style={filterId ? { filter: `url(#${filterId})` } : undefined}
      />
    </div>
  );
}

/** Imagen en duotono de la paleta que recupera su color al pasar el cursor por el enlace que la contiene. */
export function DuoPicture(props: Props) {
  if (!props.media || props.media.kind !== "image") return <Picture {...props} />;
  return (
    <div className={`duo ${props.className ?? ""}`} data-reveal={props.reveal ? "image" : undefined}>
      <Picture {...props} className="duo__tone media--fill" reveal={false} fill />
      <div className="duo__color" aria-hidden="true">
        <Picture {...props} className="media--fill" reveal={false} alt="" fill />
      </div>
    </div>
  );
}
