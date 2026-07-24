// Builds a self-contained, print-ready HTML document for a single submission.
// Pure string building — no React, no data access. The caller resolves signed
// attachment URLs and passes everything in, so this stays deterministic.

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif", "svg", "avif"];

export function isImageName(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const yesNo = (v) => (v ? "Yes" : "No");

// One label/value row, skipped entirely when the value is empty.
const row = (label, value) => {
  if (value === null || value === undefined || value === "") return "";
  return `
    <div class="row">
      <div class="row-label">${esc(label)}</div>
      <div class="row-value">${esc(value)}</div>
    </div>`;
};

const sectionHeader = (title, accent = "slate") =>
  `<h2 class="section-header accent-${accent}">${esc(title)}</h2>`;

const personLine = (p) => {
  if (!p) return "";
  if (p.type === "ems") {
    const cert = p.certification ? `, ${esc(p.certification)}` : "";
    return `<li>${esc(p.name)}${cert} <span class="muted">— Safety/EMS Personnel</span></li>`;
  }
  return `<li>${esc(p.name)} <span class="muted">— ${esc(p.role || "Other Personnel")}</span></li>`;
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
};

// entry: the raw record. attachments: [{ name, label, note, url, isImage }].
// groups: [{ title, incident_date, incident_time, notes }]. generatedAt: Date.
export function buildSubmissionHtml({ entry, attachments = [], groups = [], generatedAt }) {
  const parties = Array.isArray(entry.involved_parties)
    ? entry.involved_parties
    : typeof entry.involved_parties === "string"
    ? safeParse(entry.involved_parties)
    : [];
  const witnesses = Array.isArray(entry.witnesses)
    ? entry.witnesses
    : typeof entry.witnesses === "string"
    ? safeParse(entry.witnesses)
    : [];

  const images = attachments.filter((a) => a.isImage && a.url);
  const generated = generatedAt ? generatedAt.toLocaleString() : "";

  // Badges: reviewed, lock, group membership.
  const badges = [];
  badges.push(
    entry.reviewed
      ? `<span class="badge badge-blue">Reviewed${entry.reviewed_by ? ` — ${esc(entry.reviewed_by)}` : ""}</span>`
      : `<span class="badge badge-slate">Not reviewed</span>`,
  );
  badges.push(
    entry.locked
      ? `<span class="badge badge-dark">Locked${entry.locked_by ? ` — ${esc(entry.locked_by)}` : ""}</span>`
      : `<span class="badge badge-emerald">Unlocked</span>`,
  );
  groups.forEach((g) => {
    badges.push(`<span class="badge badge-indigo">Group: ${esc(g.title)}</span>`);
  });

  const groupNotes = groups
    .filter((g) => g.notes)
    .map(
      (g) => `
      <div class="note-box">
        <div class="note-title">Admin note — group “${esc(g.title)}”</div>
        <div>${esc(g.notes)}</div>
      </div>`,
    )
    .join("");

  const incidentDetails = [
    row("What are you reporting?", entry.category_description),
    row("Description", entry.description),
    row("Specific PHI Requested", entry.phi_requested),
    row("Communication Method", entry.communication_method),
    row("Other Communication Method", entry.other_communication_method),
    row("Information Disclosed", entry.information_provided),
    row("Scheduled Time", entry.scheduled_time),
    row("Arrival Time", entry.arrival_time),
    row("No Reason Provided", entry.no_reason_provided ? "Yes" : ""),
    row("Stated Reason", entry.stated_reason),
    row("Scheduled Until", entry.scheduled_until),
    entry.request_granted === null || entry.request_granted === undefined
      ? ""
      : row("Request Granted", yesNo(entry.request_granted)),
    row("Denial Reason", entry.denial_reason),
    row("Departure Time", entry.departure_time),
    row("Location", entry.location),
    row("Storage Type", entry.storage_type),
    row("Storage Location", entry.storage_location),
    entry.item_replaced === null || entry.item_replaced === undefined
      ? ""
      : row("Item Replaced", yesNo(entry.item_replaced)),
    row("Replacement Pulled From", entry.replacement_storage_type),
    row("Replacement Location", entry.replacement_storage_location),
    row("Communication Received", entry.communication_received === null || entry.communication_received === undefined ? "" : yesNo(entry.communication_received)),
    row("Communication Details", entry.communication_details),
  ].join("");

  // Attachments summary (bottom of page 1).
  const imageThumbs = images.length
    ? `<div class="thumb-grid">${images
        .map(
          (a) => `
        <figure class="thumb">
          <img src="${esc(a.url)}" alt="${esc(a.name)}" />
          <figcaption>${esc(a.name)}${a.label ? `<br><span class="muted">${esc(a.label)}</span>` : ""}</figcaption>
        </figure>`,
        )
        .join("")}</div>`
    : "";

  const nonImages = attachments.filter((a) => !a.isImage);
  const fileList = nonImages.length
    ? `<ul class="file-list">${nonImages
        .map(
          (a) => `
        <li>
          <span class="file-icon">📄</span>
          <span>
            <strong>${esc(a.name)}</strong>
            ${a.label ? `<br><span class="muted">Label: ${esc(a.label)}</span>` : ""}
            ${a.note ? `<br><span class="muted">Note: ${esc(a.note)}</span>` : ""}
            ${a.url ? `<br><a href="${esc(a.url)}">Open file</a>` : ""}
          </span>
        </li>`,
        )
        .join("")}</ul>`
    : "";

  const attachmentsSection =
    attachments.length === 0
      ? ""
      : `
    ${sectionHeader("Attachments", "amber")}
    ${imageThumbs}
    ${fileList}`;

  // Full-page image displays (page 2+).
  const imagePages = images
    .map(
      (a) => `
    <section class="image-page">
      <div class="image-header">
        <div class="image-name">${esc(a.name)}</div>
        ${a.label ? `<div class="image-label">Label: ${esc(a.label)}</div>` : ""}
        ${a.note ? `<div class="image-note">Note: ${esc(a.note)}</div>` : ""}
      </div>
      <img class="full-image" src="${esc(a.url)}" alt="${esc(a.name)}" />
    </section>`,
    )
    .join("");

  const partiesSection = `
    ${sectionHeader("Involved Parties", "blue")}
    ${parties.length ? `<ul class="people">${parties.map(personLine).join("")}</ul>` : `<p class="muted">None recorded.</p>`}`;

  const witnessesSection = `
    ${sectionHeader("Witnesses", "blue")}
    ${witnesses.length ? `<ul class="people">${witnesses.map(personLine).join("")}</ul>` : `<p class="muted">None recorded.</p>`}`;

  const additionalSection =
    entry.additional_details || groupNotes
      ? `
    ${sectionHeader("Additional Details & Notes", "emerald")}
    ${entry.additional_details ? `<p class="freeform">${esc(entry.additional_details)}</p>` : ""}
    ${groupNotes}`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>WorkLog — ${esc(entry.category)} — ${esc(entry.employee_name)}</title>
<style>
${STYLES}
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">🖨 Print</button>
    <button onclick="window.close()">Close</button>
  </div>

  <header class="brand">
    <div>
      <div class="brand-title">WorkLog</div>
      <div class="brand-subtitle">EMS / Safety Incident Documentation</div>
    </div>
    <div class="brand-generated">Report generated<br><strong>${esc(generated)}</strong></div>
  </header>

  ${sectionHeader("Submission Overview", "slate")}
  <div class="badges">${badges.join("")}</div>
  <div class="overview">
    ${row("Employee", entry.employee_name)}
    ${row("Category", entry.category)}
    ${row("Date / Time", `${esc(entry.date)} at ${esc(entry.time)}`)}
    ${row("Submitted", fmtDateTime(entry.created_at))}
    ${row("Last Updated", fmtDateTime(entry.updated_at))}
  </div>

  ${sectionHeader("Incident Details", "slate")}
  <div class="details">
    ${incidentDetails || `<p class="muted">No additional fields.</p>`}
  </div>

  ${partiesSection}
  ${witnessesSection}
  ${additionalSection}
  ${attachmentsSection}

  ${imagePages}
</body>
</html>`;
}

function safeParse(str) {
  try {
    const v = JSON.parse(str || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b; margin: 0; padding: 0 24px 48px; background: #fff;
    max-width: 900px; margin: 0 auto;
  }
  .toolbar {
    position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end;
    padding: 12px 0; background: #fff; border-bottom: 1px solid #e2e8f0; z-index: 10;
  }
  .toolbar button {
    border: 1px solid #cbd5e1; background: #0f172a; color: #fff; border-radius: 8px;
    padding: 8px 16px; font-size: 14px; cursor: pointer;
  }
  .toolbar button:last-child { background: #fff; color: #334155; }

  .brand {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 0; margin-bottom: 8px; border-bottom: 3px solid #0f172a;
  }
  .brand-title { font-size: 28px; font-weight: 700; color: #0f172a; }
  .brand-subtitle { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #64748b; }
  .brand-generated { text-align: right; font-size: 12px; color: #64748b; }

  .section-header {
    font-size: 15px; font-weight: 700; color: #fff; padding: 8px 12px;
    border-radius: 6px; margin: 22px 0 12px;
  }
  .accent-slate   { background: #334155; }
  .accent-blue    { background: #2563eb; }
  .accent-emerald { background: #059669; }
  .accent-amber   { background: #d97706; }
  .accent-indigo  { background: #4f46e5; }

  .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; color: #fff; }
  .badge-blue { background: #2563eb; }
  .badge-slate { background: #64748b; }
  .badge-dark { background: #0f172a; }
  .badge-emerald { background: #059669; }
  .badge-indigo { background: #4f46e5; }

  .row { display: grid; grid-template-columns: 200px 1fr; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .row-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .row-value { font-size: 14px; white-space: pre-wrap; }

  .people { margin: 0; padding-left: 20px; }
  .people li { margin: 4px 0; font-size: 14px; }
  .muted { color: #94a3b8; }
  .freeform { white-space: pre-wrap; font-size: 14px; background: #f8fafc; border-left: 4px solid #059669; padding: 10px 14px; border-radius: 0 6px 6px 0; }

  .note-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; margin-top: 10px; font-size: 14px; }
  .note-title { font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

  .thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 8px; }
  .thumb { margin: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .thumb img { width: 100%; height: 120px; object-fit: cover; display: block; }
  .thumb figcaption { padding: 6px 8px; font-size: 11px; word-break: break-word; }

  .file-list { list-style: none; margin: 8px 0 0; padding: 0; }
  .file-list li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .file-icon { font-size: 20px; }
  a { color: #2563eb; }

  /* Keep each image with its header and never split it across pages. */
  .image-page {
    page-break-before: always; break-before: page;
    page-break-inside: avoid; break-inside: avoid;
    margin-top: 24px;
  }
  .image-header { background: #334155; color: #fff; padding: 10px 14px; border-radius: 6px 6px 0 0; }
  .image-name { font-weight: 700; font-size: 15px; }
  .image-label, .image-note { font-size: 12px; opacity: 0.9; margin-top: 2px; }
  /* Cap by both width and height (auto on the other axis) so a tall portrait
     photo is scaled down to fit rather than overflowing onto extra pages. */
  .full-image {
    display: block; margin: 0 auto;
    max-width: 100%; max-height: 80vh; width: auto; height: auto;
    border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px;
  }

  @media print {
    .no-print { display: none !important; }
    body { padding: 0; max-width: none; }
    /* Degrade gracefully on B&W: colored fills that browsers drop when printing
       backgrounds are replaced by outlines so nothing disappears. */
    .section-header { color: #000 !important; background: #fff !important; border: 2px solid #000; }
    .badge { color: #000 !important; background: #fff !important; border: 1px solid #000; }
    .image-header { color: #000 !important; background: #fff !important; border: 2px solid #000; flex: 0 0 auto; }
    /* One page per image: fill the page as a column, image scaled to contain.
       overflow:hidden eats any sub-pixel overflow that would spawn a blank page. */
    .image-page { margin-top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
    .full-image {
      flex: 1 1 auto; min-height: 0;
      max-height: none; width: 100%; height: 100%;
      object-fit: contain; object-position: center top;
      border: 1px solid #000; border-top: none;
    }
    .note-box { background: #fff !important; border: 1px solid #000; }
    .note-title { color: #000 !important; }
    .freeform { background: #fff !important; border-left: 4px solid #000; }
    a { color: #000; }
  }
`;
