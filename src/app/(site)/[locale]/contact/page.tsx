import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { getSettings } from "@/lib/content";
import { isLocale, t } from "@/lib/types";
import { Clock } from "@/components/site/Clock";
import { CopyEmail } from "@/components/site/CopyEmail";
import { KineticWord } from "@/components/site/KineticWord";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: getDictionary(locale).nav.contact,
    alternates: { canonical: `/${locale}/contact`, languages: { es: "/es/contact", en: "/en/contact" } },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const settings = await getSettings();
  const location = t(settings.location, locale);
  const availability = t(settings.availability, locale);

  return (
    <div data-theme="light">
      <header className="page-head wrap">
        <span className="reg reg--tl" aria-hidden="true" />
        <span className="reg reg--tr" aria-hidden="true" />
        <p className="meta" data-reveal="fade" style={{ marginBottom: 20 }}>
          ({availability || dict.writeMe})
        </p>
        <KineticWord text={dict.letsTalk.toUpperCase()} intro />
      </header>

      <section className="wrap" style={{ paddingBottom: "clamp(80px, 12vw, 200px)" }}>
        {settings.email ? (
          <div data-reveal="rise">
            <CopyEmail email={settings.email} labels={{ copy: dict.copy, copied: dict.copied }} />
          </div>
        ) : (
          <p className="meta muted">{locale === "es" ? "Email pendiente." : "Email coming soon."}</p>
        )}

        <hr className="rule" data-reveal="rule" style={{ marginBlock: "clamp(48px, 7vw, 100px) 28px" }} />

        <div className="footer__cols meta" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          <div>
            <p className="muted" style={{ marginBottom: 8 }}>
              {dict.elsewhere}
            </p>
            <ul className="links-list">
              {settings.links.map((l) => (
                <li key={l.url}>
                  <a className="u-link" href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.label} ↗
                  </a>
                </li>
              ))}
              {settings.phone && (
                <li>
                  <a className="u-link" href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>
                    {settings.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            {location && (
              <>
                <p className="muted" style={{ marginBottom: 8 }}>
                  {dict.location}
                </p>
                <p>{location}</p>
              </>
            )}
          </div>
          <div>
            <p className="muted" style={{ marginBottom: 8 }}>
              {dict.localTime}
            </p>
            <Clock timezone={settings.timezone} locale={locale} />
          </div>
        </div>
      </section>
    </div>
  );
}
