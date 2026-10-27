import type { BillingPlatform, Category } from "./catalog";
import { emptyRenewalHistory, restoreRenewalHistory, type RenewalHistory } from "./renewal-review";

export type Interval = "monthly" | "annual" | "quarterly" | "weekly";
export type Subscription = {
  id: string;
  providerId: string;
  name: string;
  plan: string;
  amountMinor: number;
  currency: string;
  interval: Interval;
  nextCharge: string;
  category: Category;
  status: "active" | "trial" | "paused" | "cancelled";
  platform: BillingPlatform;
  notes: string;
  cancellationNote?: string;
};
export type Workspace = {
  version: 1;
  subscriptions: Subscription[];
  budgetMinor: number;
  currency: string;
  renewalHistory: RenewalHistory;
};
export const supportedCurrencies = [
  ...new Set([
    "USD",
    "EUR",
    "GBP",
    "ZAR",
    "INR",
    "JPY",
    "CAD",
    "AUD",
    "BRL",
    "NGN",
    "KES",
    "CHF",
    "KRW",
    "KWD",
    ...Intl.supportedValuesOf("currency"),
  ]),
];
export const todayISO = () => localISO(new Date());
export function localISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    localISO(date) !== value
  )
    throw new Error("Use a valid date in YYYY-MM-DD format.");
  return date;
}
export function currencyDigits(currency: string) {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}
export function toMinor(value: string, currency: string) {
  const digits = currencyDigits(currency);
  if (
    !new RegExp(`^\\d{1,9}(?:\\.\\d{1,${Math.max(1, digits)}})?$`).test(value) ||
    (digits === 0 && value.includes("."))
  )
    throw new Error(`Enter a positive amount with up to ${digits} decimal places.`);
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0"));
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("Amount must be greater than zero.");
  return amount;
}
export function money(amountMinor: number, currency = "USD", compact = false) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 0 : currencyDigits(currency),
  }).format(amountMinor / 10 ** currencyDigits(currency));
}
export function monthlyMinor(sub: Subscription) {
  return (
    sub.amountMinor *
    { monthly: 1, annual: 1 / 12, quarterly: 1 / 3, weekly: 52 / 12 }[sub.interval]
  );
}
export function isLive(sub: Subscription) {
  return sub.status === "active" || sub.status === "trial";
}
export function totals(subs: Subscription[]) {
  const result: Record<string, number> = {};
  for (const sub of subs.filter(isLive))
    result[sub.currency] = (result[sub.currency] ?? 0) + monthlyMinor(sub);
  return result;
}
export function daysUntil(date: string, now = todayISO()) {
  return Math.round(
    (Date.UTC(
      ...(date.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0)) as [number, number, number]),
    ) -
      Date.UTC(
        ...(now.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0)) as [
          number,
          number,
          number,
        ]),
      )) /
      86400000,
  );
}
export function occurrences(sub: Subscription, from: string, to: string) {
  const anchor = parseDate(sub.nextCharge);
  const end = parseDate(to);
  if (sub.status === "trial")
    return sub.nextCharge >= from && sub.nextCharge <= to ? [sub.nextCharge] : [];
  const start = parseDate(from);
  const monthsBetween =
    (start.getFullYear() - anchor.getFullYear()) * 12 + start.getMonth() - anchor.getMonth();
  const first = Math.max(
    0,
    sub.interval === "weekly"
      ? Math.floor((start.getTime() - anchor.getTime()) / (7 * 86400000)) - 1
      : Math.floor(monthsBetween / { monthly: 1, quarterly: 3, annual: 12 }[sub.interval]) - 1,
  );
  const dates: string[] = [];
  // Anchor each month independently so January 31 does not drift to March 28.
  for (let index = first; index < first + 1200; index++) {
    let date: Date;
    if (sub.interval === "weekly") {
      date = new Date(anchor);
      date.setDate(anchor.getDate() + index * 7);
    } else {
      const months = index * { monthly: 1, quarterly: 3, annual: 12 }[sub.interval];
      date = new Date(anchor.getFullYear(), anchor.getMonth() + months + 1, 0, 12);
      date.setDate(Math.min(anchor.getDate(), date.getDate()));
    }
    if (date > end) break;
    const iso = localISO(date);
    if (iso >= from) dates.push(iso);
  }
  return dates;
}
export function nextOccurrence(sub: Subscription, from = todayISO()) {
  if (sub.status === "trial" || !isLive(sub)) return sub.nextCharge;
  if (sub.nextCharge >= from) return sub.nextCharge;
  const end = parseDate(from);
  end.setFullYear(end.getFullYear() + 2);
  return occurrences(sub, from, localISO(end))[0] ?? sub.nextCharge;
}
export function upcoming(subs: Subscription[], from = todayISO(), days = 30) {
  const end = parseDate(from);
  end.setDate(end.getDate() + days);
  return subs
    .filter(isLive)
    .flatMap((sub) => occurrences(sub, from, localISO(end)).map((date) => ({ sub, date })))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function demoWorkspace(): Workspace {
  const nextDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localISO(date);
  };
  const rows: [
    string,
    string,
    string,
    number,
    Interval,
    number,
    Category,
    Subscription["status"],
    BillingPlatform,
  ][] = [
    [
      "spotify",
      "Spotify",
      "Premium Individual",
      1199,
      "monthly",
      2,
      "Entertainment",
      "active",
      "direct",
    ],
    ["netflix", "Netflix", "Standard", 1799, "monthly", 4, "Entertainment", "active", "direct"],
    ["notion", "Notion", "Plus", 1200, "monthly", 6, "Productivity", "active", "direct"],
    ["icloud", "iCloud+", "200 GB", 299, "monthly", 8, "Cloud & storage", "active", "apple"],
    ["figma", "Figma", "Professional", 2000, "monthly", 12, "Productivity", "active", "direct"],
    [
      "youtube",
      "YouTube Premium",
      "Individual",
      1399,
      "monthly",
      3,
      "Entertainment",
      "trial",
      "google",
    ],
    ["adobe", "Adobe", "Photography", 1999, "monthly", 19, "Productivity", "active", "direct"],
    [
      "headspace",
      "Headspace",
      "Annual membership",
      6999,
      "annual",
      28,
      "Lifestyle",
      "active",
      "apple",
    ],
  ];
  return {
    version: 1,
    renewalHistory: emptyRenewalHistory(),
    currency: "USD",
    budgetMinor: 12000,
    subscriptions: rows.map(
      ([providerId, name, plan, amountMinor, interval, days, category, status, platform]) => ({
        id: `demo-${providerId}`,
        providerId,
        name,
        plan,
        amountMinor,
        currency: "USD",
        interval,
        nextCharge: nextDate(days),
        category,
        status,
        platform,
        notes: "",
      }),
    ),
  };
}
export function validateWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== "object") throw new Error("Invalid workspace.");
  const w = value as Workspace;
  if (
    w.version !== 1 ||
    !Array.isArray(w.subscriptions) ||
    w.subscriptions.length > 2000 ||
    !supportedCurrencies.includes(w.currency) ||
    !Number.isSafeInteger(w.budgetMinor) ||
    w.budgetMinor < 0
  )
    throw new Error("Unsupported workspace format.");
  const ids = new Set<string>();
  for (const sub of w.subscriptions) {
    if (
      !sub ||
      typeof sub.id !== "string" ||
      ids.has(sub.id) ||
      typeof sub.name !== "string" ||
      !sub.name.trim() ||
      sub.name.length > 100 ||
      typeof sub.providerId !== "string" ||
      sub.providerId.length > 100 ||
      typeof sub.plan !== "string" ||
      sub.plan.length > 100 ||
      typeof sub.notes !== "string" ||
      sub.notes.length > 2000 ||
      (sub.cancellationNote != null &&
        (typeof sub.cancellationNote !== "string" || sub.cancellationNote.length > 1000)) ||
      !Number.isSafeInteger(sub.amountMinor) ||
      sub.amountMinor <= 0 ||
      sub.amountMinor > 1e14 ||
      !supportedCurrencies.includes(sub.currency) ||
      !["monthly", "annual", "quarterly", "weekly"].includes(sub.interval) ||
      !["active", "trial", "paused", "cancelled"].includes(sub.status) ||
      !["direct", "apple", "google", "paypal", "stripe"].includes(sub.platform) ||
      !["Entertainment", "Productivity", "Cloud & storage", "Lifestyle"].includes(sub.category)
    )
      throw new Error("A subscription contains invalid data.");
    ids.add(sub.id);
    parseDate(sub.nextCharge);
  }
  w.renewalHistory = restoreRenewalHistory(w.renewalHistory);
  return w;
}
