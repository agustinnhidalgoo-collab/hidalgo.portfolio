import Image from "next/image";
import { type Locale, type Media, t } from "@/lib/types";
import { Video } from "./Video";

interface Props {
  media?: Media | null;
  locale: Locale;
  sizes?: string;
  className?: string;
  eager?: boolean;
  fill?: boolean;
  alt?: string;
  reveal?: boolean;
  videoLabels?: { play: string; pause: string; soundOn: string; soundOff: string };
}

/**
 * Imagen responsiva (Next genera los tamaños y el difuminado de carga).
 * Si el medio es un video, lo reproduce en loop y sin sonido.
 */
export function Picture({ media, locale, sizes = "100vw", className = "", eager, fill, alt, reveal, videoLabels }: Props) {
  if (!media) return <div className={`media media__placeholder ${className}`} aria-hidden="true" />;
  if (media.type === "video") {
    return (
      <Video
        src={media.src}
        poster={media.poster?.src}
        label={alt ?? t(media.alt, locale)}
        labels={videoLabels ?? { play: "Play", pause: "Pause", soundOn: "Sound", soundOff: "Mute" }}
        className={className}
      />
    );
  }
  return (
    <div className={`media ${fill ? "media--fill" : ""} ${className}`} data-reveal={reveal ? "image" : undefined}>
      <Image
        src={media.src}
        alt={alt ?? t(media.alt, locale)}
        sizes={sizes}
        placeholder="blur"
        priority={eager}
        quality={85}
        style={fill ? { width: "100%", height: "100%", objectFit: "cover" } : { width: "100%", height: "auto" }}
      />
    </div>
  );
}

/** Imagen en duotono de la paleta que recupera su color al pasar el cursor por el enlace que la contiene. */
export function DuoPicture(props: Props) {
  if (!props.media || props.media.type !== "image") return <Picture {...props} />;
  return (
    <div className={`duo ${props.className ?? ""}`}>
      <Picture {...props} className="duo__tone media--fill" reveal={false} fill />
      <div className="duo__color" aria-hidden="true">
        <Picture {...props} className="media--fill" reveal={false} alt="" fill />
      </div>
    </div>
  );
}
