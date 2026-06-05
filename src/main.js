const SHEET_FORMATS = [
  { id: 'a5', label: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'letter', label: 'Carta', widthMm: 215.9, heightMm: 279.4 },
  { id: 'legal', label: 'Legal', widthMm: 215.9, heightMm: 355.6 },
  { id: 'tabloid', label: 'Tabloid', widthMm: 279.4, heightMm: 431.8 },
];

const COLLAGE_LAYOUTS = [
  { id: 'auto', label: 'Auto', hint: 'La app escoge la mejor cuadrícula.' },
  { id: 'grid', label: 'Grid', hint: 'Celdas iguales para todas las imágenes.' },
  { id: 'vertical', label: 'Vertical', hint: 'Una imagen encima de otra.' },
  { id: 'horizontal', label: 'Horizontal', hint: 'Una imagen a la izquierda y otra a la derecha.' },
  { id: 'hero', label: 'Destacada', hint: 'Una imagen grande con miniaturas alrededor.' },
  { id: 'mosaic', label: 'Mosaico', hint: 'Formatos creativos tipo collage art.' },
];

const PT_PER_MM = 72 / 25.4;
const PX_PER_MM = 4;
const app = document.querySelector('#app');
const state = {
  mode: 'home',
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
  collage: {
    images: [],
    projectName: 'Mi collage',
    sheet: SHEET_FORMATS.find((sheet) => sheet.id === 'letter'),
    orientation: 'portrait',
    layout: 'auto',
    fit: 'cover',
    background: '#fffaf0',
    borderColor: '#1f1b17',
    marginMm: 10,
    gapMm: 4,
    borderMm: 0.8,
    radiusMm: 1,
    generatedUrl: null,
    generatedName: 'collage.png',
  },
};

render();

function render() {
  const isBooklet = state.mode === 'booklet';
  const isCollage = state.mode === 'collage';
  const blueprint = isBooklet && state.source ? tryBlueprint() : null;
  app.className = state.dark ? 'app dark' : 'app';
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <img class="app-icon" src="https://static.thenounproject.com/png/100734-200.png" alt="" />
        <div><p class="eyebrow">Publica tu propio libro en casa</p><h1>${isCollage ? 'Collage' : isBooklet ? 'Booklet' : 'Book'}</h1></div>
      </div>
      <div class="top-actions">
        ${state.mode !== 'home' ? `<button class="icon-button wide" data-action="home" aria-label="Inicio">Inicio</button>` : ''}
        <button class="icon-button" data-action="theme" aria-label="Cambiar tema">${state.dark ? '☀️' : '☾'}</button>
        ${isBooklet && state.source ? `<span class="pill">▣ ${state.source.pageCount} páginas</span>` : ''}
        ${isCollage && state.collage.images.length ? `<span class="pill">▧ ${state.collage.images.length} imágenes</span>` : ''}
      </div>
    </header>
    ${isBooklet ? stepper() : ''}
    <section class="content ${isCollage ? 'wide-content' : ''}">
      ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ''}
      ${state.mode === 'home' ? homeStep() : ''}
      ${isBooklet && state.step === 1 ? importStep() : ''}
      ${isBooklet && state.step === 2 && state.source ? setupStep() : ''}
      ${isBooklet && state.step === 3 ? sheetStep() : ''}
      ${isBooklet && state.step === 4 && state.source && blueprint ? reviewStep(blueprint) : ''}
      ${isCollage ? collageStep() : ''}
    </section>
    ${state.progress ? progressOverlay() : ''}
    ${isBooklet ? bottomNav(Boolean(blueprint)) : ''}
  `;
  bindEvents();
}

function homeStep() {
  return `<div class="screen intro hero-screen">
    <h2>Creatividad para leer, imprimir y compartir</h2>
    <p>Elige si quieres convertir un PDF en cuadernillo a doble cara o crear una hoja de collage grid art con múltiples imágenes, lista para guardar e imprimir en casa.</p>
    <div class="import-grid">
      <button class="import-card primary-card" data-action="start-booklet"><span>📖</span><strong>Crear libro PDF</strong><small>Mantiene el flujo actual para impresión dúplex.</small></button>
      <button class="import-card muted-card" data-action="start-collage"><span>▧</span><strong>Imágenes / Collage</strong><small>Sube fotos, elige formato carta y previsualiza diseños.</small></button>
    </div>
    <div class="tip">💡 Publica tu propio libro en casa: combina lectura, papel cálido, blanco, negro y naranja tenue con herramientas sencillas.</div>
  </div>`;
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
    <div class="import-grid single-row">
      <button class="import-card primary-card" data-action="pick-pdf">▣ Importar PDF</button>
      <button class="import-card muted-card" data-action="start-collage">▧ Imágenes / Collage</button>
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

function collageStep() {
  const c = state.collage;
  const sheet = getCollageSheetSize();
  const layouts = COLLAGE_LAYOUTS.map((layout) => `<button data-collage-setting="layout" data-value="${layout.id}" class="layout-chip ${c.layout === layout.id ? 'selected' : ''}"><strong>${layout.label}</strong><small>${layout.hint}</small></button>`).join('');
  return `<div class="screen collage-screen">
    <input id="image-input" class="hidden" type="file" accept="image/*" multiple />
    <div class="collage-head">
      <div>
        <h2>Collage grid art</h2>
        <p>Crea formatos tipo collage en una hoja definida. Sube varias imágenes, cambia distribución, margen, borde y exporta la composición para imprimir.</p>
      </div>
      <button class="primary" data-action="pick-images">+ Subir imágenes</button>
    </div>
    <div class="collage-workspace">
      <aside class="panel controls-panel">
        ${field('Nombre del collage', `<input data-collage-setting="projectName" value="${escapeAttr(c.projectName)}" />`)}
        ${field('Tamaño de hoja', `<select data-collage-setting="sheet">${SHEET_FORMATS.map((format) => `<option value="${format.id}" ${c.sheet.id === format.id ? 'selected' : ''}>${format.label} · ${format.widthMm} × ${format.heightMm} mm</option>`).join('')}</select>`)}
        ${segment('Orientación', 'collage:orientation', [['portrait', 'Vertical'], ['landscape', 'Horizontal']], c.orientation)}
        ${segment('Ajuste de imagen', 'collage:fit', [['cover', 'Cubrir'], ['contain', 'Contener']], c.fit)}
        <div class="layout-list"><strong>Diseño según cantidad</strong>${layouts}</div>
        <div class="control-row"><label>Fondo <input type="color" data-collage-setting="background" value="${escapeAttr(c.background)}" /></label><label>Borde <input type="color" data-collage-setting="borderColor" value="${escapeAttr(c.borderColor)}" /></label></div>
        ${numberFieldCollage('Margen de hoja (mm)', 'marginMm', c.marginMm)}
        ${numberFieldCollage('Separación (mm)', 'gapMm', c.gapMm)}
        ${numberFieldCollage('Grosor de borde (mm)', 'borderMm', c.borderMm)}
        <button class="primary full" data-action="export-collage" ${c.images.length ? '' : 'disabled'}>Guardar collage</button>
        ${c.generatedUrl ? `<a class="download compact" href="${c.generatedUrl}" download="${escapeAttr(c.generatedName)}">⬇ Descargar imagen</a>` : ''}
      </aside>
      <section class="preview-panel">
        ${collagePreview(sheet)}
        ${thumbnailStrip()}
      </section>
    </div>
  </div>`;
}

function collagePreview(sheet) {
  const c = state.collage;
  const slots = buildCollageSlots(c.images.length, sheet.width, sheet.height, c);
  return `<div class="paper-shell">
    <div class="paper-meta"><strong>${c.sheet.label} ${c.orientation === 'landscape' ? 'horizontal' : 'vertical'}</strong><span>${c.images.length || 0} imágenes · ${selectedLayoutLabel()}</span></div>
    <div class="paper-preview" style="--paper-w:${sheet.width}; --paper-h:${sheet.height}; background:${escapeAttr(c.background)};">
      ${c.images.length ? slots.map((slot, index) => collageSlot(slot, c.images[index], index)).join('') : `<div class="empty-collage"><strong>Sube imágenes para comenzar</strong><span>Verás aquí la previsualización en tamaño de hoja.</span></div>`}
    </div>
  </div>`;
}

function collageSlot(slot, image, index) {
  const c = state.collage;
  return `<div class="collage-slot" style="left:${slot.x}%;top:${slot.y}%;width:${slot.width}%;height:${slot.height}%;border-color:${escapeAttr(c.borderColor)};border-width:${Math.max(1, c.borderMm * 2)}px;border-radius:${c.radiusMm * 3}px;">
    <img src="${image.url}" alt="Imagen ${index + 1}" style="object-fit:${c.fit};" />
    <span>${index + 1}</span>
  </div>`;
}

function thumbnailStrip() {
  const images = state.collage.images;
  if (!images.length) return `<div class="tip">📷 Selecciona de 1 a 100 imágenes para crear cuadrículas, filas, columnas o mosaicos.</div>`;
  return `<div class="thumb-strip">${images.map((image, index) => `<article class="thumb"><img src="${image.url}" alt="${escapeAttr(image.name)}" /><button data-action="remove-image" data-index="${index}" aria-label="Quitar ${escapeAttr(image.name)}">×</button><small>${index + 1}</small></article>`).join('')}</div>`;
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
  document.querySelector('[data-action="home"]')?.addEventListener('click', () => { state.mode = 'home'; state.error = ''; render(); });
  document.querySelectorAll('[data-action="start-booklet"]').forEach((button) => button.addEventListener('click', () => { state.mode = 'booklet'; state.step = 1; state.error = ''; render(); }));
  document.querySelectorAll('[data-action="start-collage"]').forEach((button) => button.addEventListener('click', () => { state.mode = 'collage'; state.error = ''; render(); }));
  document.querySelector('[data-action="pick-pdf"]')?.addEventListener('click', () => document.querySelector('#pdf-input')?.click());
  document.querySelector('#pdf-input')?.addEventListener('change', importPdf);
  document.querySelector('[data-action="pick-images"]')?.addEventListener('click', () => document.querySelector('#image-input')?.click());
  document.querySelector('#image-input')?.addEventListener('change', importImages);
  document.querySelector('[data-action="back"]')?.addEventListener('click', () => { state.step = Math.max(1, state.step - 1); render(); });
  document.querySelector('[data-action="next"]')?.addEventListener('click', () => { state.step = Math.min(4, state.step + 1); render(); });
  document.querySelectorAll('[data-action="generate"]').forEach((button) => button.addEventListener('click', generateBooklet));
  document.querySelector('[data-action="export-collage"]')?.addEventListener('click', exportCollage);
  document.querySelectorAll('[data-action="remove-image"]').forEach((button) => button.addEventListener('click', () => removeCollageImage(Number(button.dataset.index))));
  document.querySelectorAll('[data-segment]').forEach((button) => button.addEventListener('click', () => updateSegment(button.dataset.segment, button.dataset.value)));
  document.querySelectorAll('[data-setting]').forEach((input) => input.addEventListener('input', () => updateInput(input)));
  document.querySelectorAll('[data-collage-setting]').forEach((input) => input.addEventListener('input', () => updateCollageInput(input)));
  document.querySelectorAll('button[data-collage-setting]').forEach((button) => button.addEventListener('click', () => updateCollageValue(button.dataset.collageSetting, button.dataset.value)));
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

function importImages(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith('image/')).slice(0, 100 - state.collage.images.length);
  if (!files.length) return;
  setError('');
  state.collage.images.push(...files.map((file) => ({ file, name: file.name, url: URL.createObjectURL(file) })));
  if (state.collage.projectName === 'Mi collage' && files[0]) state.collage.projectName = files[0].name.replace(/\.[^.]+$/, '');
  render();
}

function removeCollageImage(index) {
  const [image] = state.collage.images.splice(index, 1);
  if (image) URL.revokeObjectURL(image.url);
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

async function exportCollage() {
  if (!state.collage.images.length) return;
  try {
    setProgress('Preparando collage', 15);
    const c = state.collage;
    const sheet = getCollageSheetSize();
    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sheet.width * scale);
    canvas.height = Math.round(sheet.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    const slots = buildCollageSlots(c.images.length, sheet.width, sheet.height, c, false);
    const loaded = await Promise.all(c.images.map((image) => loadImage(image.url)));
    loaded.forEach((image, index) => {
      const slot = slots[index];
      drawCollageImage(ctx, image, slot, c);
      setProgress('Dibujando imágenes', Math.round(20 + ((index + 1) / loaded.length) * 70));
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
    if (!blob) throw new Error('No se pudo exportar el canvas.');
    if (c.generatedUrl) URL.revokeObjectURL(c.generatedUrl);
    c.generatedUrl = URL.createObjectURL(blob);
    c.generatedName = `${safeFileName(c.projectName)}-collage.png`;
    setProgress('Collage guardado', 100);
    setTimeout(() => { state.progress = null; render(); }, 450);
  } catch (error) {
    state.progress = null;
    setError(error.message || 'No se pudo guardar el collage.');
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

function buildCollageSlots(count, sheetWidth, sheetHeight, settings, asPercent = true) {
  if (!count) return [];
  const margin = settings.marginMm * PX_PER_MM;
  const gap = settings.gapMm * PX_PER_MM;
  const width = sheetWidth - margin * 2;
  const height = sheetHeight - margin * 2;
  const layout = settings.layout === 'auto' ? autoLayout(count) : settings.layout;
  let slots;
  if (layout === 'horizontal' && count <= 4) slots = rowSlots(count, margin, margin, width, height, gap);
  else if (layout === 'vertical' && count <= 4) slots = columnSlots(count, margin, margin, width, height, gap);
  else if (layout === 'hero' && count > 1) slots = heroSlots(count, margin, margin, width, height, gap);
  else if (layout === 'mosaic' && count >= 3) slots = mosaicSlots(count, margin, margin, width, height, gap);
  else slots = gridSlots(count, margin, margin, width, height, gap);
  return asPercent ? slots.map((slot) => ({ x: (slot.x / sheetWidth) * 100, y: (slot.y / sheetHeight) * 100, width: (slot.width / sheetWidth) * 100, height: (slot.height / sheetHeight) * 100 })) : slots;
}

function autoLayout(count) {
  if (count === 2) return 'vertical';
  if (count === 3 || count === 5) return 'hero';
  if (count >= 6) return 'mosaic';
  return 'grid';
}

function gridSlots(count, x, y, width, height, gap) {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const cellWidth = (width - gap * (columns - 1)) / columns;
  const cellHeight = (height - gap * (rows - 1)) / rows;
  return Array.from({ length: count }, (_, index) => ({ x: x + (index % columns) * (cellWidth + gap), y: y + Math.floor(index / columns) * (cellHeight + gap), width: cellWidth, height: cellHeight }));
}

function rowSlots(count, x, y, width, height, gap) {
  const cellWidth = (width - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({ x: x + index * (cellWidth + gap), y, width: cellWidth, height }));
}

function columnSlots(count, x, y, width, height, gap) {
  const cellHeight = (height - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({ x, y: y + index * (cellHeight + gap), width, height: cellHeight }));
}

function heroSlots(count, x, y, width, height, gap) {
  const heroHeight = count <= 3 ? height * 0.62 : height * 0.58;
  const slots = [{ x, y, width, height: heroHeight }];
  const rest = gridSlots(count - 1, x, y + heroHeight + gap, width, height - heroHeight - gap, gap);
  return slots.concat(rest);
}

function mosaicSlots(count, x, y, width, height, gap) {
  if (count < 3) return gridSlots(count, x, y, width, height, gap);
  const slots = [];
  const topHeight = height * 0.27;
  const sideWidth = width * 0.19;
  slots.push(...rowSlots(Math.min(2, count), x, y, width, topHeight, gap));
  if (count <= 2) return slots;
  slots.push({ x, y: y + topHeight + gap, width: sideWidth, height: height - topHeight - gap });
  if (count <= 3) return slots;
  slots.push({ x: x + sideWidth + gap, y: y + topHeight + gap, width: width - sideWidth - gap, height: height - topHeight - gap });
  if (count <= 4) return slots;
  const bottomHeight = height * 0.15;
  slots[3].height -= bottomHeight + gap;
  slots.push(...rowSlots(count - 4, x + sideWidth + gap, y + height - bottomHeight, width - sideWidth - gap, bottomHeight, gap));
  return slots.slice(0, count);
}

function drawCollageImage(ctx, image, slot, settings) {
  const border = settings.borderMm * PX_PER_MM;
  const radius = settings.radiusMm * PX_PER_MM;
  roundedRect(ctx, slot.x, slot.y, slot.width, slot.height, radius);
  ctx.save();
  ctx.clip();
  const scale = getScale(image.naturalWidth, image.naturalHeight, slot.width, slot.height, settings.fit);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, slot.x + (slot.width - width) / 2, slot.y + (slot.height - height) / 2, width, height);
  ctx.restore();
  if (border > 0) {
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = border;
    roundedRect(ctx, slot.x + border / 2, slot.y + border / 2, slot.width - border, slot.height - border, Math.max(0, radius - border / 2));
    ctx.stroke();
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar una imagen del collage.'));
    image.src = src;
  });
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

function getCollageSheetSize() {
  const c = state.collage;
  const widthMm = c.orientation === 'landscape' ? Math.max(c.sheet.widthMm, c.sheet.heightMm) : Math.min(c.sheet.widthMm, c.sheet.heightMm);
  const heightMm = c.orientation === 'landscape' ? Math.min(c.sheet.widthMm, c.sheet.heightMm) : Math.max(c.sheet.widthMm, c.sheet.heightMm);
  return { width: widthMm * PX_PER_MM, height: heightMm * PX_PER_MM };
}

function selectedLayoutLabel() {
  const id = state.collage.layout === 'auto' ? autoLayout(state.collage.images.length) : state.collage.layout;
  return COLLAGE_LAYOUTS.find((layout) => layout.id === id)?.label || 'Grid';
}

function field(label, control) { return `<label class="field"><span>${label}</span>${control}</label>`; }
function numberField(label, key, value) { return field(label, `<input type="number" min="0" step="0.5" data-setting="${key}" value="${value}" />`); }
function numberFieldCollage(label, key, value) { return field(label, `<input type="number" min="0" step="0.5" data-collage-setting="${key}" value="${value}" />`); }
function switchRow(title, help, key, checked) { return `<label class="switch-row"><span><strong>${title}</strong><small>${help}</small></span><input type="checkbox" data-setting="${key}" ${checked ? 'checked' : ''} /></label>`; }
function segment(title, key, options, value) { return `<div class="segment-block"><strong>${title}</strong><div class="segment">${options.map(([optionValue, label]) => `<button data-segment="${key}" data-value="${optionValue}" class="${value === optionValue ? 'selected' : ''}">${value === optionValue ? '✓ ' : ''}${label}</button>`).join('')}</div></div>`; }
function stat(label, value) { return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`; }
function sheetCard(sheet) { const f = (slot) => slot ? `P${slot}` : 'Blanco'; return `<article class="sheet-card"><strong>Signatura ${sheet.signature} · Hoja ${sheet.sheet}</strong><span>Frente: ${f(sheet.front[0])} | ${f(sheet.front[1])}</span><span>Vuelta: ${f(sheet.back[0])} | ${f(sheet.back[1])}</span></article>`; }
function progressOverlay() { const p = state.progress; return `<div class="overlay"><div class="progress-card"><div class="badge">${state.mode === 'collage' ? '▧' : '📖'}</div><h2>${state.mode === 'collage' ? 'Creando collage' : 'Creando PDF de libro'}</h2><p>${state.mode === 'collage' ? 'Las imágenes se están acomodando en la hoja seleccionada.' : 'Las páginas se están colocando en signaturas y empaquetando para impresión.'}</p><div class="meter-row"><strong>${p.message}</strong><span>${p.percent}%</span></div><div class="meter"><span style="width:${p.percent}%"></span></div></div></div>`; }
function updateSegment(key, value) {
  if (key.startsWith('collage:')) updateCollageValue(key.split(':')[1], value);
  else updateSetting(key, value);
}
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
function updateCollageInput(input) {
  const key = input.dataset.collageSetting;
  const value = input.type === 'number' ? Math.max(0, Number(input.value)) : input.value;
  updateCollageValue(key, value);
}
function updateCollageValue(key, value) {
  if (key === 'sheet') state.collage.sheet = SHEET_FORMATS.find((sheet) => sheet.id === value) || state.collage.sheet;
  else state.collage[key] = value;
  render();
}
function tryBlueprint() { try { state.error = ''; return buildBlueprint(state.source.pageCount, state.settings); } catch (error) { state.error = error.message; return null; } }
function setProgress(message, percent) { state.progress = { message, percent }; render(); }
function setError(message) { state.error = message; }
function mmToPt(value) { return value * PT_PER_MM; }
function safeFileName(value) { return (value || 'book').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-').replace(/^-|-$/g, '') || 'book'; }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
