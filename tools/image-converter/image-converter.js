(() => {
  "use strict";

  const lang = document.documentElement.lang === "de" ? "de" : "en";
  const t = {
    en: {
      unsupported: "This file type is not supported here: {name}",
      added: "{count} image(s) ready.",
      noFiles: "Choose at least one image first.",
      processing: "Converting {current} of {total}: {name}",
      done: "Done. {count} image(s) converted locally in your browser.",
      partial: "Finished with {ok} successful conversion(s) and {failed} error(s).",
      cleared: "Queue cleared.",
      failed: "Could not convert this image.",
      decodeFailed: "Your browser could not decode this image.",
      encodeFailed: "Your browser could not create the selected output format.",
      outputUnsupported: "{format} output is not supported by this browser.",
      original: "Original",
      converted: "Converted",
      dimensions: "{w}×{h}px",
      smaller: "{value}% smaller",
      larger: "{value}% larger",
      same: "same size",
      download: "Download",
      multipleDownloads: "Your browser may ask you to allow multiple downloads.",
      emptyResults: "No successful conversions to download."
    },
    de: {
      unsupported: "Dieser Dateityp wird hier nicht unterstützt: {name}",
      added: "{count} Bild(er) bereit.",
      noFiles: "Wähle zuerst mindestens ein Bild aus.",
      processing: "Konvertiere {current} von {total}: {name}",
      done: "Fertig. {count} Bild(er) wurden lokal in deinem Browser konvertiert.",
      partial: "Fertig mit {ok} erfolgreicher(n) Konvertierung(en) und {failed} Fehler(n).",
      cleared: "Warteschlange geleert.",
      failed: "Dieses Bild konnte nicht konvertiert werden.",
      decodeFailed: "Dein Browser konnte dieses Bild nicht dekodieren.",
      encodeFailed: "Dein Browser konnte das gewählte Ausgabeformat nicht erzeugen.",
      outputUnsupported: "{format}-Ausgabe wird von diesem Browser nicht unterstützt.",
      original: "Original",
      converted: "Neu",
      dimensions: "{w}×{h}px",
      smaller: "{value}% kleiner",
      larger: "{value}% größer",
      same: "gleiche Größe",
      download: "Herunterladen",
      multipleDownloads: "Dein Browser kann nach einer Freigabe für mehrere Downloads fragen.",
      emptyResults: "Keine erfolgreichen Konvertierungen zum Herunterladen."
    }
  }[lang];

  const $ = (id) => document.getElementById(id);
  const fileInput = $("file-input");
  const dropZone = $("drop-zone");
  const queue = $("queue");
  const fileList = $("file-list");
  const queueCount = $("queue-count");
  const format = $("output-format");
  const quality = $("quality");
  const qualityValue = $("quality-value");
  const maxWidth = $("max-width");
  const maxHeight = $("max-height");
  const noUpscale = $("no-upscale");
  const convertButton = $("convert");
  const clearButton = $("clear");
  const downloadAllButton = $("download-all");
  const results = $("results");
  const resultList = $("result-list");
  const resultCount = $("result-count");
  const statusLine = $("status-line");

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  let files = [];
  let outputs = [];
  let busy = false;

  function msg(template, values = {}) {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }

  function setStatus(text) {
    statusLine.textContent = text;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
    return value.toFixed(digits) + " " + units[unit];
  }

  function outputExtension(mime) {
    return mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  }

  function cleanBaseName(name) {
    const base = name.replace(/\.[^/.]+$/, "").trim() || "converted-image";
    return base.replace(/[\\/:*?"<>|]+/g, "-");
  }

  function revokeOutputs() {
    outputs.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    outputs = [];
  }

  function renderQueue() {
    queue.hidden = files.length === 0;
    queueCount.textContent = String(files.length);
    fileList.replaceChildren();

    files.forEach((item) => {
      const row = document.createElement("div");
      row.className = "file-row";

      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = item.file.name;

      const meta = document.createElement("span");
      meta.className = "file-meta";
      meta.textContent = formatBytes(item.file.size);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-file";
      remove.setAttribute("aria-label", lang === "de" ? "Bild entfernen" : "Remove image");
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        if (busy) return;
        files = files.filter((candidate) => candidate.id !== item.id);
        renderQueue();
        setStatus(files.length ? msg(t.added, { count: files.length }) : "");
        updateButtons();
      });

      row.append(name, meta, remove);
      fileList.append(row);
    });
  }

  function addFiles(list) {
    if (busy) return;
    let accepted = 0;
    for (const file of Array.from(list || [])) {
      if (!allowedTypes.has(file.type)) {
        setStatus(msg(t.unsupported, { name: file.name }));
        continue;
      }
      files.push({
        id: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random()),
        file
      });
      accepted += 1;
    }
    if (accepted) setStatus(msg(t.added, { count: files.length }));
    renderQueue();
    updateButtons();
    fileInput.value = "";
  }

  function updateQualityState() {
    const png = format.value === "image/png";
    quality.disabled = png;
    qualityValue.textContent = png ? "—" : Math.round(Number(quality.value) * 100) + "%";
  }

  function updateButtons() {
    convertButton.disabled = busy || files.length === 0;
    clearButton.disabled = busy || (files.length === 0 && outputs.length === 0);
    downloadAllButton.disabled = busy || outputs.filter((item) => item.ok).length === 0;
    fileInput.disabled = busy;
    format.disabled = busy;
    quality.disabled = busy || format.value === "image/png";
    maxWidth.disabled = busy;
    maxHeight.disabled = busy;
    noUpscale.disabled = busy;
  }

  function parseDimension(input) {
    const n = Number.parseInt(input.value, 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 16384) : null;
  }

  function targetSize(width, height) {
    const limitW = parseDimension(maxWidth);
    const limitH = parseDimension(maxHeight);
    if (!limitW && !limitH) return { width, height };

    const scaleW = limitW ? limitW / width : Infinity;
    const scaleH = limitH ? limitH / height : Infinity;
    let scale = Math.min(scaleW, scaleH);

    if (!Number.isFinite(scale)) scale = 1;
    if (noUpscale.checked) scale = Math.min(scale, 1);
    if (scale <= 0) scale = 1;

    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  async function decode(file) {
    if ("createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close()
        };
      } catch (_) {
        // Fall through to HTMLImageElement for browsers with partial createImageBitmap support.
      }
    }

    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      if (image.decode) {
        await image.decode();
      } else {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      }
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(url)
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw new Error("decode");
    }
  }

  function canvasBlob(canvas, mime, qualityValueNumber) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob || blob.type !== mime) {
          reject(new Error("encode"));
          return;
        }
        resolve(blob);
      }, mime, qualityValueNumber);
    });
  }

  async function convertOne(file) {
    let decoded;
    try {
      decoded = await decode(file);
    } catch (_) {
      throw new Error("decode");
    }

    try {
      const size = targetSize(decoded.width, decoded.height);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;

      const ctx = canvas.getContext("2d", { alpha: format.value !== "image/jpeg" });
      if (!ctx) throw new Error("canvas");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (format.value === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size.width, size.height);
      }

      ctx.drawImage(decoded.source, 0, 0, size.width, size.height);
      const q = Number(quality.value);
      const blob = await canvasBlob(canvas, format.value, Number.isFinite(q) ? q : 0.82);

      return { blob, width: size.width, height: size.height };
    } finally {
      if (decoded && decoded.close) decoded.close();
    }
  }

  function savingsText(inputBytes, outputBytes) {
    if (!inputBytes) return { text: t.same, className: "" };
    const delta = ((inputBytes - outputBytes) / inputBytes) * 100;
    if (Math.abs(delta) < 0.05) return { text: t.same, className: "" };
    if (delta > 0) {
      return { text: msg(t.smaller, { value: Math.abs(delta).toFixed(1) }), className: "good" };
    }
    return { text: msg(t.larger, { value: Math.abs(delta).toFixed(1) }), className: "bad" };
  }

  function renderResults() {
    results.hidden = outputs.length === 0;
    resultCount.textContent = String(outputs.length);
    resultList.replaceChildren();

    outputs.forEach((item) => {
      const card = document.createElement("div");
      card.className = "result-card" + (item.ok ? "" : " result-error");

      if (!item.ok) {
        const spacer = document.createElement("div");
        const main = document.createElement("div");
        main.className = "result-main";
        const title = document.createElement("strong");
        title.textContent = item.input.name;
        const detail = document.createElement("div");
        detail.className = "result-details";
        detail.textContent = item.reason;
        main.append(title, detail);
        card.append(spacer, main);
        resultList.append(card);
        return;
      }

      const preview = document.createElement("img");
      preview.className = "result-preview";
      preview.src = item.url;
      preview.alt = "";

      const main = document.createElement("div");
      main.className = "result-main";

      const title = document.createElement("strong");
      title.textContent = item.name;

      const sizeInfo = savingsText(item.input.size, item.blob.size);
      const detail = document.createElement("div");
      detail.className = "result-details";
      detail.append(
        document.createTextNode(
          msg(t.original, {}) + ": " + formatBytes(item.input.size) +
          " · " + msg(t.converted, {}) + ": " + formatBytes(item.blob.size) +
          " · " + msg(t.dimensions, { w: item.width, h: item.height }) + " · "
        )
      );
      const saving = document.createElement("span");
      saving.className = "saving " + sizeInfo.className;
      saving.textContent = sizeInfo.text;
      detail.append(saving);

      main.append(title, detail);

      const link = document.createElement("a");
      link.className = "download-link";
      link.href = item.url;
      link.download = item.name;
      link.textContent = t.download;

      card.append(preview, main, link);
      resultList.append(card);
    });
  }

  async function runConversion() {
    if (busy) return;
    if (!files.length) {
      setStatus(t.noFiles);
      return;
    }

    busy = true;
    revokeOutputs();
    resultList.replaceChildren();
    results.hidden = true;
    updateButtons();

    const mime = format.value;
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i += 1) {
      const entry = files[i];
      setStatus(msg(t.processing, {
        current: i + 1,
        total: files.length,
        name: entry.file.name
      }));

      try {
        const converted = await convertOne(entry.file);
        const ext = outputExtension(mime);
        const name = cleanBaseName(entry.file.name) + "." + ext;
        const url = URL.createObjectURL(converted.blob);
        outputs.push({
          ok: true,
          input: entry.file,
          blob: converted.blob,
          url,
          name,
          width: converted.width,
          height: converted.height
        });
        ok += 1;
      } catch (error) {
        const reason = error && error.message === "decode" ? t.decodeFailed :
          error && error.message === "encode" ? t.encodeFailed : t.failed;
        outputs.push({ ok: false, input: entry.file, reason });
        failed += 1;
      }
      renderResults();
    }

    busy = false;
    if (failed) {
      setStatus(msg(t.partial, { ok, failed }));
    } else {
      setStatus(msg(t.done, { count: ok }));
    }
    updateButtons();
  }

  function clearAll() {
    if (busy) return;
    files = [];
    revokeOutputs();
    fileList.replaceChildren();
    resultList.replaceChildren();
    queue.hidden = true;
    results.hidden = true;
    setStatus(t.cleared);
    updateButtons();
  }

  function downloadAll() {
    const successful = outputs.filter((item) => item.ok);
    if (!successful.length) {
      setStatus(t.emptyResults);
      return;
    }
    setStatus(t.multipleDownloads);
    successful.forEach((item, index) => {
      window.setTimeout(() => {
        const a = document.createElement("a");
        a.href = item.url;
        a.download = item.name;
        document.body.append(a);
        a.click();
        a.remove();
      }, index * 180);
    });
  }

  async function canEncode(mime) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    try {
      const blob = await canvasBlob(canvas, mime, 0.8);
      return blob.type === mime;
    } catch (_) {
      return false;
    }
  }

  async function detectOutputSupport() {
    for (const option of Array.from(format.options)) {
      const supported = await canEncode(option.value);
      option.disabled = !supported;
      if (!supported) option.textContent += " (" + (lang === "de" ? "nicht unterstützt" : "unsupported") + ")";
    }

    const selected = format.selectedOptions[0];
    if (selected && selected.disabled) {
      const fallback = Array.from(format.options).find((option) => !option.disabled);
      if (fallback) format.value = fallback.value;
    }
    updateQualityState();
    updateButtons();
  }

  fileInput.addEventListener("change", (event) => addFiles(event.target.files));

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (!busy) dropZone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    if (!busy) addFiles(event.dataTransfer.files);
  });

  quality.addEventListener("input", updateQualityState);
  format.addEventListener("change", () => {
    updateQualityState();
    updateButtons();
  });
  convertButton.addEventListener("click", runConversion);
  clearButton.addEventListener("click", clearAll);
  downloadAllButton.addEventListener("click", downloadAll);

  window.addEventListener("beforeunload", revokeOutputs);

  new Function(jsSyntaxSentinel = "return true;");
  updateQualityState();
  updateButtons();
  detectOutputSupport();
})();