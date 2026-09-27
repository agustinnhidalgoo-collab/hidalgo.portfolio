import type { Dictionary } from "@/lib/i18n";
import { type Locale, type SiteSettings, t } from "@/lib/types";
import { BackToTop } from "./BackToTop";
import { Clock } from "./Clock";
import { CopyEmail } from "./CopyEmail";
import { KineticWord } from "./KineticWord";
import { TLink } from "./Transition";
import { HideOnPath } from "./HideOnPath";

export function Footer({ locale, dict, settings }: { locale: Locale; dict: Dictionary; settings: SiteSettings }) {
  const location = t(settings.location, locale);
  const availability = t(settings.availability, locale);
  return (
    <footer className="footer" data-theme="dark">
      <div className="wrap">
        <HideOnPath suffix="/contact">
        <div className="grid footer__cta">
          <div style={{ gridColumn: "1 / -1" }}>
            <p className="meta muted" data-reveal="fade" style={{ marginBottom: 20 }}>
              {availability || dict.writeMe}
            </p>
            <h2 className="display h1" data-reveal="lines">
              {dict.letsTalk}
            </h2>
          </div>
          {settings.email && (
            <div style={{ gridColumn: "1 / -1" }} data-reveal="rise">
              <CopyEmail email={settings.email} labels={{ copy: dict.copy, copied: dict.copied }} />
            </div>
          )}
        </div>
        </HideOnPath>

        <div className="footer__cols meta">
          <nav aria-label={dict.menu}>
            <ul className="links-list">
              <li>
                <TLink className="u-link" href={`/${locale}`} transitionLabel="Hidalgo">
                  {dict.nav.home}
                </TLink>
              </li>
              <li>
                <TLink className="u-link" href={`/${locale}/work`} transitionLabel={dict.nav.work}>
                  {dict.nav.work}
                </TLink>
              </li>
              <li>
                <TLink className="u-link" href={`/${locale}/about`} transitionLabel={dict.nav.about}>
                  {dict.nav.about}
                </TLink>
              </li>
              <li>
                <TLink className="u-link" href={`/${locale}/contact`} transitionLabel={dict.nav.contact}>
                  {dict.nav.contact}
                </TLink>
              </li>
            </ul>
          </nav>
          <div>
            {settings.links.length > 0 && (
              <>
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
                </ul>
              </>
            )}
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
            <div style={{ marginTop: 20 }}>
              <BackToTop label={dict.backToTop} />
            </div>
          </div>
        </div>
      </div>

      <div className="wrap footer__giant">
        <KineticWord text="HIDALGO" as="p" />
      </div>
      <div className="wrap meta muted" style={{ display: "flex", justifyContent: "space-between", paddingBlock: 18 }}>
        <span>© {new Date().getFullYear()} Hidalgo</span>
        <span>{dict.role}</span>
      </div>
    </footer>
  );
}
