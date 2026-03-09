#!/usr/bin/env node
/**
 * Generate Idle app icons with enlarged mark.
 *
 * The mark (chevron >| between two horizontal bars) is scaled to fill
 * ~65-70% of the iOS safe zone (~80% of canvas), so effectively ~55%
 * of the full 1024x1024 canvas.
 *
 * Uses sharp to render SVG → PNG at exact pixel dimensions.
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'packages', 'idle-app', 'sources', 'assets', 'images');

// ── Colors ──────────────────────────────────────────────────────────
const GREEN = '#4ADE80';
const DARK_BG = '#0A0A0A';

// Bar opacity differs by background type:
//   dark bg  → 0.4 (hex 66 = 40%)
//   transparent → 0.27 (hex 44 = 27%)
const BAR_OPACITY_DARK = 0.4;
const BAR_OPACITY_TRANSPARENT = 0.27;

// ── Mark geometry (designed in a 1024x1024 coordinate space) ────────
// The mark should fill ~70% of the iOS safe zone.
// iOS safe zone ≈ inner 80% of canvas = 820px.
// Target mark size: 820 * 0.70 ≈ 574px.
// We'll design the mark in a local coordinate system and then position
// it centered on the canvas.

/**
 * Build SVG for the Idle mark (two bars + chevron + cursor).
 *
 * @param {number} size       Canvas size in px (e.g. 1024, 96, 48)
 * @param {object} opts
 * @param {string} [opts.bg]  Background color (omit for transparent)
 * @param {number} opts.barOpacity  Opacity for the bars
 * @param {string} opts.markColor   Color of chevron + cursor
 * @param {string} opts.barColor    Color of bars (before opacity)
 * @param {number} [opts.bgRadius]  Corner radius for bg rect
 */
function buildSvg(size, opts) {
  const {
    bg,
    barOpacity,
    markColor,
    barColor,
    bgRadius = 0,
  } = opts;

  // Mark dimensions as fraction of canvas
  // The mark occupies a rectangle centered on the canvas.
  // Width and height are tuned so the mark fills ~70% of safe zone.
  const safeZone = size * 0.80;    // iOS safe zone
  const markW = safeZone * 0.72;   // mark width  ≈ 590px at 1024
  const markH = safeZone * 0.62;   // mark height ≈ 508px at 1024

  // Center the mark
  const mx = (size - markW) / 2;   // mark left x
  const my = (size - markH) / 2;   // mark top y

  // Bar geometry
  const barH = markH * 0.055;       // bar thickness ≈ 28px at 1024
  const barR = barH / 2;           // fully rounded caps

  // Top bar: at top of mark rect
  const topBarY = my;
  // Bottom bar: at bottom of mark rect
  const botBarY = my + markH - barH;

  // The chevron + cursor sit vertically between the bars
  const innerTop = topBarY + barH + markH * 0.06;   // small gap below top bar
  const innerBot = botBarY - markH * 0.06;           // small gap above bottom bar
  const innerH = innerBot - innerTop;
  const innerCenterY = (innerTop + innerBot) / 2;

  // Chevron: occupies left ~55% of mark width, vertically fills inner area
  const chevW = markW * 0.42;
  const chevH = innerH * 0.72;
  const chevStroke = markW * 0.09;   // stroke weight
  const chevLeft = mx + markW * 0.12;
  const chevRight = chevLeft + chevW;
  const chevTop = innerCenterY - chevH / 2;
  const chevBot = innerCenterY + chevH / 2;
  const chevMidX = chevRight;
  const chevMidY = innerCenterY;

  // Cursor: vertical bar to the right of chevron
  const cursorW = markW * 0.10;
  const cursorH = innerH * 0.60;
  const cursorR = cursorW / 2;      // fully rounded
  const cursorX = chevRight + markW * 0.08;
  const cursorY = innerCenterY - cursorH / 2;

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  // Background
  if (bg) {
    if (bgRadius > 0) {
      svg += `<rect width="${size}" height="${size}" rx="${bgRadius}" fill="${bg}"/>`;
    } else {
      svg += `<rect width="${size}" height="${size}" fill="${bg}"/>`;
    }
  }

  // Top bar
  svg += `<rect x="${mx}" y="${topBarY}" width="${markW}" height="${barH}" rx="${barR}" fill="${barColor}" opacity="${barOpacity}"/>`;

  // Bottom bar
  svg += `<rect x="${mx}" y="${botBarY}" width="${markW}" height="${barH}" rx="${barR}" fill="${barColor}" opacity="${barOpacity}"/>`;

  // Chevron (>) — two strokes meeting at a point on the right
  // Using a polyline-style path with round line joins
  svg += `<path d="M${chevLeft},${chevTop} L${chevMidX},${chevMidY} L${chevLeft},${chevBot}" ` +
         `fill="none" stroke="${markColor}" stroke-width="${chevStroke}" ` +
         `stroke-linecap="round" stroke-linejoin="round"/>`;

  // Cursor (|) — rounded rect
  svg += `<rect x="${cursorX}" y="${cursorY}" width="${cursorW}" height="${cursorH}" rx="${cursorR}" fill="${markColor}"/>`;

  svg += `</svg>`;
  return svg;
}

// ── Generate all icons ──────────────────────────────────────────────

async function generate() {
  console.log('Generating enlarged app icons...\n');

  const icons = [
    {
      name: 'icon.png',
      size: 1024,
      bg: DARK_BG,
      barOpacity: BAR_OPACITY_DARK,
      markColor: GREEN,
      barColor: GREEN,
      bgRadius: 0,  // iOS masks corners itself; full-bleed bg
    },
    {
      name: 'icon-adaptive.png',
      size: 1024,
      bg: null,  // transparent
      barOpacity: BAR_OPACITY_TRANSPARENT,
      markColor: GREEN,
      barColor: GREEN,
    },
    {
      name: 'icon-monochrome.png',
      size: 1024,
      bg: null,  // transparent
      barOpacity: BAR_OPACITY_TRANSPARENT,
      markColor: GREEN,
      barColor: GREEN,
    },
    {
      name: 'icon-notification.png',
      size: 96,
      bg: null,
      barOpacity: BAR_OPACITY_TRANSPARENT,
      markColor: GREEN,
      barColor: GREEN,
    },
    {
      name: 'favicon.png',
      size: 48,
      bg: DARK_BG,
      barOpacity: BAR_OPACITY_DARK,
      markColor: GREEN,
      barColor: GREEN,
    },
  ];

  for (const icon of icons) {
    const svg = buildSvg(icon.size, {
      bg: icon.bg,
      barOpacity: icon.barOpacity,
      markColor: icon.markColor,
      barColor: icon.barColor,
      bgRadius: icon.bgRadius || 0,
    });

    const outPath = join(ASSETS_DIR, icon.name);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outPath);

    // Verify
    const meta = await sharp(outPath).metadata();
    console.log(`  ${icon.name}: ${meta.width}x${meta.height}, ${meta.hasAlpha ? 'RGBA' : 'RGB'}`);
  }

  console.log('\nDone. All icons written to packages/idle-app/sources/assets/images/');
}

generate().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
