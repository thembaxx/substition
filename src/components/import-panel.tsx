"use client";
import { useState, type ChangeEvent } from "react";
import { ArrowRight, Check, FileCsv, FilePdf, LockKey, UploadSimple } from "@phosphor-icons/react";
import { extractPDF, pdfDrafts, statementDrafts, type ImportDraft } from "@/lib/import";
import { money, nextOccurrence, type Interval, type Subscription } from "@/lib/subscriptions";
import { MerchantLogo } from "./subscription-form";
export default function ImportPanel({
  currency,
  existing,
  onImport,
}: {
  currency: string;
  existing: Subscription[];
  onImport: (subs: Subscription[]) => void;
}) {
  const [drafts, setDrafts] = useState<ImportDraft[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [skipped, setSkipped] = useState(0),
    [loaded, setLoaded] = useState(false),
    [chargeSign, setChargeSign] = useState<"negative" | "positive">("negative");
  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setDrafts([]);
    setLoaded(false);
    try {
      if (file.size > 5e6) throw new Error("Choose a statement smaller than 5 MB.");
      const result = file.name.toLowerCase().endsWith(".pdf")
        ? pdfDrafts(await extractPDF(file), currency)
        : statementDrafts(await file.text(), currency, chargeSign);
      setDrafts(
        result.drafts.map((d) => ({
          ...d,
          selected:
            d.selected &&
            !existing.some(
              (s) =>
                s.providerId === d.providerId &&
                s.amountMinor === d.amountMinor &&
                s.currency === d.currency,
            ),
        })),
      );
      setSkipped(result.skipped);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This file could not be read.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  return (
    <div className="import-panel">
      <div className="privacy-note">
        <LockKey size={20} weight="duotone" />
        <span>
          Your statement never leaves this device.
          <small>Files are read in memory. Only reviewed subscriptions are saved.</small>
        </span>
      </div>
      <label className="import-convention">
        How are charges shown in your CSV?
        <select
          value={chargeSign}
          disabled={busy}
          onChange={(e) => {
            setChargeSign(e.target.value as "negative" | "positive");
            setDrafts([]);
            setLoaded(false);
          }}
        >
          <option value="negative">Negative amounts (e.g. -11.99)</option>
          <option value="positive">Positive amounts (e.g. 11.99)</option>
        </select>
        <small>Other signs are treated as credits. A Debit column uses positive amounts.</small>
      </label>
      <label className={`upload-area ${busy ? "busy" : ""}`}>
        <UploadSimple size={32} weight="light" />
        <strong>
          {busy ? "Finding the recurring bits…" : "Drop the paperwork. Find the patterns."}
        </strong>
        <span>Choose a CSV or text-based PDF · up to 5 MB</span>
        <input
          className="sr-only"
          type="file"
          accept=".csv,.pdf,text/csv,application/pdf"
          onChange={(e) => void read(e)}
          disabled={busy}
        />
        <span className="button secondary">
          Choose a statement
          <ArrowRight size={16} />
        </span>
      </label>
      <div className="import-formats">
        <span>
          <FileCsv size={20} /> CSV: Date, Description, Amount, Currency
        </span>
        <span>
          <FilePdf size={20} /> PDF: text, ISO dates, decimal amounts
        </span>
      </div>
      <p className="small muted">
        Bank formats vary. Use YYYY-MM-DD dates and a decimal point in amounts. We group known
        providers and ask you to confirm. Scanned PDFs need a CSV export.
      </p>
      <a className="text-button" href="/sample-statement.csv" download>
        Download a sample CSV
        <ArrowRight size={15} />
      </a>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loaded && (
        <div className="import-results">
          <h3>{drafts.length} possible subscriptions</h3>
          <p className="small muted">
            {skipped} rows skipped (credits, unknown provider or unsupported fields). Review billing
            cycle and next charge before saving. Possible duplicates start unchecked.
          </p>
          {drafts.map((draft, index) => (
            <div className="import-draft" key={draft.id}>
              <label className="draft-select">
                <input
                  type="checkbox"
                  checked={draft.selected}
                  onChange={(e) =>
                    setDrafts((ds) =>
                      ds.map((d, i) => (i === index ? { ...d, selected: e.target.checked } : d)),
                    )
                  }
                />
                <MerchantLogo providerId={draft.providerId} />
                <span>
                  <strong>{draft.name}</strong>
                  <small>
                    {money(draft.amountMinor, draft.currency)} · {draft.confidence}% confidence
                  </small>
                </span>
              </label>
              <p>{draft.reason}</p>
              <div className="form-grid">
                <label>
                  Cycle
                  <select
                    value={draft.interval}
                    onChange={(e) =>
                      setDrafts((ds) =>
                        ds.map((d, i) =>
                          i === index ? { ...d, interval: e.target.value as Interval } : d,
                        ),
                      )
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                <label>
                  Next charge
                  <input
                    type="date"
                    value={nextOccurrence(draft)}
                    onChange={(e) => {
                      if (e.target.value)
                        setDrafts((ds) =>
                          ds.map((d, i) =>
                            i === index ? { ...d, nextCharge: e.target.value } : d,
                          ),
                        );
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            className="button primary full"
            disabled={!drafts.some((d) => d.selected)}
            onClick={() =>
              onImport(
                drafts
                  .filter((d) => d.selected)
                  .map(
                    ({
                      confidence: _confidence,
                      reason: _reason,
                      selected: _selected,
                      ...sub
                    }) => ({ ...sub, nextCharge: nextOccurrence(sub) }),
                  ),
              )
            }
          >
            <Check size={18} /> Save {drafts.filter((d) => d.selected).length} reviewed
            subscriptions
          </button>
        </div>
      )}
    </div>
  );
}
