import { parseDate, supportedCurrencies, type Interval, type Subscription } from "./subscriptions";

export const MAX_RECEIPT_PRICES = 200;
export const MAX_RENEWAL_DECISIONS = 100;

export type ReceiptPrice = {
  id: string;
  subscriptionId: string;
  merchant: string;
  date: string;
  currency: string;
  interval: Interval;
  amountMinor: number;
  source: "receipt" | "statement" | "manual";
  /** A short invoice reference or filename, never the original statement. */
  provenance: string;
  reviewed: true;
  reviewedAt: number;
};

export type RenewalDecision = {
  id: string;
  subscriptionId: string;
  renewalDate: string;
  choice: "keep" | "pause" | "cancel";
  note: string;
  recordedAt: number;
};

export type RenewalHistory = {
  version: 1;
  receipts: ReceiptPrice[];
  decisions: RenewalDecision[];
};

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function text(value: unknown, name: string, max: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) {
    throw new Error(`Check the ${name}.`);
  }
  return value.trim();
}

function timestamp(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("The review timestamp is invalid.");
  }
  return value;
}

function date(value: unknown): string {
  const result = text(value, "receipt or renewal date", 10);
  parseDate(result);
  return result;
}

export function emptyRenewalHistory(): RenewalHistory {
  return { version: 1, receipts: [], decisions: [] };
}

export function validateReceiptPrice(value: unknown): ReceiptPrice {
  if (!object(value)) throw new Error("The receipt review is invalid.");
  if (
    typeof value.currency !== "string" ||
    !supportedCurrencies.includes(value.currency) ||
    typeof value.interval !== "string" ||
    !["monthly", "annual", "quarterly", "weekly"].includes(value.interval) ||
    typeof value.amountMinor !== "number" ||
    !Number.isSafeInteger(value.amountMinor) ||
    value.amountMinor <= 0 ||
    value.amountMinor > 1e14 ||
    typeof value.source !== "string" ||
    !["receipt", "statement", "manual"].includes(value.source) ||
    value.reviewed !== true
  ) {
    throw new Error("Check the reviewed amount, currency, billing cycle and source.");
  }
  // Reconstruct the supported shape so imported files cannot retain raw documents,
  // account credentials or any unrecognised metadata inside a review record.
  return {
    id: text(value.id, "receipt ID", 100),
    subscriptionId: text(value.subscriptionId, "subscription ID", 100),
    merchant: text(value.merchant, "merchant", 100),
    date: date(value.date),
    currency: value.currency,
    interval: value.interval as Interval,
    amountMinor: value.amountMinor,
    source: value.source as ReceiptPrice["source"],
    provenance: text(value.provenance, "receipt reference", 240),
    reviewed: true,
    reviewedAt: timestamp(value.reviewedAt),
  };
}

export function validateRenewalDecision(value: unknown): RenewalDecision {
  if (
    !object(value) ||
    typeof value.choice !== "string" ||
    !["keep", "pause", "cancel"].includes(value.choice)
  ) {
    throw new Error("Choose whether you intend to keep, pause or cancel this renewal.");
  }
  return {
    id: text(value.id, "decision ID", 100),
    subscriptionId: text(value.subscriptionId, "subscription ID", 100),
    renewalDate: date(value.renewalDate),
    choice: value.choice as RenewalDecision["choice"],
    note: text(value.note, "decision note", 500, true),
    recordedAt: timestamp(value.recordedAt),
  };
}

/** Missing history in older workspaces is valid; present but corrupt history is not. */
export function restoreRenewalHistory(
  value: unknown,
  subscriptions?: readonly Subscription[],
): RenewalHistory {
  if (value === undefined) return emptyRenewalHistory();
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.receipts) ||
    !Array.isArray(value.decisions) ||
    value.receipts.length > MAX_RECEIPT_PRICES ||
    value.decisions.length > MAX_RENEWAL_DECISIONS
  ) {
    throw new Error("The renewal history format is invalid or unsupported.");
  }
  const receipts = value.receipts.map(validateReceiptPrice);
  const decisions = value.decisions.map(validateRenewalDecision);
  const ids = new Set(subscriptions?.map((subscription) => subscription.id));
  for (const entries of [receipts, decisions]) {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.id) || (subscriptions && !ids.has(entry.subscriptionId))) {
        throw new Error("Renewal history contains a duplicate or unknown subscription record.");
      }
      seen.add(entry.id);
    }
  }
  return { version: 1, receipts, decisions };
}

/** These records are user-reviewed observations, not verified merchant prices. */
export function addReviewedReceipt(history: RenewalHistory, receipt: ReceiptPrice): RenewalHistory {
  const current = restoreRenewalHistory(history);
  const next = validateReceiptPrice(receipt);
  return {
    ...current,
    receipts: [...current.receipts.filter((item) => item.id !== next.id), next]
      .sort((a, b) => b.reviewedAt - a.reviewedAt || a.id.localeCompare(b.id))
      .slice(0, MAX_RECEIPT_PRICES),
  };
}

/** Recording an intention never changes merchant or tracked subscription status. */
export function addRenewalDecision(
  history: RenewalHistory,
  decision: RenewalDecision,
): RenewalHistory {
  const current = restoreRenewalHistory(history);
  const next = validateRenewalDecision(decision);
  return {
    ...current,
    decisions: [...current.decisions.filter((item) => item.id !== next.id), next]
      .sort((a, b) => b.recordedAt - a.recordedAt || a.id.localeCompare(b.id))
      .slice(0, MAX_RENEWAL_DECISIONS),
  };
}

export function compareReceiptPrices(previous: ReceiptPrice, next: ReceiptPrice) {
  const a = validateReceiptPrice(previous);
  const b = validateReceiptPrice(next);
  const merchantKey = (merchant: string) => merchant.trim().replace(/\s+/g, " ").toLowerCase();
  if (
    a.subscriptionId !== b.subscriptionId ||
    merchantKey(a.merchant) !== merchantKey(b.merchant) ||
    a.currency !== b.currency ||
    a.interval !== b.interval ||
    a.date >= b.date
  ) {
    return null;
  }
  return {
    deltaMinor: b.amountMinor - a.amountMinor,
    percentage: ((b.amountMinor - a.amountMinor) / a.amountMinor) * 100,
  };
}

export function applyReviewedPrice(
  subscription: Subscription,
  receipt: ReceiptPrice,
): Subscription {
  const reviewed = validateReceiptPrice(receipt);
  if (subscription.id !== reviewed.subscriptionId) {
    throw new Error("This receipt belongs to another subscription.");
  }
  return {
    ...subscription,
    amountMinor: reviewed.amountMinor,
    currency: reviewed.currency,
    interval: reviewed.interval,
  };
}
