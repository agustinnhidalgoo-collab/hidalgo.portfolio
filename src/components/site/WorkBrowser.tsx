"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { DuoPicture } from "./Picture";
import { ProjectIndex, type IndexItem } from "./ProjectIndex";
import { TLink } from "./Transition";
import { Flip, gsap, ScrollTrigger, prefersReducedMotion } from "./motion";

export interface WorkItem extends IndexItem {
  categoryIds: string[];
}

interface Props {
  items: WorkItem[];
  categories: { id: string; name: string }[];
  locale: Locale;
  labels: { all: string; list: string; grid: string; view: string; empty: string; example: string; filter: string };
}

export function WorkBrowser({ items, categories, locale, labels }: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  const visible = filter ? items.filter((i) => i.categoryIds.includes(filter)) : items;
  const usedCategories = categories
    .map((c) => ({ ...c, count: items.filter((i) => i.categoryIds.includes(c.id)).length }))
    .filter((c) => c.count > 0);

  const changeFilter = (next: string | null) => {
    if (gridRef.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(gridRef.current.querySelectorAll(".card"));
    }
    setFilter(next);
  };

  useLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !gridRef.current) return;
    Flip.from(state, {
      duration: 0.9,
      ease: "expo.inOut",
      absolute: true,
      stagger: 0.03,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.8, delay: 0.25 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }, [filter]);

  useLayoutEffect(() => {
    ScrollTrigger.refresh();
  }, [view]);

  return (
    <>
      <div className="filters">
        <div className="chips" role="group" aria-label={labels.filter}>
          <button type="button" className="chip" aria-pressed={filter === null} onClick={() => changeFilter(null)}>
            {labels.all} <sup>{items.length}</sup>
          </button>
          {usedCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={filter === c.id}
              onClick={() => changeFilter(filter === c.id ? null : c.id)}
            >
              {c.name} <sup>{c.count}</sup>
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label={labels.grid}>
          <button type="button" className="chip" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
            {labels.grid}
          </button>
          <button type="button" className="chip" aria-pressed={view === "list"} onClick={() => setView("list")}>
            {labels.list}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length}
      </p>

      {visible.length === 0 ? (
        <p className="empty meta muted">{labels.empty}</p>
      ) : view === "list" ? (
        <ProjectIndex items={visible} locale={locale} viewLabel={labels.view} exampleLabel={labels.example} />
      ) : (
        <div ref={gridRef} className="work-grid">
          {visible.map((item) => (
            <article key={item.id} className="card" data-flip-id={item.id}>
              <TLink href={item.href} transitionLabel={item.title} data-cursor="view" data-cursor-label={labels.view}>
                <div className="card__media">
                  <DuoPicture
                    media={item.cover}
                    locale={locale}
                    sizes="(min-width: 760px) 50vw, 100vw"
                    fill
                    alt=""
                  />
                </div>
                <div className="card__body">
                  <span className="meta">{String(items.indexOf(item) + 1).padStart(2, "0")}</span>
                  <h2 className="card__title">{item.title}</h2>
                  <span className="meta">{item.year}</span>
                  <span className="card__cats meta muted">
                    {item.categories.join(" / ")} {item.isExample && <span className="tag-example">{labels.example}</span>}
                  </span>
                </div>
              </TLink>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
