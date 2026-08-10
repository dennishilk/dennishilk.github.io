(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.C64MachineModel = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const ADDRESSES = Object.freeze({
    SCREEN_START: 1024,
    SCREEN_END: 2023,
    SPRITE_POINTERS: 2040,
    SPRITE_X_MSB: 53264,
    SPRITE_ENABLE: 53269,
    BORDER: 53280,
    BACKGROUND: 53281,
    SPRITE_COLOR_START: 53287,
    COLOR_START: 55296,
    COLOR_END: 56295,
    SID_START: 54272,
    SID_END: 54296,
    SID_VOLUME: 54296
  });

  const COLORS = Object.freeze([
    "#000000", "#ffffff", "#813338", "#75cec8",
    "#8e3c97", "#56ac4d", "#2e2c9b", "#edf171",
    "#8e5029", "#553800", "#c46c71", "#4a4a4a",
    "#7b7b7b", "#a9ff9f", "#706deb", "#b2b2b2"
  ]);

  const COLOR_NAMES = Object.freeze([
    "black", "white", "red", "cyan", "purple", "green", "blue", "yellow",
    "orange", "brown", "light red", "dark gray", "gray", "light green",
    "light blue", "light gray"
  ]);

  const CONTROL_COLORS = Object.freeze({
    5: 1,
    28: 2,
    30: 5,
    31: 6,
    129: 8,
    144: 0,
    149: 9,
    150: 10,
    151: 11,
    152: 12,
    153: 13,
    154: 14,
    155: 15,
    156: 4,
    158: 7,
    159: 3
  });

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.trunc(Number(value) || 0)));
  }

  function petsciiToScreen(code) {
    code = clampByte(code);
    if (code >= 65 && code <= 90) return code - 64;
    if (code >= 97 && code <= 122) return code - 96;
    if (code === 64) return 0;
    if (code >= 32 && code <= 63) return code;
    if (code >= 91 && code <= 95) return code - 64;
    if (code >= 160 && code <= 191) return code - 128;
    return code & 127;
  }

  function screenToText(code) {
    code = clampByte(code) & 127;
    if (code === 0) return "@";
    if (code >= 1 && code <= 26) return String.fromCharCode(64 + code);
    if (code >= 32 && code <= 63) return String.fromCharCode(code);
    if (code >= 27 && code <= 31) return String.fromCharCode(64 + code);
    if (code === 94) return "↑";
    if (code === 95) return "←";
    return "·";
  }

  class C64Machine {
    constructor(options) {
      options = options || {};
      this.onEvent = typeof options.onEvent === "function" ? options.onEvent : function () {};
      this.memory = new Uint8Array(65536);
      this.screen = new Uint8Array(1000);
      this.colors = new Uint8Array(1000);
      this.cursor = 0;
      this.textColor = 14;
      this.reverse = false;
      this.dirty = true;
      this.reset();
    }

    emit(event) {
      this.onEvent(event);
    }

    reset() {
      this.memory.fill(0);
      this.screen.fill(32);
      this.colors.fill(14);
      this.cursor = 0;
      this.textColor = 14;
      this.reverse = false;
      this.memory[ADDRESSES.BORDER] = 14;
      this.memory[ADDRESSES.BACKGROUND] = 6;
      this.memory[ADDRESSES.SPRITE_ENABLE] = 0;
      for (let index = 0; index < 1000; index += 1) {
        this.memory[ADDRESSES.SCREEN_START + index] = 32;
        this.memory[ADDRESSES.COLOR_START + index] = 14;
      }
      this.dirty = true;
      this.emit({ type: "machine", action: "reset" });
    }

    clearScreen() {
      this.screen.fill(32);
      this.cursor = 0;
      for (let index = 0; index < 1000; index += 1) {
        this.memory[ADDRESSES.SCREEN_START + index] = 32;
      }
      this.dirty = true;
      this.emit({ type: "screen", action: "clear" });
    }

    home() {
      this.cursor = 0;
      this.dirty = true;
      this.emit({ type: "screen", action: "home" });
    }

    newline() {
      const row = Math.floor(this.cursor / 40);
      this.cursor = (row + 1) * 40;
      if (this.cursor >= 1000) this.scroll();
      this.dirty = true;
    }

    scroll() {
      this.screen.copyWithin(0, 40);
      this.colors.copyWithin(0, 40);
      this.screen.fill(32, 960);
      this.colors.fill(this.textColor, 960);
      for (let index = 0; index < 1000; index += 1) {
        this.memory[ADDRESSES.SCREEN_START + index] = this.screen[index];
        this.memory[ADDRESSES.COLOR_START + index] = this.colors[index];
      }
      this.cursor = 960;
      this.emit({ type: "screen", action: "scroll" });
    }

    writeCharacter(character) {
      const code = character.charCodeAt(0) & 255;
      if (Object.prototype.hasOwnProperty.call(CONTROL_COLORS, code)) {
        this.textColor = CONTROL_COLORS[code];
        this.emit({ type: "screen", action: "text-color", value: this.textColor });
        return;
      }
      if (code === 13 || code === 10) {
        this.newline();
        return;
      }
      if (code === 147) {
        this.clearScreen();
        return;
      }
      if (code === 19) {
        this.home();
        return;
      }
      if (code === 18) {
        this.reverse = true;
        this.emit({ type: "screen", action: "reverse", value: true });
        return;
      }
      if (code === 146) {
        this.reverse = false;
        this.emit({ type: "screen", action: "reverse", value: false });
        return;
      }
      if (code === 157) {
        this.cursor = Math.max(0, this.cursor - 1);
        this.dirty = true;
        return;
      }
      if (code === 29) {
        this.cursor = Math.min(999, this.cursor + 1);
        this.dirty = true;
        return;
      }
      if (code === 145) {
        this.cursor = Math.max(0, this.cursor - 40);
        this.dirty = true;
        return;
      }
      if (code === 17) {
        this.cursor = Math.min(999, this.cursor + 40);
        this.dirty = true;
        return;
      }

      if (this.cursor >= 1000) this.scroll();
      let screenCode = petsciiToScreen(code);
      if (this.reverse) screenCode |= 128;
      this.screen[this.cursor] = screenCode;
      this.colors[this.cursor] = this.textColor;
      this.memory[ADDRESSES.SCREEN_START + this.cursor] = screenCode;
      this.memory[ADDRESSES.COLOR_START + this.cursor] = this.textColor;
      this.cursor += 1;
      if (this.cursor >= 1000) this.scroll();
      this.dirty = true;
    }

    writeText(value, options) {
      options = options || {};
      const text = String(value == null ? "" : value);
      for (const character of text) this.writeCharacter(character);
      if (options.newline !== false) this.newline();
      this.emit({ type: "output", text: text, newline: options.newline !== false });
    }

    peek(address) {
      return this.memory[address];
    }

    poke(address, value) {
      address = Math.trunc(address);
      value = Math.trunc(value);
      this.memory[address] = value;

      if (address >= ADDRESSES.SCREEN_START && address <= ADDRESSES.SCREEN_END) {
        this.screen[address - ADDRESSES.SCREEN_START] = value;
        this.dirty = true;
      }
      if (address >= ADDRESSES.COLOR_START && address <= ADDRESSES.COLOR_END) {
        const color = value & 15;
        this.colors[address - ADDRESSES.COLOR_START] = color;
        this.memory[address] = color;
        value = color;
        this.dirty = true;
      }
      if (
        address === ADDRESSES.BORDER ||
        address === ADDRESSES.BACKGROUND ||
        address === ADDRESSES.SPRITE_X_MSB ||
        address === ADDRESSES.SPRITE_ENABLE ||
        (address >= 53248 && address <= 53263) ||
        (address >= ADDRESSES.SPRITE_COLOR_START && address <= ADDRESSES.SPRITE_COLOR_START + 7) ||
        (address >= ADDRESSES.SPRITE_POINTERS && address <= ADDRESSES.SPRITE_POINTERS + 7)
      ) {
        this.dirty = true;
      }

      const event = { type: "memory", address: address, value: value };
      this.emit(event);
      if (address >= ADDRESSES.SID_START && address <= ADDRESSES.SID_END) {
        this.emit({ type: "audio", address: address, value: value });
      }
      return value;
    }

    getSprites() {
      const enabled = this.memory[ADDRESSES.SPRITE_ENABLE];
      const highX = this.memory[ADDRESSES.SPRITE_X_MSB];
      const sprites = [];
      for (let index = 0; index < 8; index += 1) {
        const pointer = this.memory[ADDRESSES.SPRITE_POINTERS + index];
        const start = pointer * 64;
        sprites.push({
          index: index,
          enabled: Boolean(enabled & (1 << index)),
          x: this.memory[53248 + index * 2] + ((highX & (1 << index)) ? 256 : 0),
          y: this.memory[53249 + index * 2],
          color: this.memory[ADDRESSES.SPRITE_COLOR_START + index] & 15,
          pointer: pointer,
          data: Array.from(this.memory.slice(start, start + 63))
        });
      }
      return sprites;
    }

    screenText() {
      const lines = [];
      for (let row = 0; row < 25; row += 1) {
        let line = "";
        for (let column = 0; column < 40; column += 1) {
          line += screenToText(this.screen[row * 40 + column] & 127);
        }
        lines.push(line.replace(/\s+$/g, ""));
      }
      return lines.join("\n").replace(/\s+$/g, "");
    }

    describe() {
      const sprites = this.getSprites().filter(function (sprite) { return sprite.enabled; });
      const occupied = Array.from(this.screen).filter(function (code) { return (code & 127) !== 32; }).length;
      const parts = [
        "C64 teaching display with " + occupied + " non-blank character cells",
        "border " + COLOR_NAMES[this.memory[ADDRESSES.BORDER] & 15],
        "background " + COLOR_NAMES[this.memory[ADDRESSES.BACKGROUND] & 15]
      ];
      if (sprites.length) {
        parts.push(sprites.map(function (sprite) {
          return "sprite " + (sprite.index + 1) + " " + COLOR_NAMES[sprite.color] +
            " at x " + sprite.x + ", y " + sprite.y;
        }).join("; "));
      } else {
        parts.push("no enabled sprites");
      }
      return parts.join(", ") + ".";
    }

    snapshot() {
      this.dirty = false;
      return {
        screen: Array.from(this.screen),
        colors: Array.from(this.colors),
        border: this.memory[ADDRESSES.BORDER] & 15,
        background: this.memory[ADDRESSES.BACKGROUND] & 15,
        cursor: this.cursor,
        textColor: this.textColor,
        reverse: this.reverse,
        sprites: this.getSprites(),
        description: this.describe(),
        transcript: this.screenText()
      };
    }
  }

  return {
    C64Machine: C64Machine,
    ADDRESSES: ADDRESSES,
    COLORS: COLORS,
    COLOR_NAMES: COLOR_NAMES,
    petsciiToScreen: petsciiToScreen,
    screenToText: screenToText
  };
});
