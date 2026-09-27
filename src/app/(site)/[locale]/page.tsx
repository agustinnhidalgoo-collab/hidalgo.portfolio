import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { featuredProjects, projects, site as settings } from "@/lib/content";
import { buildIndexItems } from "@/lib/views";
import { isLocale, t } from "@/lib/types";
import { Arrow } from "@/components/site/Arrow";
import { Clock } from "@/components/site/Clock";
import { KineticWord } from "@/components/site/KineticWord";
import { Marquee } from "@/components/site/Marquee";
import { ProjectIndex } from "@/components/site/ProjectIndex";
import { TLink } from "@/components/site/Transition";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const items = buildIndexItems(featuredProjects(), locale);
  const intro = t(settings.intro, locale);
  const tagline = t(settings.tagline, locale);
  const location = t(settings.location, locale);
  const disciplines = settings.disciplines.map((d) => t(d, locale)).filter(Boolean);

  return (
    <>
      <section className="hero wrap" data-theme="light">
        <span className="reg reg--tl" aria-hidden="true" />
        <span className="reg reg--tr" aria-hidden="true" />

        <div className="grid hero__top">
          <div className="hero__meta meta" data-reveal="fade" data-delay="0.6">
            <span>{dict.role}</span>
            {location && <span className="muted">{location}</span>}
            <span className="muted">
              <Clock timezone={settings.timezone} locale={locale} />
            </span>
          </div>
          {intro && (
            <p className="hero__intro lead" data-reveal="lines" data-delay="0.3">
              {intro}
            </p>
          )}
        </div>

        <div className="hero__bottom">
          <div className="hero__caption meta">
            <span className="scroll-cue">
              <span className="scroll-cue__bar" aria-hidden="true" />
              {dict.scroll}
            </span>
            <span>
              {projects.length} {dict.projects}
            </span>
          </div>
          <KineticWord text="HIDALGO" intro squash />
        </div>
      </section>

      <div data-theme="dark">
        {disciplines.length > 0 && <Marquee items={disciplines} label={dict.disciplines} />}

        <section className="section wrap">
          <div className="section-head">
            <h2 className="display h2" data-reveal="lines">
              {dict.selectedWork}
              <sup className="section-head__count">({String(items.length).padStart(2, "0")})</sup>
            </h2>
          </div>
          {items.length ? (
            <ProjectIndex items={items} locale={locale} viewLabel={dict.view} exampleLabel={dict.exampleContent} />
          ) : (
            <p className="empty meta muted">{dict.noProjects}</p>
          )}
          <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }} data-reveal="fade">
            <TLink href={`/${locale}/work`} className="btn" transitionLabel={dict.nav.work} data-magnetic>
              {dict.allWork} <Arrow />
            </TLink>
          </div>
        </section>
      </div>

      {tagline && (
        <section className="section wrap" data-theme="light">
          <span className="reg reg--tl" style={{ top: 24 }} aria-hidden="true" />
          <span className="reg reg--tr" style={{ top: 24 }} aria-hidden="true" />
          <div className="grid">
            <p className="meta" style={{ gridColumn: "1 / -1", marginBottom: 32 }} data-reveal="fade">
              ({dict.nav.about})
            </p>
            <p className="statement" style={{ gridColumn: "1 / -1" }} data-reveal="words">
              {tagline}
            </p>
            <div style={{ gridColumn: "1 / -1", marginTop: 48 }} data-reveal="fade">
              <TLink href={`/${locale}/about`} className="btn btn--solid" transitionLabel={dict.nav.about} data-magnetic>
                {dict.nav.about} <Arrow />
              </TLink>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
