"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, SquaresFour } from "@phosphor-icons/react";
import { categories, merchants, type BillingPlatform, type Category } from "@/lib/catalog";
import {
  currencyDigits,
  supportedCurrencies,
  toMinor,
  todayISO,
  validateWorkspace,
  type Interval,
  type Subscription,
} from "@/lib/subscriptions";

export function MerchantLogo({ providerId, size = "" }: { providerId: string; size?: string }) {
  const merchant = merchants.find((m) => m.id === providerId);
  return (
    <span
      data-provider={providerId}
      className={`merchant-logo ${size}`}
      style={{ "--merchant-color": merchant?.color ?? "#789a7c" } as React.CSSProperties}
    >
      {merchant ? (
        <img src={`/merchants/${merchant.logo}.svg`} alt="" width="24" height="24" />
      ) : (
        <SquaresFour size={24} weight="duotone" />
      )}
    </span>
  );
}
export default function SubscriptionForm({
  initial,
  defaultCurrency,
  onSave,
}: {
  initial?: Subscription;
  defaultCurrency: string;
  onSave: (sub: Subscription) => void;
}) {
  const [providerId, setProviderId] = useState(initial?.providerId ?? ""),
    [name, setName] = useState(initial?.name ?? ""),
    [category, setCategory] = useState<Category>(initial?.category ?? "Productivity"),
    [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency),
    [error, setError] = useState("");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const sub: Subscription = {
        id: initial?.id ?? crypto.randomUUID(),
        providerId: providerId || "custom",
        name: name.trim(),
        plan: String(data.get("plan") || "Individual").trim(),
        amountMinor: toMinor(String(data.get("amount")), currency),
        currency,
        interval: String(data.get("interval")) as Interval,
        nextCharge: String(data.get("date")),
        category,
        status: String(data.get("status")) as Subscription["status"],
        platform: String(data.get("platform")) as BillingPlatform,
        notes: String(data.get("notes") ?? ""),
        ...(initial?.cancellationNote ? { cancellationNote: initial.cancellationNote } : {}),
      };
      validateWorkspace({ version: 1, subscriptions: [sub], currency, budgetMinor: 0 });
      onSave(sub);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your subscription details.");
    }
  }
  return (
    <form className="subscription-form" onSubmit={save}>
      {!initial && (
        <>
          <p className="field-label">Pick a familiar face, or make it your own</p>
          <div className="provider-picker">
            {merchants.slice(0, 8).map((m) => (
              <button
                type="button"
                className={providerId === m.id ? "selected" : ""}
                key={m.id}
                onClick={() => {
                  setProviderId(m.id);
                  setName(m.name);
                  setCategory(m.category);
                }}
                aria-label={`Choose ${m.name}`}
                aria-pressed={providerId === m.id}
              >
                <MerchantLogo providerId={m.id} />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <label>
        Subscription name
        <input
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!merchants.some((m) => m.name === e.target.value)) setProviderId("custom");
          }}
          placeholder="e.g. Spotify"
          maxLength={100}
          required
          autoComplete="off"
        />
      </label>
      <label>
        Plan
        <input
          name="plan"
          defaultValue={initial?.plan ?? ""}
          placeholder="e.g. Premium Individual"
          maxLength={100}
        />
      </label>
      <div className="form-grid">
        <label>
          Amount
          <input
            name="amount"
            inputMode="decimal"
            key={`${currency}-${initial?.id}`}
            defaultValue={
              initial && initial.currency === currency
                ? (initial.amountMinor / 10 ** currencyDigits(currency)).toFixed(
                    currencyDigits(currency),
                  )
                : ""
            }
            placeholder={currencyDigits(currency) === 0 ? "1200" : "11.99"}
            required
          />
        </label>
        <label>
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {supportedCurrencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Billing cycle
          <select name="interval" defaultValue={initial?.interval ?? "monthly"}>
            <option value="monthly">Monthly</option>
            <option value="annual">Yearly</option>
            <option value="quarterly">Quarterly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>
          Next charge / trial end
          <input
            name="date"
            type="date"
            defaultValue={initial?.nextCharge ?? todayISO()}
            required
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={initial?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="trial">Free trial</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <label>
        Billed through
        <select name="platform" defaultValue={initial?.platform ?? "direct"}>
          <option value="direct">Provider directly</option>
          <option value="apple">Apple App Store</option>
          <option value="google">Google Play</option>
          <option value="stripe">Merchant via Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
      </label>
      <label>
        Notes <span className="muted">(optional)</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={initial?.notes}
          placeholder="Anything future-you should know"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button primary full">
        {initial ? "Save changes" : "Add subscription"}
        <ArrowRight size={18} />
      </button>
      <p className="small muted center">Stored only in your workspace on this device.</p>
    </form>
  );
}
