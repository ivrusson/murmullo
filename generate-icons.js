#!/usr/bin/env node

/**
 * Generate menu-bar tray marks from the imagotipo, and platform app icons
 * from src-tauri/icons/app-icon-master.png.
 *
 * Usage:
 *   node generate-icons.js [path-to-imagotipo.png]
 *   node generate-icons.js --skip-platform
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const SKIP_PLATFORM = process.argv.includes('--skip-platform');
const SOURCE = ARGS[0]
  ? path.resolve(ARGS[0])
  : path.join(ROOT, 'src-tauri/icons/source.png');
const ICONS_DIR = path.join(ROOT, 'src-tauri/icons');
const PUBLIC_BRAND = path.join(ROOT, 'public/brand/murmullo-imagotipo.png');
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

if (!fs.existsSync(SOURCE)) {
  console.error(`Source icon not found: ${SOURCE}`);
  process.exit(1);
}

fs.mkdirSync(ICONS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(PUBLIC_BRAND), { recursive: true });

async function alphaBboxes(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const full = { minX: w, minY: h, maxX: 0, maxY: 0 };
  const dark = { minX: w, minY: h, maxX: 0, maxY: 0 };

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      full.minX = Math.min(full.minX, x);
      full.minY = Math.min(full.minY, y);
      full.maxX = Math.max(full.maxX, x);
      full.maxY = Math.max(full.maxY, y);
      const lum =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum < 55 && a > 80) {
        dark.minX = Math.min(dark.minX, x);
        dark.minY = Math.min(dark.minY, y);
        dark.maxX = Math.max(dark.maxX, x);
        dark.maxY = Math.max(dark.maxY, y);
      }
    }
  }

  return { w, h, full, dark };
}

function clampExtract(box, w, h, pad, padBottom = pad) {
  const left = Math.max(0, box.minX - pad);
  const top = Math.max(0, box.minY - pad);
  const right = Math.min(w, box.maxX + 1 + pad);
  const bottom = Math.min(h, box.maxY + 1 + padBottom);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

async function toWhiteTemplate(inputBuffer, size) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .resize(size, size, { fit: 'contain', background: TRANSPARENT })
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = a < 20 ? 0 : a;
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function main() {
  console.log(`Source: ${SOURCE}`);
  console.log(`Output: ${ICONS_DIR}`);

  if (path.resolve(SOURCE) !== path.resolve(PUBLIC_BRAND)) {
    fs.copyFileSync(SOURCE, PUBLIC_BRAND);
  }
  if (path.resolve(SOURCE) !== path.join(ICONS_DIR, 'source.png')) {
    fs.copyFileSync(SOURCE, path.join(ICONS_DIR, 'source.png'));
  }

  const { w, h, full, dark } = await alphaBboxes(SOURCE);
  const blobExtract = clampExtract(
    {
      minX: Math.min(full.minX, dark.minX),
      minY: Math.min(full.minY, dark.minY),
      maxX: Math.max(full.maxX, dark.maxX),
      maxY: dark.maxY,
    },
    w,
    h,
    4,
    0
  );

  const blobPng = await sharp(SOURCE).extract(blobExtract).png().toBuffer();

  const masterPath = path.join(ICONS_DIR, 'app-icon-master.png');
  if (!fs.existsSync(masterPath)) {
    console.error(`App icon master not found: ${masterPath}`);
    process.exit(1);
  }

  const traySizes = [
    { file: 'tray-color.png', size: 32, template: false },
    { file: 'tray-color-64.png', size: 64, template: false },
    { file: 'tray-template.png', size: 32, template: true },
    { file: 'tray-template-64.png', size: 64, template: true },
  ];

  for (const spec of traySizes) {
    const dest = path.join(ICONS_DIR, spec.file);
    if (spec.template) {
      const buf = await toWhiteTemplate(blobPng, spec.size);
      await fs.promises.writeFile(dest, buf);
    } else {
      await sharp(blobPng)
        .resize(spec.size, spec.size, {
          fit: 'contain',
          background: TRANSPARENT,
        })
        .png()
        .toFile(dest);
    }
  }

  // 64px tray assets used at runtime (scales cleanly to 22pt retina).
  fs.copyFileSync(
    path.join(ICONS_DIR, 'tray-color-64.png'),
    path.join(ICONS_DIR, 'tray-color-runtime.png')
  );
  fs.copyFileSync(
    path.join(ICONS_DIR, 'tray-template-64.png'),
    path.join(ICONS_DIR, 'tray-template-runtime.png')
  );

  if (!SKIP_PLATFORM) {
    console.log('Generating platform icon set with Tauri CLI…');
    execSync(
      `"${path.join(ROOT, 'node_modules/.bin/tauri')}" icon "${masterPath}" --output "${ICONS_DIR}" --ios-color "#332F3D"`,
      { stdio: 'inherit', cwd: ROOT }
    );
  } else {
    console.log('Skipping Tauri platform icon set (--skip-platform).');
  }

  const favicon = path.join(ROOT, 'public/brand/app-icon.png');
  fs.copyFileSync(path.join(ICONS_DIR, '128x128.png'), favicon);

  console.log('\nGenerated files:');
  for (const file of fs.readdirSync(ICONS_DIR).sort()) {
    const filePath = path.join(ICONS_DIR, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const nested = fs.readdirSync(filePath);
      console.log(`  ${file}/ (${nested.length} files)`);
      continue;
    }
    console.log(`  ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
