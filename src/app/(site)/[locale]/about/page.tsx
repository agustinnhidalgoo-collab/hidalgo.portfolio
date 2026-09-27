import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { site as settings } from "@/lib/content";
import { RichText } from "@/lib/rich-text";
import { isLocale, t } from "@/lib/types";
import { Marquee } from "@/components/site/Marquee";
import { Picture } from "@/components/site/Picture";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: getDictionary(locale).nav.about,
    alternates: { canonical: `/${locale}/about`, languages: { es: "/es/about", en: "/en/about" } },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const portrait = settings.portrait;
  const cv = settings.cv[locale] ?? settings.cv[locale === "es" ? "en" : "es"];
  const bio = t(settings.bio, locale);
  const services = settings.services.filter((s) => t(s.title, locale));
  const disciplines = settings.disciplines.map((d) => t(d, locale)).filter(Boolean);
  const location = t(settings.location, locale);
  const availability = t(settings.availability, locale);

  return (
    <>
      <div data-theme="light">
        <header className="page-head wrap">
          <span className="reg reg--tl" aria-hidden="true" />
          <span className="reg reg--tr" aria-hidden="true" />
          <p className="meta" data-reveal="fade" style={{ marginBottom: 20 }}>
            (Hidalgo — {dict.role})
          </p>
          <h1 className="display h1" data-reveal="lines">
            {dict.nav.about}
          </h1>
        </header>

        <section className="wrap" style={{ paddingBottom: "clamp(72px, 10vw, 160px)" }}>
          <div className={`grid about-grid ${portrait ? "" : "about-grid--solo"}`}>
            {portrait && (
              <div className="about-portrait">
                <Picture media={portrait} locale={locale} sizes="(min-width: 900px) 33vw, 100vw" reveal eager />
              </div>
            )}
            <div className="about-bio">
              {bio && <RichText text={bio} className="lead prose" />}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 48 }} data-reveal="fade">
                {cv ? (
                  <a
                    className="btn btn--solid"
                    href={cv}
                    download={`CV-Hidalgo-${locale.toUpperCase()}.pdf`}
                    data-magnetic
                  >
                    {dict.downloadCv} <span aria-hidden="true">↓</span>
                  </a>
                ) : (
                  <span className="btn" aria-disabled="true">
                    {dict.cvPending}
                  </span>
                )}
              </div>
              {(location || availability) && (
                <dl className="info-list meta" style={{ marginTop: 56 }}>
                  {location && (
                    <div>
                      <dt>{dict.location}</dt>
                      <dd>{location}</dd>
                    </div>
                  )}
                  {availability && (
                    <div>
                      <dt>{dict.availability}</dt>
                      <dd>{availability}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
        </section>
      </div>

      {services.length > 0 && (
        <section className="section wrap" data-theme="dark">
          <h2 className="display h2" data-reveal="lines" style={{ marginBottom: "clamp(32px, 5vw, 72px)" }}>
            {dict.services}
          </h2>
          <ol className="services">
            {services.map((s, i) => (
              <li key={i} className="service" data-reveal="rise">
                <span className="meta">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="service__title">{t(s.title, locale)}</h3>
                {t(s.description, locale) && <p className="service__desc">{t(s.description, locale)}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {disciplines.length > 0 && (
        <div data-theme="light">
          <Marquee items={disciplines} label={dict.disciplines} />
        </div>
      )}
    </>
  );
}
