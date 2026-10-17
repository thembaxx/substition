import assert from "node:assert/strict";
import { test } from "node:test";
import { cancellationRoute, matchMerchant } from "../src/lib/catalog";
import {
  demoWorkspace,
  daysUntil,
  money,
  nextOccurrence,
  occurrences,
  toMinor,
  totals,
  validateWorkspace,
  type Subscription,
} from "../src/lib/subscriptions";
import { parseCSV, statementDrafts } from "../src/lib/import";
import { deriveKey, encryptWorkspace, unlockWorkspace, validateEnvelope } from "../src/lib/vault";
import { calendarICS, exportCSV } from "../src/lib/export";
const sub: Subscription = {
  id: "test",
  providerId: "spotify",
  name: "Spotify",
  plan: "Individual",
  amountMinor: 1199,
  currency: "USD",
  interval: "monthly",
  nextCharge: "2026-01-31",
  category: "Entertainment",
  status: "active",
  platform: "direct",
  notes: "",
};
test("minor units preserve decimal precision and currency exponents", () => {
  assert.equal(toMinor("11.99", "USD"), 1199);
  assert.equal(toMinor("100", "JPY"), 100);
  assert.equal(toMinor("1.234", "KWD"), 1234);
  assert.throws(() => toMinor("1.01", "JPY"));
  assert.throws(() => toMinor("1.234", "USD"));
  assert.throws(() => toMinor("-2", "USD"));
  assert.throws(() => toMinor("1e9", "USD"));
  assert.match(money(1234, "KWD"), /1\.234/);
});
test("month-end and leap-year recurrence preserves the billing anchor", () => {
  assert.deepEqual(occurrences(sub, "2026-01-01", "2026-04-30"), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
  ]);
  assert.deepEqual(
    occurrences(
      { ...sub, interval: "annual", nextCharge: "2024-02-29" },
      "2024-01-01",
      "2028-03-01",
    ),
    ["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"],
  );
  assert.equal(daysUntil("2026-11-02", "2026-10-31"), 2);
});
test("monthly totals exclude inactive entries and never mix currencies", () => {
  assert.deepEqual(
    totals([
      sub,
      { ...sub, id: "2", currency: "ZAR", amountMinor: 9900 },
      { ...sub, id: "3", status: "cancelled" },
      { ...sub, id: "4", status: "paused" },
      { ...sub, id: "5", amountMinor: 12000, interval: "annual" },
    ]),
    { USD: 2199, ZAR: 9900 },
  );
});
test("trial deadlines do not silently recur, and older anchors advance correctly", () => {
  const trial = { ...sub, status: "trial" as const, nextCharge: "2026-01-15" };
  assert.equal(nextOccurrence(trial, "2026-02-01"), "2026-01-15");
  assert.deepEqual(occurrences(trial, "2026-02-01", "2026-03-30"), []);
  assert.deepEqual(occurrences({ ...sub, nextCharge: "1900-01-31" }, "2026-01-01", "2026-02-28"), [
    "2026-01-31",
    "2026-02-28",
  ]);
});
test("statement sign convention excludes refunds and credits", () => {
  const csv =
    "Date,Description,Amount,Currency\n2026-01-01,SPOTIFY,-11.99,USD\n2026-01-02,SPOTIFY,11.99,USD\n2026-01-03,NETFLIX REFUND,-17.99,USD";
  const negative = statementDrafts(csv, "USD");
  assert.equal(negative.drafts.length, 1);
  assert.equal(negative.skipped, 2);
  assert.equal(negative.drafts[0].nextCharge, "2026-01-01");
  const positive = statementDrafts(csv, "USD", "positive");
  assert.equal(positive.drafts.length, 1);
  assert.equal(positive.skipped, 2);
  assert.equal(positive.drafts[0].nextCharge, "2026-01-02");
});
test("CSV quoted delimiters, escaped quotes and review-only discovery", () => {
  assert.deepEqual(
    parseCSV('Date,Description,Amount\r\n2026-01-01,"SPOTIFY, AB ""premium""",-11.99'),
    [
      ["Date", "Description", "Amount"],
      ["2026-01-01", 'SPOTIFY, AB "premium"', "-11.99"],
    ],
  );
  assert.throws(() => parseCSV('Date,"Description'));
  const result = statementDrafts(
    "Date,Description,Amount,Currency\n2026-01-15,SPOTIFY AB,-11.99,USD\n2026-02-15,SPOTIFY AB,-11.99,USD\n2026-02-20,NOTION,-12.00,USD\n2026-02-21,UNKNOWN,-6.00,USD",
    "USD",
  );
  assert.equal(result.drafts.length, 2);
  assert.equal(result.drafts[0].selected, true);
  assert.equal(result.drafts[0].amountMinor, 1199);
  assert.equal(result.drafts[1].selected, false);
  assert.equal(result.skipped, 1);
  assert.equal(matchMerchant("APPLE.COM/BILL"), undefined);
});
test("cancellation routes respect the actual billing platform", () => {
  assert.match(cancellationRoute("spotify", "apple").url!, /apps.apple.com/);
  assert.match(cancellationRoute("netflix", "google").url!, /play.google.com/);
  assert.match(cancellationRoute("notion", "stripe").note, /Only the merchant/);
  assert.equal(cancellationRoute("custom", "direct").url, undefined);
});
test("vault encrypts, rejects wrong passphrases and detects tampering", async () => {
  const w = demoWorkspace(),
    salt = crypto.getRandomValues(new Uint8Array(16)),
    key = await deriveKey("correct horse battery staple", salt),
    encrypted = await encryptWorkspace(w, key, salt);
  assert.ok(!JSON.stringify(encrypted).includes("Spotify"));
  const restored = await unlockWorkspace(encrypted, "correct horse battery staple");
  assert.deepEqual(restored.workspace, w);
  await assert.rejects(() => unlockWorkspace(encrypted, "wrong passphrase"));
  const bytes = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));
  bytes[0] ^= 1;
  const tampered = { ...encrypted, ciphertext: btoa(String.fromCharCode(...bytes)) };
  await assert.rejects(() => unlockWorkspace(tampered, "correct horse battery staple"));
  assert.throws(() => validateEnvelope({ ...encrypted, iterations: 1e9 }));
});
test("restored records reject invalid dates, duplicate IDs and unsafe money", () => {
  const w = { version: 1 as const, subscriptions: [sub], currency: "USD", budgetMinor: 12000 };
  assert.equal(validateWorkspace(w), w);
  assert.throws(() => validateWorkspace({ ...w, subscriptions: [sub, sub] }));
  assert.throws(() =>
    validateWorkspace({ ...w, subscriptions: [{ ...sub, nextCharge: "2026-02-31" }] }),
  );
  assert.throws(() => validateWorkspace({ ...w, subscriptions: [{ ...sub, amountMinor: NaN }] }));
});
test("exports guard spreadsheet formulas and calendar delimiters", () => {
  assert.match(exportCSV([{ ...sub, name: '=HYPERLINK("bad")' }]), /'=HYPERLINK/);
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const nextCharge = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const calendar = calendarICS([{ ...sub, name: "Service; one, two", nextCharge }]);
  assert.match(calendar, /BEGIN:VALARM/);
  assert.match(calendar, /Service\\; one\\, two/);
  assert.match(calendar, /TRIGGER:-P1D/);
});
