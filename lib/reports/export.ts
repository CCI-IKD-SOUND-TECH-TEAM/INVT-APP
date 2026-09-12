import { todayIso } from "@/lib/checks";

export type Column = { key: string; label: string; kind?: "status" | "num" | "severity" };
export type Row = Record<string, string>;
export type ReportResult = { columns: Column[]; rows: Row[] };

/**
 * CSV/print export, shared by the Reports page and the Activity page — both
 * render a filtered {columns, rows} result and need identical Excel/PDF output.
 */

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function toCsv({ columns, rows }: ReportResult) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key] ?? "")).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(name: string, result: ReportResult) {
  const blob = new Blob([toCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(name)}-${todayIso()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Print via a hidden iframe → the browser's "Save as PDF" destination.
export function printReport(name: string, { columns, rows }: ReportResult) {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const thead = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const tbody = rows
    .map(
      (r) =>
        `<tr>${columns
          .map(
            (c) =>
              `<td class="${c.kind === "num" ? "num" : ""}">${esc(r[c.key] ?? "")}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  const generated = new Date().toLocaleString("en-GB");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title>
    <style>
      *{font-family:Arial,Helvetica,sans-serif;color:#111}
      body{margin:28px}
      h1{font-size:20px;margin:0 0 2px}
      .meta{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f3f3f3}
      td.num{text-align:right;font-variant-numeric:tabular-nums}
      tr:nth-child(even) td{background:#fafafa}
    </style></head><body>
    <h1>${esc(name)} Report</h1>
    <div class="meta">CCI Ikorodu Inventory · ${rows.length} row${rows.length === 1 ? "" : "s"} · Generated ${esc(generated)}</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  window.setTimeout(() => document.body.removeChild(iframe), 1000);
}
