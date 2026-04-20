/**
 * Converts a hex color string to HSL triple values.
 * Format: "H S% L%" (no hsl() wrapper, as used in CSS variables for Tailwind)
 */
export const hexToHSLVariables = (hex: string): string => {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/**
 * Converts HSL triple values back to Hex for the color picker.
 */
export const hslVariablesToHex = (hslVars: string): string => {
  const parts = hslVars.split(" ");
  if (parts.length !== 3) return "#000000";

  let h = parseInt(parts[0]) / 360;
  let s = parseInt(parts[1]) / 100;
  let l = parseInt(parts[2]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
/**
 * Adjusts the lightness of an HSL variable string.
 * @param hslVars "H S% L%"
 * @param amount Number between -100 and 100
 */
export const adjustLightness = (hslVars: string, amount: number): string => {
  const parts = hslVars.split(" ");
  if (parts.length !== 3) return hslVars;

  let h = parts[0];
  let s = parts[1];
  let l = parseInt(parts[2]);

  l = Math.max(0, Math.min(100, l + amount));

  return `${h} ${s} ${l}%`;
};

/**
 * Gets the lightness value from an HSL variable string.
 */
export const getLightness = (hslVars: string): number => {
  const parts = hslVars.split(" ");
  if (parts.length !== 3) return 50;
  return parseInt(parts[2]) || 50;
};
