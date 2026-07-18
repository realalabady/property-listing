"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SARPrice } from "@/components/ui/SARPrice";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";
import { rentPeriodSuffix } from "./filters";
import type { PublicListingUnit } from "@/types/listing";

interface UnitsDialogProps {
  units: PublicListingUnit[];
  open: boolean;
  onClose: () => void;
}

function specLine(unit: PublicListingUnit): string {
  const parts: string[] = [];
  if (unit.area) parts.push(`${unit.area} م²`);
  if (unit.bedrooms != null) parts.push(t("units.bedroomsCount", { n: unit.bedrooms }));
  if (unit.bathrooms != null)
    parts.push(t("units.bathroomsCount", { n: unit.bathrooms }));
  if (unit.livingRooms != null && unit.livingRooms > 0)
    parts.push(t("marketplace.living", { n: unit.livingRooms }));
  if (unit.majlis != null && unit.majlis > 0)
    parts.push(t("units.majlisCount", { n: unit.majlis }));
  if (unit.kitchens != null && unit.kitchens > 0)
    parts.push(t("units.kitchensCount", { n: unit.kitchens }));
  if (unit.floor != null)
    parts.push(
      unit.floor === 0
        ? t("units.groundFloor")
        : t("units.floorNumber", { n: unit.floor }),
    );
  if (unit.furnished) parts.push(t("marketplace.furnished"));
  return parts.join(" • ");
}

/**
 * Public popup listing every AVAILABLE unit in a building with its specs and
 * photos. Reads only the sanitized `publicUnits` array already denormalized
 * onto the listing — the internal units subcollection (and any tenant data)
 * is never touched.
 */
export function UnitsDialog({ units, open, onClose }: UnitsDialogProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Close on Escape and lock background scroll while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, lightbox]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("units.dialogTitle")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("units.dialogTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("marketplace.unitsAvailable", { n: units.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {units.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("units.noneAvailable")}
          </p>
        ) : (
          <div className="space-y-3">
            {units.map((unit) => {
              const specs = specLine(unit);
              return (
                <div
                  key={unit.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {unit.label || t("units.unitFallback")}
                      </p>
                      {specs && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {specs}
                        </p>
                      )}
                    </div>
                    <p className="whitespace-nowrap font-semibold text-foreground">
                      <SARPrice amount={unit.price} />
                      {unit.type === "rent" && (
                        <span className="ms-1 text-xs font-normal text-muted-foreground">
                          {rentPeriodSuffix("rent", unit.rentPeriod ?? null)}
                        </span>
                      )}
                    </p>
                  </div>

                  {unit.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {unit.description}
                    </p>
                  )}

                  {unit.images && unit.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {unit.images.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setLightbox(url)}
                          className="overflow-hidden rounded-lg border border-border transition hover:opacity-90"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={unit.label}
                            loading="lazy"
                            className="h-20 w-28 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-size photo view */}
      {lightbox && (
        <div
          className={cn(
            "fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
