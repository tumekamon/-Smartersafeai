/**
 * Pure color math — no server/client restriction, used both when injecting the
 * brand CSS variables server-side and for the live dark-mode preview swatch in
 * the branding settings form.
 */

type Hsl = { h: number; s: number; l: number };

export function hexToHsl(hex: string): Hsl {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { h: 220, s: 80, l: 55 };
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Given a brand color chosen against a light surface, derive a variant that
 * stays legible and vivid against the app's near-black dark surface — the
 * same "lighter, slightly less saturated" move used for the fixed ai/status
 * token pairs in globals.css, generalized to an arbitrary hue.
 */
export function deriveDarkBrand(lightHex: string): string {
  const { h, s, l } = hexToHsl(lightHex);
  const targetL = Math.min(80, Math.max(60, l + (100 - l) * 0.4));
  const targetS = Math.max(35, s * 0.92);
  return hslToHex({ h, s: targetS, l: targetL });
}

/** CSS custom properties for the .tenant-theme wrapper — see globals.css for how these resolve. */
export function brandVars(primaryColor: string): Record<string, string> {
  return {
    "--brand-light": primaryColor,
    "--brand-dark": deriveDarkBrand(primaryColor),
  };
}
