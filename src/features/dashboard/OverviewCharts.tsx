"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import { t } from "@/lib/i18n";

interface FunnelDatum {
  stage: string;
  label: string;
  value: number;
}
interface SourceDatum {
  key: string;
  value: number;
}
interface TrendDatum {
  period: string;
  label: string;
  leads: number;
  conversions: number;
}

interface OverviewChartsProps {
  funnel: FunnelDatum[];
  sources: SourceDatum[];
  trend: TrendDatum[];
}

// Wazi brand palette.
const WAZI = {
  purple: "#662d91",
  blue: "#0071bc",
  green: "#00a99d",
  axis: "#8b8b93",
  grid: "#eceaf1",
};
// Funnel stages flow purple → blue → teal so the pipeline reads at a glance.
const FUNNEL_COLORS = ["#662d91", "#5740a6", "#0071bc", "#00a99d"];

const SOURCE_LABELS: Record<string, string> = {
  phone: "اتصال هاتفي",
  whatsapp: "واتساب",
  website_form: "نموذج الموقع",
  walk_in: "زيارة المكتب",
  social_media: "وسائل التواصل",
  referral: "ترشيح",
  marketplace: "السوق",
  landing_request: "طلب وارد",
  other: "أخرى",
};

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

/** Brand-styled tooltip for the trend chart. */
function BrandTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && (
        <div className="mb-1.5 font-semibold text-foreground">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: p.color }}
            />
            {p.name && <span className="text-muted-foreground">{p.name}</span>}
            <span className="font-bold text-foreground">
              {formatNumber(Number(p.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  accent,
  index,
  reduce,
  className,
  children,
}: {
  title: string;
  accent: string;
  index: number;
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
    >
      <Card className="h-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className="h-4 w-1.5 rounded-full"
              style={{ background: accent }}
              aria-hidden
            />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      {t("dashPages.chartsEmpty")}
    </div>
  );
}

function Skeleton() {
  return <div className="h-[240px] w-full animate-pulse rounded-lg bg-muted" />;
}

/**
 * One animated horizontal bar. Pure CSS/flex so it's RTL-native, never
 * collapses with sparse data, and looks clean from 1 row to many. The fill
 * grows via a GPU-friendly width transition (or instantly if reduced-motion).
 */
function Bar({
  pct,
  background,
  delay,
  reduce,
}: {
  pct: number;
  background: string;
  delay: number;
  reduce: boolean;
}) {
  // Give non-zero values a visible minimum so a "1" isn't an invisible sliver.
  const width = pct > 0 ? Math.max(pct, 6) : 0;
  return (
    <div className="h-7 w-full overflow-hidden rounded-lg bg-muted/50">
      {/* Mount-animated width: `animate` always resolves to the final width, so
          the fill can never get stuck invisible (the bug with whileInView). */}
      <motion.div
        className="h-full rounded-lg"
        style={{ background }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.7, delay, ease: "easeOut" }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function OverviewCharts({ funnel, sources, trend }: OverviewChartsProps) {
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion() ?? false;
  useEffect(() => setMounted(true), []);

  const funnelTop = funnel[0]?.value ?? 0;
  const funnelHasData = funnel.some((d) => d.value > 0);

  const sourceData = sources
    .map((s) => ({ label: SOURCE_LABELS[s.key] ?? s.key, value: s.value }))
    .sort((a, b) => b.value - a.value);
  const sourceMax = sourceData.reduce((m, s) => Math.max(m, s.value), 0);

  const animate = mounted && !reduce;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Leads pipeline — stage bars (robust for RTL + sparse data) */}
      <ChartCard
        title={t("dashPages.chartsFunnelTitle")}
        accent={WAZI.purple}
        index={0}
        reduce={reduce}
      >
        {!mounted ? (
          <Skeleton />
        ) : !funnelHasData ? (
          <EmptyState />
        ) : (
          <div className="flex min-h-[240px] flex-col justify-center gap-4 py-2">
            {funnel.map((d, i) => {
              const pct = funnelTop > 0 ? (d.value / funnelTop) * 100 : 0;
              const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length] ?? WAZI.purple;
              return (
                <div key={d.stage}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {d.label}
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {formatNumber(d.value)}
                      </span>{" "}
                      · {Math.round(pct)}%
                    </span>
                  </div>
                  <Bar
                    pct={pct}
                    background={color}
                    delay={animate ? i * 0.1 : 0}
                    reduce={reduce}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* Lead sources — ranked horizontal bars */}
      <ChartCard
        title={t("dashPages.chartsSourcesTitle")}
        accent={WAZI.blue}
        index={1}
        reduce={reduce}
      >
        {!mounted ? (
          <Skeleton />
        ) : sourceData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex min-h-[240px] flex-col justify-center gap-3.5 py-2">
            {sourceData.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                  {s.label}
                </span>
                <div className="flex-1">
                  <Bar
                    pct={sourceMax > 0 ? (s.value / sourceMax) * 100 : 0}
                    background={`linear-gradient(90deg, ${WAZI.purple}, ${WAZI.blue})`}
                    delay={animate ? i * 0.08 : 0}
                    reduce={reduce}
                  />
                </div>
                <span className="w-7 shrink-0 text-end text-sm font-bold text-foreground">
                  {formatNumber(s.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Monthly trend — gradient area chart (full width) */}
      <ChartCard
        title={t("dashPages.chartsTrendTitle")}
        accent={WAZI.green}
        index={2}
        reduce={reduce}
        className="lg:col-span-2"
      >
        {!mounted ? (
          <Skeleton />
        ) : trend.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 16, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={WAZI.blue} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={WAZI.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={WAZI.green} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={WAZI.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={WAZI.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: WAZI.axis }}
                  axisLine={{ stroke: WAZI.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: WAZI.axis }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip
                  content={<BrandTooltip />}
                  cursor={{ stroke: WAZI.grid, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="العملاء"
                  stroke={WAZI.blue}
                  strokeWidth={2.5}
                  fill="url(#leadsGrad)"
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={animate}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  name="التحويلات"
                  stroke={WAZI.green}
                  strokeWidth={2.5}
                  fill="url(#convGrad)"
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={animate}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: WAZI.blue }}
                />
                العملاء
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: WAZI.green }}
                />
                التحويلات
              </span>
            </div>
          </>
        )}
      </ChartCard>
    </div>
  );
}
