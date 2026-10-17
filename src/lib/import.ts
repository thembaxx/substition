import { matchMerchant } from "./catalog";
import { parseDate, supportedCurrencies, toMinor, type Subscription } from "./subscriptions";

export type ImportDraft = Subscription & { confidence: number; reason: string; selected: boolean };
export function parseCSV(text: string): string[][] {
  if (text.length > 5e6) throw new Error("Choose a file smaller than 5 MB.");
  const delimiter =
    (text.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) >
    (text.split(/\r?\n/)[0].match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length > 20000) throw new Error("Import up to 20,000 statement rows at a time.");
  return rows;
}
export function statementDrafts(
  text: string,
  defaultCurrency: string,
  chargeSign: "negative" | "positive" = "negative",
): { drafts: ImportDraft[]; skipped: number } {
  const rows = parseCSV(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map((v) => v.toLowerCase().replace(/[^a-z]/g, "")) ?? [];
  const column = (names: string[]) => headers.findIndex((v) => names.includes(v));
  const dateCol = column(["date", "transactiondate", "posteddate"]),
    nameCol = column(["description", "merchant", "name", "payee"]),
    amountCol = column(["amount", "debit", "amountpaid"]),
    currencyCol = column(["currency", "currencycode"]);
  if ([dateCol, nameCol, amountCol].includes(-1))
    throw new Error(
      "Use a CSV with Date, Description, Amount and optional Currency columns. Dates must use YYYY-MM-DD; amounts use a decimal point.",
    );
  const groups = new Map<
    string,
    {
      dates: string[];
      amountMinor: number;
      currency: string;
      merchant: NonNullable<ReturnType<typeof matchMerchant>>;
    }
  >();
  let skipped = 0;
  for (const row of rows) {
    const merchant = matchMerchant(row[nameCol] ?? "");
    if (!merchant) {
      skipped++;
      continue;
    }
    try {
      const rawAmount = row[amountCol] ?? "";
      const positiveCharges =
        chargeSign === "positive" ||
        headers[amountCol] === "debit" ||
        headers[amountCol] === "amountpaid";
      if (
        /refund|reversal|credit\b/i.test(row[nameCol] ?? "") ||
        (positiveCharges ? rawAmount.startsWith("-") : !rawAmount.startsWith("-"))
      ) {
        skipped++;
        continue;
      }
      const currency = row[currencyCol]?.toUpperCase() || defaultCurrency;
      if (!supportedCurrencies.includes(currency)) throw new Error("Unsupported currency");
      const amount = rawAmount.replace(/^[-+]/, "");
      const amountMinor = toMinor(amount, currency),
        date = row[dateCol];
      parseDate(date);
      const key = `${merchant.id}-${currency}-${amountMinor}`;
      const group = groups.get(key) ?? { dates: [], amountMinor, currency, merchant };
      group.dates.push(date);
      groups.set(key, group);
    } catch {
      skipped++;
    }
  }
  const drafts = [...groups.values()].map(
    ({ dates: rawDates, amountMinor, currency, merchant }): ImportDraft => {
      const dates = [...new Set(rawDates)].sort();
      const gap =
        dates.length > 1 ? (Date.parse(dates.at(-1)!) - Date.parse(dates.at(-2)!)) / 86400000 : 0;
      const interval =
        gap >= 350 && gap <= 380
          ? "annual"
          : gap >= 80 && gap <= 100
            ? "quarterly"
            : gap >= 5 && gap <= 9
              ? "weekly"
              : "monthly";
      const recurring =
        (gap >= 25 && gap <= 35) ||
        (gap >= 5 && gap <= 9) ||
        (gap >= 80 && gap <= 100) ||
        (gap >= 350 && gap <= 380);
      return {
        id: crypto.randomUUID(),
        providerId: merchant.id,
        name: merchant.name,
        plan: "Imported · review details",
        amountMinor,
        currency,
        interval,
        nextCharge: dates.at(-1)!,
        category: merchant.category,
        status: "active",
        platform: "direct",
        notes: "Imported locally. Billing platform and interval require confirmation.",
        confidence: recurring ? 92 : 65,
        reason: recurring
          ? `${dates.length} matching charges; ${Math.round(gap)} days between the last two.`
          : "Known provider; recurrence is unconfirmed. Check the billing cycle.",
        selected: recurring,
      };
    },
  );
  return { drafts, skipped };
}
export async function extractPDF(file: File) {
  const pdf = await import("pdfjs-dist");
  pdf.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const document = await pdf.getDocument({
    data: await file.arrayBuffer(),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;
  if (document.numPages > 50) {
    await document.destroy();
    throw new Error("Choose a statement with no more than 50 pages.");
  }
  try {
    const lines: string[] = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i),
        content = await page.getTextContent();
      let line = "";
      for (const item of content.items)
        if ("str" in item) {
          line += `${item.str} `;
          if (item.hasEOL) {
            lines.push(line);
            line = "";
          }
        }
      if (line) lines.push(line);
    }
    return lines.join("\n");
  } finally {
    await document.destroy();
  }
}
export function pdfDrafts(text: string, currency: string) {
  // ponytail: text-based PDFs only; scanned statements need local OCR in a later release.
  const rows = ["Date,Description,Amount,Currency"];
  for (const line of text.split("\n")) {
    const date = line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    const merchant = matchMerchant(line);
    const amount = [...line.matchAll(/(?:^|\s)[-+]?([0-9]+\.[0-9]{2})(?=\s|$)/g)].at(-1)?.[1];
    if (date && merchant && amount) rows.push(`${date},${merchant.name},${amount},${currency}`);
  }
  if (rows.length === 1)
    throw new Error(
      "No supported charges found. This release reads text PDFs with ISO dates and decimal amounts. Export a CSV or add subscriptions manually.",
    );
  const result = statementDrafts(rows.join("\n"), currency, "positive");
  return {
    ...result,
    drafts: result.drafts.map((d) => ({
      ...d,
      selected: false,
      confidence: 45,
      reason:
        "PDF candidate. Confirm the amount is a charge, not a balance or refund, and check the billing cycle.",
    })),
  };
}
