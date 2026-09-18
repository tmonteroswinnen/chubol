/**
 * Minimal 5x7 pixel glyphs, used for the CHUBOL logo and the values painted on
 * the grass. HUD copy uses regular text; these glyphs exist so the logo and the
 * floor numbers keep a pixel identity instead of turning into a web typeface.
 */

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;

export function glyphRows(character: string): readonly string[] | null {
  return GLYPHS[character.toUpperCase()] ?? null;
}

export interface GlyphStyle {
  /** Size of one glyph pixel, in art pixels. */
  readonly pixel: number;
  readonly fill: string;
  /** Optional lighter colour for the top rows, for a arcade-sign look. */
  readonly highlight?: string;
  readonly outline?: string;
  /** Thickness of the outline, in art pixels. */
  readonly outlineWidth?: number;
}

/** Width in art pixels of a string drawn with `style`, including letter spacing. */
export function measureText(text: string, style: GlyphStyle, letterSpacing = 1): number {
  if (text.length === 0) return 0;
  return text.length * (GLYPH_WIDTH + letterSpacing) * style.pixel - letterSpacing * style.pixel;
}

/** Draws `text` with its left edge at x and its top edge at y, in art pixels. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: GlyphStyle,
  letterSpacing = 1,
): void {
  const p = style.pixel;
  const outlineWidth = style.outline !== undefined ? (style.outlineWidth ?? 1) * p : 0;

  const cells: Array<{ cx: number; cy: number; row: number }> = [];
  let cursor = x;
  for (const character of text) {
    const rows = glyphRows(character);
    if (rows === null) {
      cursor += (GLYPH_WIDTH + letterSpacing) * p;
      continue;
    }
    rows.forEach((rowBits, rowIndex) => {
      for (let col = 0; col < rowBits.length; col += 1) {
        if (rowBits[col] !== '1') continue;
        cells.push({ cx: cursor + col * p, cy: y + rowIndex * p, row: rowIndex });
      }
    });
    cursor += (GLYPH_WIDTH + letterSpacing) * p;
  }

  if (outlineWidth > 0 && style.outline !== undefined) {
    ctx.fillStyle = style.outline;
    for (const cell of cells) {
      ctx.fillRect(
        Math.round(cell.cx - outlineWidth),
        Math.round(cell.cy - outlineWidth),
        Math.round(p + outlineWidth * 2),
        Math.round(p + outlineWidth * 2),
      );
    }
  }

  for (const cell of cells) {
    const top = style.highlight !== undefined && cell.row < 3;
    ctx.fillStyle = top ? style.highlight! : style.fill;
    ctx.fillRect(Math.round(cell.cx), Math.round(cell.cy), Math.round(p), Math.round(p));
  }
}
