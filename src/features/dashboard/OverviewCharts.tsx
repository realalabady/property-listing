"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  GitBranch,
  Globe,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Radio,
  Share2,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { leadSourceLabelAr } from "@/constants/listing-categories";
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

// Wazi brand palette. `ink` is a strong slate for numbers/labels so data reads
// with real contrast on the light card surface (the old #666 washed out).
const WAZI = {
  purple: "#662d91",
  blue: "#0071bc",
  green: "#00a99d",
  ink: "#1f2937",
  axis: "#64748b",
  grid: "#e6e3ee",
  track: "#eef0f5",
};
// Funnel stages flow purple → blue → teal so the pipeline reads at a glance.
const FUNNEL_COLORS = ["#662d91", "#5b45b0", "#0071bc", "#00a99d"];
// Ranked lead sources need distinguishable-yet-cohesive hues. This sequence
// stays in the brand's cool-to-warm arc so bars separate clearly without
// turning into a rainbow.
const SOURCE_COLORS = [
  "#662d91",
  "#0071bc",
  "#00a99d",
  "#e0891f",
  "#d1477f",
  "#5b8def",
  "#12a594",
  "#8b5cf6",
];
// Channel icon per lead-source key so each row is instantly recognizable even
// with a single source. Unknown keys fall back to the generic radio glyph.
const SOURCE_ICONS: Record<string, LucideIcon> = {
  website_form: Globe,
  whatsapp: MessageCircle,
  phone: Phone,
  walk_in: Users,
  social_media: Share2,
  referral: UserPlus,
  marketplace: Store,
  other: MoreHorizontal,
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
        <div className="mb-1.5 font-semibold text-slate-800">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: p.color }}
            />
            {p.name && <span className="text-muted-foreground">{p.name}</span>}
            <span className="font-bold text-slate-800">
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
  icon: Icon,
  accent,
  index,
  reduce,
  action,
  className,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: string;
  index: number;
  reduce: boolean;
  action?: ReactNode;
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
      <Card className="h-full overflow-hidden transition-shadow duration-300 hover:shadow-md">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `${accent}1a`, color: accent }}
              aria-hidden
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            {title}
          </CardTitle>
          {action}
        </CardHeader>
        <CardContent className="pt-1">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <span className="h-10 w-10 rounded-full bg-muted" aria-hidden />
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
    <div
      className="h-8 w-full overflow-hidden rounded-lg"
      style={{ background: WAZI.track }}
    >
      {/* Mount-animated width: `animate` always resolves to the final width, so
          the fill can never get stuck invisible (the bug with whileInView). */}
      <motion.div
        className="h-full rounded-lg shadow-sm"
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
    .map((s) => ({
      key: s.key,
      label: leadSourceLabelAr(s.key),
      value: s.value,
    }))
    .sort((a, b) => b.value - a.value);
  const sourceMax = sourceData.reduce((m, s) => Math.max(m, s.value), 0);
  const sourceTotal = sourceData.reduce((sum, s) => sum + s.value, 0);

  const animate = mounted && !reduce;

  // Latest-period values power the legend chips on the trend card.
  const last = trend[trend.length - 1];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Leads pipeline — stage bars (robust for RTL + sparse data) */}
      <ChartCard
        title={t("dashPages.chartsFunnelTitle")}
        icon={GitBranch}
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
              const color =
                FUNNEL_COLORS[i % FUNNEL_COLORS.length] ?? WAZI.purple;
              return (
                <div key={d.stage}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: color }}
                        aria-hidden
                      />
                      {d.label}
                    </span>
                    <span className="text-muted-foreground">
                      <span className="text-sm font-bold text-slate-800">
                        {formatNumber(d.value)}
                      </span>{" "}
                      · {Math.round(pct)}%
                    </span>
                  </div>
                  <Bar
                    pct={pct}
                    background={`linear-gradient(90deg, ${color}, ${color}cc)`}
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
        icon={Radio}
        accent={WAZI.blue}
        index={1}
        reduce={reduce}
        action={
          sourceTotal > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("dashPages.chartsSourcesTotal", {
                n: formatNumber(sourceTotal),
              })}
            </span>
          ) : undefined
        }
      >
        {!mounted ? (
          <Skeleton />
        ) : sourceData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex min-h-[240px] flex-col justify-center gap-4 py-2">
            {sourceData.map((s, i) => {
              const color = SOURCE_COLORS[i % SOURCE_COLORS.length]!;
              const Icon = SOURCE_ICONS[s.key] ?? Radio;
              const share =
                sourceTotal > 0 ? Math.round((s.value / sourceTotal) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${color}1a`, color }}
                    aria-hidden
                  >
                    <Icon className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-slate-700">
                        {s.label}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        <span className="text-sm font-bold tabular-nums text-slate-800">
                          {formatNumber(s.value)}
                        </span>{" "}
                        · {share}%
                      </span>
                    </div>
                    <Bar
                      pct={sourceMax > 0 ? (s.value / sourceMax) * 100 : 0}
                      background={`linear-gradient(90deg, ${color}, ${color}cc)`}
                      delay={animate ? i * 0.08 : 0}
                      reduce={reduce}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* Monthly trend — gradient area chart (full width) */}
      <ChartCard
        title={t("dashPages.chartsTrendTitle")}
        icon={TrendingUp}
        accent={WAZI.green}
        index={2}
        reduce={reduce}
        className="lg:col-span-2"
        action={
          mounted && trend.length > 0 && last ? (
            <div className="flex items-center gap-4 text-xs">
              <LegendChip
                color={WAZI.blue}
                label="العملاء"
                value={formatNumber(last.leads)}
              />
              <LegendChip
                color={WAZI.green}
                label="التحويلات"
                value={formatNumber(last.conversions)}
              />
            </div>
          ) : undefined
        }
      >
        {!mounted ? (
          <Skeleton />
        ) : trend.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={trend}
              margin={{ top: 10, right: 16, bottom: 0, left: -12 }}
            >
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={WAZI.blue} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={WAZI.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={WAZI.green} stopOpacity={0.35} />
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
                dy={4}
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
                cursor={{ stroke: WAZI.axis, strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                name="العملاء"
                stroke={WAZI.blue}
                strokeWidth={2.75}
                fill="url(#leadsGrad)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                isAnimationActive={animate}
              />
              <Area
                type="monotone"
                dataKey="conversions"
                name="التحويلات"
                stroke={WAZI.green}
                strokeWidth={2.75}
                fill="url(#convGrad)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                isAnimationActive={animate}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

/** Legend pill showing a series color, its name, and the latest value. */
function LegendChip({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums text-slate-800">{value}</span>
    </span>
  );
}
