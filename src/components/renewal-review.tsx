"use client";

import { useId, useState, type FormEvent } from "react";
import {
  currencyDigits,
  money,
  supportedCurrencies,
  todayISO,
  toMinor,
  type Subscription,
} from "@/lib/subscriptions";
import {
  addRenewalDecision,
  addReviewedReceipt,
  applyReviewedPrice,
  compareReceiptPrices,
  validateReceiptPrice,
  validateRenewalDecision,
  type ReceiptPrice,
  type RenewalDecision,
  type RenewalHistory,
} from "@/lib/renewal-review";

export type RenewalReviewProps = {
  subscription: Subscription;
  history: RenewalHistory;
  onChange: (history: RenewalHistory, updatedSubscription?: Subscription) => void;
};

export default function RenewalReview(props: RenewalReviewProps) {
  return <SubscriptionRenewalReview key={props.subscription.id} {...props} />;
}

function SubscriptionRenewalReview({ subscription, history, onChange }: RenewalReviewProps) {
  const headingId = useId();
  const [currency, setCurrency] = useState(subscription.currency);
  const [receipt, setReceipt] = useState<ReceiptPrice | null>(null);
  const [decision, setDecision] = useState<RenewalDecision | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptPrice | null>(null);
  const [decisionDraft, setDecisionDraft] = useState<RenewalDecision | null>(null);
  const [applyPrice, setApplyPrice] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const receipts = history.receipts
    .filter((entry) => entry.subscriptionId === subscription.id)
    .toSorted((a, b) => b.date.localeCompare(a.date) || b.reviewedAt - a.reviewedAt);
  const decisions = history.decisions
    .filter((entry) => entry.subscriptionId === subscription.id)
    .toSorted((a, b) => b.recordedAt - a.recordedAt);
  const comparison = receipts.length > 1 ? compareReceiptPrices(receipts[1], receipts[0]) : null;

  function reviewReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    const data = new FormData(event.currentTarget);
    try {
      setReceipt(
        validateReceiptPrice({
          id: crypto.randomUUID(),
          subscriptionId: subscription.id,
          merchant: data.get("merchant"),
          date: data.get("date"),
          currency,
          interval: data.get("interval"),
          amountMinor: toMinor(String(data.get("amount")), currency),
          source: data.get("source"),
          provenance: data.get("provenance"),
          reviewed: true,
          reviewedAt: Date.now(),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the receipt details.");
    }
  }

  function confirmReceipt() {
    if (!receipt) return;
    try {
      onChange(
        addReviewedReceipt(history, { ...receipt, reviewedAt: Date.now() }),
        applyPrice ? applyReviewedPrice(subscription, receipt) : undefined,
      );
      setReceipt(null);
      setReceiptDraft(null);
      setApplyPrice(false);
      setStatus(
        applyPrice
          ? "Reviewed receipt saved and tracked price updated."
          : "Reviewed receipt saved. The tracked price is unchanged.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be saved.");
    }
  }

  function reviewDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    const data = new FormData(event.currentTarget);
    try {
      setDecision(
        validateRenewalDecision({
          id: crypto.randomUUID(),
          subscriptionId: subscription.id,
          renewalDate: subscription.nextCharge,
          choice: data.get("choice"),
          note: data.get("note"),
          recordedAt: Date.now(),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check your renewal decision.");
    }
  }

  function confirmDecision() {
    if (!decision) return;
    try {
      onChange(addRenewalDecision(history, { ...decision, recordedAt: Date.now() }));
      setDecision(null);
      setDecisionDraft(null);
      setStatus(
        "Your intention was saved. Contact the billing provider to make any pause or cancellation.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The decision could not be saved.");
    }
  }

  return (
    <section className="subscription-form" aria-labelledby={headingId}>
      <h3 id={headingId}>Review the next renewal</h3>
      <p className="small muted">
        {subscription.name} · {money(subscription.amountMinor, subscription.currency)} /{" "}
        {subscription.interval} · next tracked charge {subscription.nextCharge}
      </p>
      <p className="small muted">
        Keep a reviewed price reference and decide what to do next. Original receipts and statements
        are not saved here. Prices are your observations, not live merchant quotes.
      </p>
      {comparison ? (
        <p>
          Latest comparable price:{" "}
          {comparison.deltaMinor === 0
            ? "unchanged"
            : `${comparison.deltaMinor > 0 ? "+" : "−"}${money(Math.abs(comparison.deltaMinor), receipts[0].currency)} (${comparison.percentage > 0 ? "+" : ""}${comparison.percentage.toFixed(1)}%)`}{" "}
          since {receipts[1].date}.
        </p>
      ) : (
        <p className="small muted">
          A price change appears after two dated reviews for the same merchant, currency and billing
          cycle. Different currencies or cycles are not compared.
        </p>
      )}

      {!receipt ? (
        <form className="subscription-form" onSubmit={reviewReceipt}>
          <h4>Add a price reference</h4>
          <label>
            Merchant
            <input
              name="merchant"
              defaultValue={receiptDraft?.merchant ?? subscription.name}
              maxLength={100}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Receipt date
              <input
                type="date"
                name="date"
                defaultValue={receiptDraft?.date ?? todayISO()}
                required
              />
            </label>
            <label>
              Source
              <select name="source" defaultValue={receiptDraft?.source ?? "receipt"}>
                <option value="receipt">Receipt or invoice</option>
                <option value="statement">Statement reviewed by you</option>
                <option value="manual">Manual price observation</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              Amount
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={
                  receiptDraft
                    ? (
                        receiptDraft.amountMinor /
                        10 ** currencyDigits(receiptDraft.currency)
                      ).toFixed(currencyDigits(receiptDraft.currency))
                    : ""
                }
                placeholder={(
                  subscription.amountMinor /
                  10 ** currencyDigits(subscription.currency)
                ).toFixed(currencyDigits(subscription.currency))}
                required
              />
            </label>
            <label>
              Currency
              <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {supportedCurrencies.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Billing cycle
            <select name="interval" defaultValue={receiptDraft?.interval ?? subscription.interval}>
              <option value="monthly">Monthly</option>
              <option value="annual">Yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label>
            Short source reference
            <input
              name="provenance"
              defaultValue={receiptDraft?.provenance ?? ""}
              placeholder="e.g. Invoice 1042 or receipt filename"
              maxLength={240}
              required
            />
            <small className="muted">
              Do not paste account numbers, passwords or the full statement.
            </small>
          </label>
          <button className="button secondary" type="submit">
            Review price reference
          </button>
        </form>
      ) : (
        <div className="import-draft">
          <h4>Confirm this reviewed reference</h4>
          <p>
            {receipt.merchant} · {receipt.date} · {money(receipt.amountMinor, receipt.currency)} /{" "}
            {receipt.interval}
          </p>
          <p className="small muted">
            {receipt.source}: {receipt.provenance}
          </p>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={applyPrice}
              onChange={(event) => setApplyPrice(event.target.checked)}
            />
            Also update the amount, currency and billing cycle in my tracker
          </label>
          <p className="small muted">
            Saving this reference does not change your merchant account or next-charge date.
          </p>
          <button type="button" className="button primary" onClick={confirmReceipt}>
            Confirm reviewed reference
          </button>{" "}
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setReceiptDraft(receipt);
              setReceipt(null);
              setApplyPrice(false);
            }}
          >
            Edit reference
          </button>
        </div>
      )}

      <details>
        <summary>Reviewed price history ({receipts.length})</summary>
        {receipts.length ? (
          <ul>
            {receipts.map((entry) => (
              <li key={entry.id}>
                {entry.date}: {money(entry.amountMinor, entry.currency)} / {entry.interval} ·{" "}
                {entry.merchant} · {entry.provenance}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">No reviewed price references yet.</p>
        )}
      </details>

      {!decision ? (
        <form className="subscription-form" onSubmit={reviewDecision}>
          <h4>My decision for {subscription.nextCharge}</h4>
          <label>
            I intend to
            <select name="choice" defaultValue={decisionDraft?.choice ?? "keep"}>
              <option value="keep">Keep this subscription</option>
              <option value="pause">Ask the provider to pause</option>
              <option value="cancel">Cancel through the billing provider</option>
            </select>
          </label>
          <label>
            Private note
            <textarea
              name="note"
              defaultValue={decisionDraft?.note ?? ""}
              rows={2}
              maxLength={500}
              placeholder="Why this choice, and what should happen next?"
            />
          </label>
          <button type="submit" className="button secondary">
            Review my decision
          </button>
        </form>
      ) : (
        <div className="import-draft">
          <h4>Confirm your intention: {decision.choice}</h4>
          <p>Renewal under review: {decision.renewalDate}</p>
          {decision.note && <p>{decision.note}</p>}
          <p className="small muted">
            This saves a personal intention. It does not pause or cancel a merchant contract, and it
            does not change your tracked status.
          </p>
          <button type="button" className="button primary" onClick={confirmDecision}>
            Confirm my intention
          </button>{" "}
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setDecisionDraft(decision);
              setDecision(null);
            }}
          >
            Edit decision
          </button>
        </div>
      )}
      <details>
        <summary>Decision history ({decisions.length})</summary>
        {decisions.length ? (
          <ul>
            {decisions.map((entry) => (
              <li key={entry.id}>
                {entry.renewalDate}: intention to {entry.choice}
                {entry.note ? ` · ${entry.note}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">No renewal intentions saved yet.</p>
        )}
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="small" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
