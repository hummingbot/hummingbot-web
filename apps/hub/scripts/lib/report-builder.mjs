/**
 * JS port of Condor's `condor/reports.py` ReportBuilder, used to render
 * authentic example reports for routines in the Hub. The HTML template,
 * CSS, and section semantics are copied verbatim from the Python source so
 * the example output is byte-for-byte representative of what a real routine
 * emits in the Condor dashboard.
 *
 * Charts: real routines embed Plotly via `fig.to_html(...)`. Here we accept a
 * Plotly `{ data, layout }` spec and render an equivalent div + newPlot call.
 */

const HTML_TEMPLATE = (title, createdAt, metaBadges, sectionsHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --text: #e6edf3; --text-muted: #8b949e;
    --green: #3fb950; --red: #f85149; --blue: #58a6ff;
  }
  :root.light {
    --bg: #ffffff; --surface: #f6f8fa; --border: #d0d7de;
    --text: #1f2328; --text-muted: #656d76;
    --green: #1a7f37; --red: #cf222e; --blue: #0969da;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px; line-height: 1.6; padding: 24px; max-width: 1400px; margin: 0 auto;
  }
  .report-header {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px;
  }
  .report-header h1 { font-size: 20px; }
  .report-header .meta { color: var(--text-muted); font-size: 12px; }
  .report-header .meta span { margin-left: 16px; }
  .kpi-bar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
  .kpi-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px 20px; min-width: 150px; flex: 1;
  }
  .kpi-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
  .kpi-card .value { font-size: 24px; font-weight: 700; margin: 4px 0; }
  .kpi-card .delta { font-size: 12px; }
  .kpi-card .delta.up { color: var(--green); }
  .kpi-card .delta.down { color: var(--red); }
  .section { margin-bottom: 32px; }
  .section-md { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
  .section-md h1, .section-md h2, .section-md h3 { color: var(--text); margin: 12px 0 6px; }
  .section-md h1 { font-size: 18px; } .section-md h2 { font-size: 16px; } .section-md h3 { font-size: 14px; }
  .section-md p { margin: 6px 0; }
  .section-md pre { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 13px; }
  .section-md code { background: var(--bg); padding: 2px 6px; border-radius: 3px; font-size: 13px; }
  .section-md pre code { background: none; padding: 0; }
  .section-md ul, .section-md ol { padding-left: 20px; }
  .section-md a { color: var(--blue); }
  .section-table { overflow-x: auto; }
  .section-table table {
    width: 100%; border-collapse: collapse; font-size: 13px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
  }
  .section-table th {
    background: var(--bg); text-align: left; padding: 8px 12px;
    font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--text-muted); border-bottom: 1px solid var(--border);
  }
  .section-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
  .section-table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  .section-table tr:last-child td { border-bottom: none; }
  .plotly-chart { min-height: 400px; margin-bottom: 24px; width: 100%; overflow: hidden; }
  .plotly-chart .js-plotly-plot, .plotly-chart .plot-container, .plotly-chart .plotly { width: 100% !important; }
</style>
</head>
<body>
<div class="report-header">
  <h1>${title}</h1>
  <div class="meta">
    <span>${createdAt}</span>
    ${metaBadges}
  </div>
</div>
${sectionsHtml}
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'set-theme') {
    document.documentElement.classList.toggle('light', e.data.theme === 'light');
  }
});
</script>
</body>
</html>
`;

const SECTION_PRIORITY = { kpi: 0, plotly: 1, table: 2, markdown: 3 };

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Minimal markdown: #/##/### headings, **bold**, and paragraphs. */
function mdToHtml(text) {
  return text
    .split("\n\n")
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (b.startsWith("### ")) return `<h3>${inline(esc(b.slice(4)))}</h3>`;
      if (b.startsWith("## ")) return `<h2>${inline(esc(b.slice(3)))}</h2>`;
      if (b.startsWith("# ")) return `<h1>${inline(esc(b.slice(2)))}</h1>`;
      // multi-line heading + body (e.g. "### Mature Markets\nHigh volume...")
      const lines = b.split("\n");
      if (lines[0].startsWith("### ")) {
        const rest = lines.slice(1).join(" ");
        return `<h3>${inline(esc(lines[0].slice(4)))}</h3><p>${inline(esc(rest))}</p>`;
      }
      return `<p>${inline(esc(b))}</p>`;
    })
    .join("\n");
}

export class ReportBuilder {
  constructor(title = "Report") {
    this._title = title;
    this._sourceType = "";
    this._sourceName = "";
    this._tags = [];
    this._sections = [];
    this._manualOrder = false;
    this._plotCounter = 0;
  }
  source(t, n) { this._sourceType = t; this._sourceName = n; return this; }
  tags(t) { this._tags = t; return this; }
  manualOrder() { this._manualOrder = true; return this; }
  kpi(label, value, { delta = null, trend = "neutral" } = {}) {
    this._sections.push({ type: "kpi", label, value, delta, trend });
    return this;
  }
  markdown(text) { this._sections.push({ type: "markdown", content: text }); return this; }
  table(rows, columns = null) {
    if (!columns && rows.length) columns = Object.keys(rows[0]);
    this._sections.push({ type: "table", columns: columns || [], rows });
    return this;
  }
  /** spec: { data: [...traces], layout: {...} } — Plotly figure spec. */
  plotly(spec) {
    const id = `chart_${++this._plotCounter}`;
    // Guard on window.Plotly so a blocked/slow CDN degrades to an empty chart
    // slot instead of throwing an uncaught ReferenceError in the iframe.
    const html =
      `<div id="${id}" class="js-plotly-plot"></div>` +
      `<script>if(window.Plotly){Plotly.newPlot(${JSON.stringify(id)}, ${JSON.stringify(spec.data)}, ` +
      `Object.assign({autosize:true}, ${JSON.stringify(spec.layout || {})}), ` +
      `{responsive:true, displayModeBar:false});}</script>`;
    this._sections.push({ type: "plotly", content: html });
    return this;
  }

  _renderSections() {
    let sections = [...this._sections];
    if (!this._manualOrder) {
      sections = sections
        .map((s, i) => [s, i])
        .sort((a, b) =>
          (SECTION_PRIORITY[a[0].type] ?? 99) - (SECTION_PRIORITY[b[0].type] ?? 99) || a[1] - b[1],
        )
        .map(([s]) => s);
    }
    const parts = [];
    let i = 0;
    while (i < sections.length) {
      const sec = sections[i];
      if (sec.type === "kpi") {
        const cards = [];
        while (i < sections.length && sections[i].type === "kpi") {
          const k = sections[i];
          let deltaHtml = "";
          if (k.delta) {
            const cls = k.trend === "up" || k.trend === "down" ? ` ${k.trend}` : "";
            deltaHtml = `<div class="delta${cls}">${esc(k.delta)}</div>`;
          }
          cards.push(
            `<div class="kpi-card"><div class="label">${esc(k.label)}</div>` +
            `<div class="value">${esc(k.value)}</div>${deltaHtml}</div>`,
          );
          i++;
        }
        parts.push(`<div class="kpi-bar">${cards.join("")}</div>`);
      } else if (sec.type === "markdown") {
        parts.push(`<div class="section section-md">${mdToHtml(sec.content)}</div>`);
        i++;
      } else if (sec.type === "plotly") {
        parts.push(`<div class="section plotly-chart">${sec.content}</div>`);
        i++;
      } else if (sec.type === "table") {
        parts.push(this._renderTable(sec.columns, sec.rows));
        i++;
      } else {
        i++;
      }
    }
    return parts.join("\n");
  }

  _renderTable(columns, rows) {
    const header = columns.map((c) => `<th>${esc(c)}</th>`).join("");
    const body = rows
      .map(
        (row) =>
          `<tr>${columns.map((c) => `<td>${esc(row[c] ?? "")}</td>`).join("")}</tr>`,
      )
      .join("\n");
    return `<div class="section section-table"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  render(createdAt = "2026-05-28 14:32 UTC") {
    let metaBadges = "";
    if (this._sourceType) metaBadges += `<span>${esc(this._sourceType)}: ${esc(this._sourceName)}</span>`;
    for (const tag of this._tags) metaBadges += `<span>#${esc(tag)}</span>`;
    return HTML_TEMPLATE(esc(this._title), createdAt, metaBadges, this._renderSections());
  }
}
