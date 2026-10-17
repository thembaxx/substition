import { currencyDigits, money, upcoming, type Subscription } from "./subscriptions";
export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const csvField = (value: string) =>
  `"${(/^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
export function exportCSV(subscriptions: Subscription[]) {
  const rows = [
    [
      "Name",
      "Plan",
      "Amount",
      "Currency",
      "Cycle",
      "Next charge",
      "Status",
      "Category",
      "Billing platform",
    ],
    ...subscriptions.map((s) => [
      s.name,
      s.plan,
      (s.amountMinor / 10 ** currencyDigits(s.currency)).toString(),
      s.currency,
      s.interval,
      s.nextCharge,
      s.status,
      s.category,
      s.platform,
    ]),
  ];
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}
const icsText = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n?|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
export function calendarICS(subscriptions: Subscription[]) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Substition//Local renewal reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const { sub, date } of upcoming(subscriptions, undefined, 365))
    lines.push(
      "BEGIN:VEVENT",
      `UID:${sub.id.replace(/[^a-zA-Z0-9-]/g, "")}-${date}@substition.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
      `SUMMARY:${icsText(`${sub.name} · ${money(sub.amountMinor, sub.currency)}`)}`,
      `DESCRIPTION:${icsText("Review this renewal in Substition. This calendar copy does not update automatically.")}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Review ${sub.name} before renewal`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  const encoder = new TextEncoder();
  return (
    lines
      .map((line) => {
        let folded = "",
          length = 0;
        for (const character of line) {
          const size = encoder.encode(character).length;
          if (length + size > 75) {
            folded += "\r\n ";
            length = 1;
          }
          folded += character;
          length += size;
        }
        return folded;
      })
      .join("\r\n") + "\r\n"
  );
}
