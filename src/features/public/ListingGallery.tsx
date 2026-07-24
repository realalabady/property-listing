"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Play, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

export interface GalleryMedia {
  url: string;
  type: "image" | "video";
  alt?: string;
}

interface ListingGalleryProps {
  media: GalleryMedia[];
  /** Used as the fallback alt text for images. */
  title: string;
  className?: string;
}

/**
 * Buyer-facing media gallery: an aspect-ratio hero (never a cropped fixed box),
 * a scroll-snapping thumbnail strip, RTL-aware prev/next arrows, an index
 * counter, and a full-screen lightbox that shows the whole photo (object-contain)
 * with keyboard navigation. Shared by the marketplace detail page.
 */
export function ListingGallery({ media, title, className }: ListingGalleryProps) {
  const total = media.length;
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Wrap around so arrows never dead-end. RTL reads right-to-left, so on the
  // hero the RIGHT arrow steps back and the LEFT arrow advances.
  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setActive((prev) => (prev + delta + total) % total);
    },
    [total],
  );

  // Keyboard navigation + scroll lock while the lightbox is open.
  useEffect(() => {
    if (!lightbox) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft") go(1); // RTL: left = next
      else if (e.key === "ArrowRight") go(-1); // RTL: right = previous
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, go]);

  // Keep the active thumbnail scrolled into view as the hero changes.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex h-72 w-full items-center justify-center bg-secondary text-sm text-muted-foreground",
          className,
        )}
      >
        {t("marketplace.noMedia")}
      </div>
    );
  }

  const selected = media[active] ?? media[0]!;
  const hasMultiple = total > 1;

  return (
    <div className={className}>
      {/* Hero — proportional, not a fixed cropped box */}
      <div className="group relative aspect-[4/3] w-full overflow-hidden bg-secondary sm:aspect-[16/10] lg:aspect-[16/8]">
        {selected.type === "video" ? (
          <video
            src={selected.url}
            className="h-full w-full object-cover"
            controls
            playsInline
          />
        ) : (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label="تكبير الصورة"
            className="relative block h-full w-full cursor-zoom-in"
          >
            <Image
              src={selected.url}
              alt={selected.alt || title}
              fill
              priority
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          </button>
        )}

        {/* Legibility scrim behind the on-image controls */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

        {/* Expand affordance (images only) */}
        {selected.type !== "video" && (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label="تكبير الصورة"
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          >
            <Expand className="h-4 w-4" aria-hidden />
          </button>
        )}

        {/* Index counter */}
        {hasMultiple && (
          <span className="absolute bottom-3 end-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur">
            {active + 1} / {total}
          </span>
        )}

        {/* RTL arrows: right steps back, left advances */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="الصورة السابقة"
              className="absolute end-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="الصورة التالية"
              className="absolute start-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip — one horizontal, snapping row, no cramped wrap */}
      {hasMultiple && (
        <div
          ref={stripRef}
          className="scrollbar-hidden flex snap-x gap-2.5 overflow-x-auto p-3 sm:p-4"
        >
          {media.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              data-idx={index}
              onClick={() => setActive(index)}
              aria-label={`عرض الوسائط ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative h-16 w-24 shrink-0 snap-start overflow-hidden rounded-lg border-2 bg-secondary transition sm:h-[4.5rem] sm:w-28",
                index === active
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {item.type === "video" ? (
                <>
                  <video src={item.url} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/25">
                    <Play className="h-4 w-4 fill-white text-white" aria-hidden />
                  </span>
                </>
              ) : (
                <Image
                  src={item.url}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="112px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Full-screen lightbox — shows the whole photo, no cropping */}
      {lightbox && (
        <div
          className="animate-fade-in fixed inset-0 z-[80] flex flex-col backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          role="dialog"
          aria-modal="true"
          aria-label="معرض الصور"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(false);
          }}
        >
          {/* Top bar: counter + close */}
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold tabular-nums ring-1 ring-white/30">
              {active + 1} / {total}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="إغلاق"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/20 ring-1 ring-white/30 transition hover:bg-white/30"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Stage */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            {selected.type === "video" ? (
              <video
                key={active}
                src={selected.url}
                className="animate-zoom-in max-h-full max-w-full rounded-lg"
                controls
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={active}
                src={selected.url}
                alt={selected.alt || title}
                className="animate-zoom-in max-h-full max-w-full rounded-lg object-contain"
              />
            )}

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="الصورة السابقة"
                  className="absolute end-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 transition hover:bg-white/30 sm:end-4"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="الصورة التالية"
                  className="absolute start-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 transition hover:bg-white/30 sm:start-4"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}
          </div>

          {/* Lightbox thumbnail rail */}
          {hasMultiple && (
            <div className="scrollbar-hidden flex justify-center gap-2 overflow-x-auto px-4 py-4">
              {media.map((item, index) => (
                <button
                  key={`lb-${item.url}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`عرض الوسائط ${index + 1}`}
                  className={cn(
                    "relative h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition",
                    index === active
                      ? "border-white"
                      : "border-transparent opacity-50 hover:opacity-90",
                  )}
                >
                  {item.type === "video" ? (
                    <>
                      <video src={item.url} className="h-full w-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center bg-black/25">
                        <Play className="h-3.5 w-3.5 fill-white text-white" aria-hidden />
                      </span>
                    </>
                  ) : (
                    <Image
                      src={item.url}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
