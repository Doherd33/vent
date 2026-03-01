'use strict';
const sharp = require('sharp');

// ─── IMAGE PREPROCESSING ─────────────────────────────────────────────────────
// Improve Claude's vision accuracy with contrast normalization + sharpening
async function preprocessImage(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  const processed = await sharp(buffer)
    .normalize()                    // Auto-contrast normalization
    .sharpen({ sigma: 1.2 })        // Sharpen text edges
    .resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: true      // Don't upscale small images
    })
    .jpeg({ quality: 90 })
    .toBuffer();
  return processed.toString('base64');
}

// Detect blue ink regions using sharp pixel analysis
async function detectBlueInkRegions(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Grid-based detection: divide image into cells
  const GRID = 100; // 100×100 grid for precision
  const cellW = Math.ceil(width / GRID);
  const cellH = Math.ceil(height / GRID);
  const gridW = Math.ceil(width / cellW);
  const gridH = Math.ceil(height / cellH);

  // Count blue pixels per cell
  const grid = new Uint16Array(gridW * gridH);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      // Blue ink detection: blue channel dominant, not grey/white/black
      // Blue pen ink: B > 100, B > R + 25, B > G + 15, not too bright (not white)
      const brightness = (r + g + b) / 3;
      if (b > 90 && b > r + 20 && b > g + 10 && brightness < 200 && brightness > 40) {
        const gx = Math.min(Math.floor(x / cellW), gridW - 1);
        const gy = Math.min(Math.floor(y / cellH), gridH - 1);
        grid[gy * gridW + gx]++;
      }
    }
  }

  // Threshold: cell must have > 1.5% blue pixels to count
  const threshold = Math.max(3, (cellW * cellH) * 0.015);
  const blueCells = new Set();
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > threshold) blueCells.add(i);
  }

  // Flood-fill to cluster adjacent blue cells into regions
  const visited = new Set();
  const regions = [];

  for (const cell of blueCells) {
    if (visited.has(cell)) continue;
    const region = [];
    const stack = [cell];
    while (stack.length) {
      const c = stack.pop();
      if (visited.has(c) || !blueCells.has(c)) continue;
      visited.add(c);
      region.push(c);
      const cx = c % gridW, cy = Math.floor(c / gridW);
      // Check 8-connected neighbours + skip-1 for bridging small gaps
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
            stack.push(ny * gridW + nx);
          }
        }
      }
    }

    if (region.length >= 2) { // Skip single-cell noise
      let minX = gridW, minY = gridH, maxX = 0, maxY = 0;
      for (const c of region) {
        const cx = c % gridW, cy = Math.floor(c / gridW);
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
      }

      // Add 0.5 cell padding for tight but visible boxes
      const pad = 0.5;
      const x = Math.max(0, ((minX - pad) * cellW / width) * 100);
      const y = Math.max(0, ((minY - pad) * cellH / height) * 100);
      const w = Math.min(100 - x, ((maxX - minX + 1 + pad * 2) * cellW / width) * 100);
      const h = Math.min(100 - y, ((maxY - minY + 1 + pad * 2) * cellH / height) * 100);

      regions.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        w: Math.round(w * 100) / 100,
        h: Math.round(h * 100) / 100,
        cells: region.length
      });
    }
  }

  // Sort top-to-bottom, left-to-right
  regions.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 2) return a.x - b.x;
    return a.y - b.y;
  });

  console.log(`[GDP-VISION] Detected ${regions.length} blue ink regions (${width}×${height}, grid ${gridW}×${gridH})`);
  return { regions, width, height };
}

module.exports = { preprocessImage, detectBlueInkRegions };
