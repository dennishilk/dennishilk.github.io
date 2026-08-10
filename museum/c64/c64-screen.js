(function (root, factory) {
  "use strict";
  root.C64Screen = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const PALETTE = [
    "#000000", "#ffffff", "#813338", "#75cec8",
    "#8e3c97", "#56ac4d", "#2e2c9b", "#edf171",
    "#8e5029", "#553800", "#c46c71", "#4a4a4a",
    "#7b7b7b", "#a9ff9f", "#706deb", "#b2b2b2"
  ];

  function screenCharacter(code) {
    code &= 127;
    if (code === 0) return "@";
    if (code >= 1 && code <= 26) return String.fromCharCode(64 + code);
    if (code >= 32 && code <= 63) return String.fromCharCode(code);
    if (code >= 27 && code <= 31) return String.fromCharCode(64 + code);
    if (code === 94) return "↑";
    if (code === 95) return "←";
    return "·";
  }

  class Renderer {
    constructor(canvas, options) {
      options = options || {};
      this.canvas = canvas;
      this.context = canvas.getContext("2d", { alpha: false });
      this.description = options.description || null;
      this.screenText = options.screenText || null;
      this.snapshot = null;
      this.context.imageSmoothingEnabled = false;
    }

    render(snapshot) {
      if (!snapshot) return;
      this.snapshot = snapshot;
      const context = this.context;
      const activeX = 32;
      const activeY = 36;
      context.save();
      context.imageSmoothingEnabled = false;
      context.fillStyle = PALETTE[snapshot.border & 15];
      context.fillRect(0, 0, 384, 272);
      context.fillStyle = PALETTE[snapshot.background & 15];
      context.fillRect(activeX, activeY, 320, 200);
      context.textBaseline = "top";
      context.textAlign = "left";
      context.font = "9px monospace";

      for (let index = 0; index < 1000; index += 1) {
        const x = activeX + (index % 40) * 8;
        const y = activeY + Math.floor(index / 40) * 8;
        const code = snapshot.screen[index] || 32;
        const color = PALETTE[(snapshot.colors[index] || 0) & 15];
        const reverse = Boolean(code & 128);
        if (reverse) {
          context.fillStyle = color;
          context.fillRect(x, y, 8, 8);
          context.fillStyle = PALETTE[snapshot.background & 15];
        } else {
          context.fillStyle = color;
        }
        const character = screenCharacter(code);
        if (character !== " ") context.fillText(character, x, y - 1);
      }

      context.save();
      context.beginPath();
      context.rect(activeX, activeY, 320, 200);
      context.clip();
      (snapshot.sprites || []).forEach(function (sprite) {
        if (!sprite.enabled) return;
        const originX = activeX + sprite.x - 24;
        const originY = activeY + sprite.y - 50;
        context.fillStyle = PALETTE[sprite.color & 15];
        for (let row = 0; row < 21; row += 1) {
          for (let byte = 0; byte < 3; byte += 1) {
            const value = sprite.data[row * 3 + byte] || 0;
            for (let bit = 0; bit < 8; bit += 1) {
              if (value & (128 >> bit)) context.fillRect(originX + byte * 8 + bit, originY + row, 1, 1);
            }
          }
        }
      });
      context.restore();

      if (snapshot.cursor >= 0 && snapshot.cursor < 1000) {
        const cursorX = activeX + (snapshot.cursor % 40) * 8;
        const cursorY = activeY + Math.floor(snapshot.cursor / 40) * 8;
        context.fillStyle = PALETTE[snapshot.textColor & 15];
        context.fillRect(cursorX, cursorY + 7, 7, 1);
      }
      context.restore();

      const description = snapshot.description || "C64 teaching display.";
      this.canvas.setAttribute("aria-label", description);
      if (this.description) this.description.textContent = description;
      if (this.screenText) this.screenText.textContent = snapshot.transcript || "";
    }
  }

  return { Renderer: Renderer, PALETTE: PALETTE, screenCharacter: screenCharacter };
});
