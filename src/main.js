const SHEET_FORMATS = [
  { id: 'a5', label: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'letter', label: 'Letter', widthMm: 215.9, heightMm: 279.4 },
  { id: 'legal', label: 'Legal', widthMm: 215.9, heightMm: 355.6 },
  { id: 'tabloid', label: 'Tabloid', widthMm: 279.4, heightMm: 431.8 },
];

const PT_PER_MM = 72 / 25.4;
const app = document.querySelector('#app');
const state = {
  step: 1,
  source: null,
  projectName: 'Mi libro',
  dark: false,
  error: '',
  progress: null,
  generatedUrl: null,
  generatedName: 'booklet.pdf',
  pdfLib: null,
  settings: {
    pageRange: '',
    bindingEdge: 'left',
    placementFit: 'contain',
    signaturePages: 'single',
    duplexFlip: 'short',
    reverseSourceOrder: false,
    sheet: SHEET_FORMATS.find((sheet) => sheet.id === 'letter'),
    outerMarginMm: 2,
    centerGutterMm: 2,
    topMarginMm: 2,
    bottomMarginMm: 2,
    showGuides: true,
  },
};

render();

function render() {
  const blueprint = state.source ? tryBlueprint() : null;
  app.className = state.dark ? 'app dark' : 'app';
  app.innerHTML = `
    <header class="topbar">
      <div><p class="eyebrow">Book</p><h1>Booklet</h1></div>
      <div class="top-actions">
        <button class="icon-button" data-action="theme" aria-label="Cambiar tema">${state.dark ? '☀️' : '☾'}</button>
        ${state.source ? `<span class="pill">▣ ${state.source.pageCount} páginas</span>` : ''}
      </div>
    </header>
    ${stepper()}
    <section class="content">
      ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ''}
      ${state.step === 1 ? importStep() : ''}
      ${state.step === 2 && state.source ? setupStep() : ''}
      ${state.step === 3 ? sheetStep() : ''}
      ${state.step === 4 && state.source && blueprint ? reviewStep(blueprint) : ''}
    </section>
    ${state.progress ? progressOverlay() : ''}
    ${bottomNav(Boolean(blueprint))}
  `;
  bindEvents();
}

function stepper() {
  return `<div class="stepper" aria-label="Progreso">${[1, 2, 3, 4].map((item) => `
    <div class="step-wrap">
      <span class="${item < state.step ? 'step done' : item === state.step ? 'step active' : 'step'}">${item < state.step ? '✓' : item}</span>
      ${item < 4 ? `<span class="${item < state.step ? 'line done' : 'line'}"></span>` : ''}
    </div>`).join('')}</div>`;
}

function importStep() {
  return `<div class="screen intro">
    <h2>Comienza tu proyecto de libro</h2>
    <p>Importa un PDF y Book generará un nuevo archivo donde cada cara de la hoja contiene dos páginas correctamente ordenadas para imprimir a doble cara, doblar por la mitad y leer de inicio a fin.</p>
    <input id="pdf-input" class="hidden" type="file" accept="application/pdf,.pdf" />
    <div class="import-grid">
      <button class="import-card primary-card" data-action="pick-pdf">▣ Importar PDF</button>
      <button class="import-card muted-card" disabled title="Próximamente">▧ Imágenes próximamente</button>
    </div>
    <div class="tip">💡 Carga un documento PDF. La app analizará sus páginas y calculará el orden correcto del cuadernillo.</div>
    ${state.source ? `<div class="file-chip">▣ ${escapeHtml(state.source.file.name)}</div>` : ''}
  </div>`;
}

function setupStep() {
  const s = state.settings;
  return `<div class="screen form-screen">
    ${field('Nombre del proyecto', `<input data-setting="projectName" value="${escapeAttr(state.projectName)}" />`)}
    ${field('Rango de páginas', `<input data-setting="pageRange" placeholder="Todas (ej. 1-48,50)" value="${escapeAttr(s.pageRange)}" />`)}
    ${segment('Borde de encuadernación', 'bindingEdge', [['left', 'Izquierda'], ['right', 'Derecha']], s.bindingEdge)}
    ${segment('Ajuste de página', 'placementFit', [['contain', 'Contener'], ['cover', 'Cubrir']], s.placementFit)}
    ${field('Tamaño de signatura', `<select data-setting="signaturePages"><option value="single">Una sola signatura</option>${[4, 8, 16, 32].map((n) => `<option value="${n}" ${s.signaturePages === n ? 'selected' : ''}>${n} páginas</option>`).join('')}</select>`)}
    ${field('Volteo dúplex de impresora', `<select data-setting="duplexFlip"><option value="short" ${s.duplexFlip === 'short' ? 'selected' : ''}>Borde corto</option><option value="long" ${s.duplexFlip === 'long' ? 'selected' : ''}>Borde largo</option></select>`)}
    ${switchRow('Invertir orden de origen', 'Útil si el PDF fue importado de atrás hacia adelante.', 'reverseSourceOrder', s.reverseSourceOrder)}
  </div>`;
}

function sheetStep() {
  const s = state.settings;
  return `<div class="screen form-screen">
    ${field('Formato de hoja', `<select data-setting="sheet">${SHEET_FORMATS.map((sheet) => `<option value="${sheet.id}" ${s.sheet.id === sheet.id ? 'selected' : ''}>${sheet.label} · ${sheet.widthMm} × ${sheet.heightMm} mm</option>`).join('')}</select>`)}
    ${numberField('Margen exterior (mm)', 'outerMarginMm', s.outerMarginMm)}
    ${numberField('Canal central (mm)', 'centerGutterMm', s.centerGutterMm)}
    ${numberField('Margen superior (mm)', 'topMarginMm', s.topMarginMm)}
    ${numberField('Margen inferior (mm)', 'bottomMarginMm', s.bottomMarginMm)}
    ${switchRow('Mostrar guías de corte y doblez', 'Agrega bordes de página y una guía central de plegado.', 'showGuides', s.showGuides)}
  </div>`;
}

function reviewStep(blueprint) {
  const s = state.settings;
  return `<div class="screen review">
    <p>Presiona Generar para construir el PDF. Cuando esté listo podrás descargarlo o revisarlo en la vista previa.</p>
    <section class="panel">
      <h2>Plano de impresión</h2>
      <p>Este es el orden de hojas usado para que todas las páginas coincidan al doblarlas.</p>
      <div class="stats">
        ${stat('Páginas', blueprint.selectedPages)}${stat('Blancos', blueprint.blankFillers)}${stat('Hojas físicas', blueprint.physicalSheets)}${stat('Signaturas', blueprint.signatures)}${stat('Tamaño de hoja doblada', `${blueprint.leafWidthMm.toFixed(1)} × ${blueprint.leafHeightMm.toFixed(1)} mm`)}
      </div>
      <div class="print-note">🖨️ Imprime a doble cara en ${s.sheet.label} horizontal, voltea por borde ${s.duplexFlip === 'short' ? 'corto' : 'largo'} y desactiva el escalado de impresora.</div>
      <h3>Primeras hojas impuestas</h3>
      <div class="sheet-list">${blueprint.sheets.slice(0, 6).map(sheetCard).join('')}</div>
      ${blueprint.sheets.length > 6 ? `<p>…y ${blueprint.sheets.length - 6} hojas más.</p>` : ''}
    </section>
    ${state.generatedUrl ? `<a class="download" href="${state.generatedUrl}" download="${escapeAttr(state.generatedName)}">⬇ Descargar PDF generado</a><iframe title="Vista previa del PDF" class="pdf-preview" src="${state.generatedUrl}"></iframe>` : `<button class="preview-lock" data-action="generate">📖 La vista previa se desbloquea después de generar</button>`}
  </div>`;
}

function bottomNav(hasBlueprint) {
  const canNext = state.step === 1 ? Boolean(state.source) : state.step === 3 ? hasBlueprint : true;
  return `<nav class="bottom-nav">
    <button class="secondary" data-action="back" ${state.step === 1 ? 'disabled' : ''}>‹ Atrás</button>
    ${state.step < 4 ? `<button class="primary" data-action="next" ${canNext ? '' : 'disabled'}>Siguiente ›</button>` : `<button class="primary" data-action="generate" ${state.progress ? 'disabled' : ''}>📖 Generar</button>`}
  </nav>`;
}

function bindEvents() {
  document.querySelector('[data-action="theme"]')?.addEventListener('click', () => { state.dark = !state.dark; render(); });
  document.querySelector('[data-action="pick-pdf"]')?.addEventListener('click', () => document.querySelector('#pdf-input')?.click());
  document.querySelector('#pdf-input')?.addEventListener('change', importPdf);
  document.querySelector('[data-action="back"]')?.addEventListener('click', () => { state.step = Math.max(1, state.step - 1); render(); });
  document.querySelector('[data-action="next"]')?.addEventListener('click', () => { state.step = Math.min(4, state.step + 1); render(); });
  document.querySelectorAll('[data-action="generate"]').forEach((button) => button.addEventListener('click', generateBooklet));
  document.querySelectorAll('[data-segment]').forEach((button) => button.addEventListener('click', () => updateSetting(button.dataset.segment, button.dataset.value)));
  document.querySelectorAll('[data-setting]').forEach((input) => input.addEventListener('input', () => updateInput(input)));
}

async function importPdf(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  setError('');
  try {
    const bytes = await file.arrayBuffer();
    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.load(bytes);
    state.source = { file, bytes, pageCount: pdf.getPageCount() };
    state.projectName = file.name.replace(/\.pdf$/i, '');
    state.step = 2;
  } catch (error) {
    setError(error.message || 'No se pudo abrir el PDF.');
  }
  render();
}

async function generateBooklet() {
  if (!state.source || state.progress) return;
  try {
    setProgress('Preparando páginas', 8);
    const { PDFDocument, rgb } = await loadPdfLib();
    const sourcePdf = await PDFDocument.load(state.source.bytes.slice(0));
    const outputPdf = await PDFDocument.create();
    const blueprint = buildBlueprint(state.source.pageCount, state.settings);
    const sheetWidth = mmToPt(Math.max(state.settings.sheet.widthMm, state.settings.sheet.heightMm));
    const sheetHeight = mmToPt(Math.min(state.settings.sheet.widthMm, state.settings.sheet.heightMm));
    const outer = mmToPt(state.settings.outerMarginMm);
    const gutter = mmToPt(state.settings.centerGutterMm);
    const top = mmToPt(state.settings.topMarginMm);
    const bottom = mmToPt(state.settings.bottomMarginMm);
    const slotWidth = (sheetWidth - gutter) / 2 - outer;
    const slotHeight = sheetHeight - top - bottom;
    const slots = [{ x: outer, y: bottom, width: slotWidth, height: slotHeight }, { x: outer + slotWidth + gutter, y: bottom, width: slotWidth, height: slotHeight }];
    const embedded = new Map();

    async function pageFor(pageNumber) {
      if (!embedded.has(pageNumber)) {
        const [page] = await outputPdf.embedPdf(sourcePdf, [pageNumber - 1]);
        embedded.set(pageNumber, page);
      }
      return embedded.get(pageNumber);
    }

    let side = 0;
    for (const plan of blueprint.sheets) {
      for (const sideSlots of [plan.front, plan.back]) {
        side += 1;
        const page = outputPdf.addPage([sheetWidth, sheetHeight]);
        if (state.settings.showGuides) drawGuides(page, rgb, sheetWidth, sheetHeight, slots);
        for (const [index, slot] of sideSlots.entries()) {
          if (!slot) continue;
          const embeddedPage = await pageFor(slot);
          const box = slots[index];
          const scale = getScale(embeddedPage.width, embeddedPage.height, box.width, box.height, state.settings.placementFit);
          const width = embeddedPage.width * scale;
          const height = embeddedPage.height * scale;
          page.drawPage(embeddedPage, { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height });
        }
        setProgress('Compaginando hojas', Math.round((side / (blueprint.physicalSheets * 2)) * 92));
      }
    }

    setProgress('Finalizando PDF listo para imprimir', 96);
    const pdfBytes = await outputPdf.save();
    if (state.generatedUrl) URL.revokeObjectURL(state.generatedUrl);
    state.generatedUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    state.generatedName = `${safeFileName(state.projectName)}-booklet.pdf`;
    setProgress('PDF generado', 100);
    setTimeout(() => { state.progress = null; render(); }, 450);
  } catch (error) {
    state.progress = null;
    setError(error.message || 'No se pudo generar el cuadernillo.');
    render();
  }
}

async function loadPdfLib() {
  if (!state.pdfLib) state.pdfLib = await import('https://esm.sh/pdf-lib@1.17.1');
  return state.pdfLib;
}

function buildBlueprint(pageCount, settings) {
  const selected = parsePageRange(settings.pageRange, pageCount);
  if (settings.reverseSourceOrder) selected.reverse();
  const requested = settings.signaturePages === 'single' ? selected.length : Number(settings.signaturePages);
  const signaturePages = Math.max(4, Math.ceil(requested / 4) * 4);
  const signatures = [];
  for (let start = 0; start < selected.length; start += signaturePages) {
    const signature = selected.slice(start, start + signaturePages);
    while (signature.length % 4 !== 0 || signature.length < 4) signature.push(null);
    signatures.push(signature);
  }
  const sheets = [];
  signatures.forEach((signature, signatureIndex) => {
    const sheetCount = signature.length / 4;
    for (let index = 0; index < sheetCount; index += 1) {
      const front = [signature[signature.length - 1 - index * 2], signature[index * 2]];
      let back = [signature[index * 2 + 1], signature[signature.length - 2 - index * 2]];
      if (settings.duplexFlip === 'long') back = [back[1], back[0]];
      sheets.push({
        signature: signatureIndex + 1,
        sheet: index + 1,
        front: settings.bindingEdge === 'right' ? [front[1], front[0]] : front,
        back: settings.bindingEdge === 'right' ? [back[1], back[0]] : back,
      });
    }
  });
  const paddedPages = sheets.length * 4;
  const sheetLong = Math.max(settings.sheet.widthMm, settings.sheet.heightMm);
  const sheetShort = Math.min(settings.sheet.widthMm, settings.sheet.heightMm);
  return {
    selectedPages: selected.length,
    blankFillers: paddedPages - selected.length,
    physicalSheets: sheets.length,
    signatures: signatures.length,
    leafWidthMm: (sheetLong - settings.centerGutterMm) / 2 - settings.outerMarginMm,
    leafHeightMm: sheetShort - settings.topMarginMm - settings.bottomMarginMm,
    sheets,
  };
}

function parsePageRange(range, pageCount) {
  if (!range.trim()) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const selected = new Set();
  for (const part of range.split(',')) {
    const token = part.trim();
    if (!token) continue;
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`Rango inválido: “${token}”. Usa ejemplos como 1-12,15,18-20.`);
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < 1 || start > pageCount || end > pageCount || start > end) throw new Error(`Rango fuera del documento: “${token}”. El PDF tiene ${pageCount} páginas.`);
    for (let page = start; page <= end; page += 1) selected.add(page);
  }
  const pages = [...selected].sort((a, b) => a - b);
  if (!pages.length) throw new Error('Selecciona al menos una página.');
  return pages;
}

function drawGuides(page, rgb, sheetWidth, sheetHeight, slots) {
  const guideColor = rgb(0.08, 0.27, 0.29);
  page.drawLine({ start: { x: sheetWidth / 2, y: 0 }, end: { x: sheetWidth / 2, y: sheetHeight }, color: guideColor, opacity: 0.35, thickness: 0.5, dashArray: [6, 5] });
  for (const slot of slots) page.drawRectangle({ ...slot, borderColor: guideColor, borderOpacity: 0.2, borderWidth: 0.5 });
}

function getScale(sourceWidth, sourceHeight, maxWidth, maxHeight, fit) {
  return fit === 'cover' ? Math.max(maxWidth / sourceWidth, maxHeight / sourceHeight) : Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
}

function field(label, control) { return `<label class="field"><span>${label}</span>${control}</label>`; }
function numberField(label, key, value) { return field(label, `<input type="number" min="0" step="0.5" data-setting="${key}" value="${value}" />`); }
function switchRow(title, help, key, checked) { return `<label class="switch-row"><span><strong>${title}</strong><small>${help}</small></span><input type="checkbox" data-setting="${key}" ${checked ? 'checked' : ''} /></label>`; }
function segment(title, key, options, value) { return `<div class="segment-block"><strong>${title}</strong><div class="segment">${options.map(([optionValue, label]) => `<button data-segment="${key}" data-value="${optionValue}" class="${value === optionValue ? 'selected' : ''}">${value === optionValue ? '✓ ' : ''}${label}</button>`).join('')}</div></div>`; }
function stat(label, value) { return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`; }
function sheetCard(sheet) { const f = (slot) => slot ? `P${slot}` : 'Blanco'; return `<article class="sheet-card"><strong>Signatura ${sheet.signature} · Hoja ${sheet.sheet}</strong><span>Frente: ${f(sheet.front[0])} | ${f(sheet.front[1])}</span><span>Vuelta: ${f(sheet.back[0])} | ${f(sheet.back[1])}</span></article>`; }
function progressOverlay() { const p = state.progress; const s = state.settings; return `<div class="overlay"><div class="progress-card"><div class="badge">📖</div><h2>Creando PDF de libro</h2><p>Las páginas se están colocando en signaturas y empaquetando para impresión.</p><div class="meter-row"><strong>${p.message}</strong><span>${p.percent}%</span></div><div class="meter"><span style="width:${p.percent}%"></span></div><div class="mini-stats">${stat('Origen', 'PDF')}${stat('Páginas', state.source?.pageCount ?? 0)}${stat('Hoja', s.sheet.label)}${stat('Signatura', s.signaturePages === 'single' ? 'Única' : s.signaturePages)}</div></div></div>`; }
function updateSetting(key, value) { state.settings[key] = value; render(); }
function updateInput(input) {
  const key = input.dataset.setting;
  if (key === 'projectName') state.projectName = input.value;
  else if (key === 'sheet') state.settings.sheet = SHEET_FORMATS.find((sheet) => sheet.id === input.value) || state.settings.sheet;
  else if (key === 'signaturePages') state.settings.signaturePages = input.value === 'single' ? 'single' : Number(input.value);
  else if (input.type === 'checkbox') state.settings[key] = input.checked;
  else if (input.type === 'number') state.settings[key] = Math.max(0, Number(input.value));
  else state.settings[key] = input.value;
}
function tryBlueprint() { try { return buildBlueprint(state.source.pageCount, state.settings); } catch (error) { state.error = error.message; return null; } }
function setProgress(message, percent) { state.progress = { message, percent }; render(); }
function setError(message) { state.error = message; }
function mmToPt(value) { return value * PT_PER_MM; }
function safeFileName(value) { return (value || 'book').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-').replace(/^-|-$/g, '') || 'book'; }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
