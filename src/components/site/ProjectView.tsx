import type { Dictionary } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { categoryNames } from "@/lib/content";
import { type ImageMedia, type Locale, type Project, t } from "@/lib/types";
import { Arrow } from "./Arrow";
import { Blocks } from "./Blocks";
import { DuoPicture, Picture } from "./Picture";
import { TLink } from "./Transition";

interface Props {
  content: Project;
  locale: Locale;
  dict: Dictionary;
  number: number;
  total: number;
  next?: { href: string; title: string; cover: ImageMedia } | null;
}

export function ProjectView({ content, locale, dict, number, total, next }: Props) {
  const title = t(content.title, locale);
  const cats = categoryNames(content, locale);
  const facts = [
    { label: dict.year, value: content.year },
    { label: dict.client, value: t(content.client, locale) },
    { label: dict.role_, value: t(content.role, locale) },
    { label: dict.category, value: cats.join(", ") },
  ].filter((f) => f.value);
  const cover = content.cover;
  const summary = t(content.summary, locale);

  return (
    <article>
      <header className="page-head wrap" data-theme="light">
        <span className="reg reg--tl" aria-hidden="true" />
        <span className="reg reg--tr" aria-hidden="true" />
        <div className="meta" style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }} data-reveal="fade">
          <TLink href={`/${locale}/work`} className="u-link" transitionLabel={dict.nav.work}>
            ← {dict.back}
          </TLink>
          <span>
            {String(number).padStart(2, "0")} / {String(total).padStart(2, "0")}
            {content.isExample && (
              <span className="tag-example" style={{ marginLeft: 10 }}>
                {dict.exampleContent}
              </span>
            )}
          </span>
        </div>
        <h1 className="display project-hero__title" data-reveal="lines">
          {title}
        </h1>
        {facts.length > 0 && (
          <dl className="facts meta" data-reveal="fade" data-delay="0.2">
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {summary && (
          <div className="grid project-summary">
            <div style={{ gridColumn: "1 / -1" }} className="project-summary__text" data-reveal="rise">
              <RichText text={summary} className="lead prose" />
            </div>
          </div>
        )}
      </header>

      {cover && (
        <div className="project-cover" data-reveal="image">
          <div data-parallax="0.16" style={{ height: "100%" }}>
            <Picture media={cover} locale={locale} sizes="100vw" eager fill />
          </div>
        </div>
      )}

      <div data-theme="light">
        <Blocks blocks={content.blocks} locale={locale} dict={dict} />
      </div>

      {next && (
        <section data-theme="dark">
          <TLink
            href={next.href}
            className="next-project wrap"
            transitionLabel={next.title}
            data-cursor="view"
            data-cursor-label={dict.view}
          >
            <span className="meta" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{dict.next}</span>
              <Arrow />
            </span>
            <span className="display next-project__title">{next.title}</span>
            <span style={{ display: "block", width: "min(420px, 60vw)", aspectRatio: "4 / 5", marginTop: 40, marginLeft: "auto" }}>
              <DuoPicture media={next.cover} locale={locale} sizes="420px" fill alt="" />
            </span>
          </TLink>
        </section>
      )}
    </article>
  );
}
