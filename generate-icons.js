// Icon Generator for Sudoku PWA
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Simple PNG icon generator using pure JavaScript
// Creates a minimalist Sudoku grid icon

function createPNGData(size) {
  // Create image data array (RGBA)
  const data = new Uint8Array(size * size * 4);

  const bgColor = { r: 25, g: 118, b: 210, a: 255 }; // Blue #1976D2
  const gridColor = { r: 255, g: 255, b: 255, a: 255 }; // White
  const cellColor = { r: 33, g: 150, b: 243, a: 255 }; // Lighter blue

  // Fill background
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = bgColor.r;
    data[i * 4 + 1] = bgColor.g;
    data[i * 4 + 2] = bgColor.b;
    data[i * 4 + 3] = bgColor.a;
  }

  // Draw grid
  const padding = Math.floor(size * 0.15);
  const gridSize = size - padding * 2;
  const cellSize = Math.floor(gridSize / 3);

  // Draw 3x3 grid cells
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = padding + col * cellSize + 2;
      const y = padding + row * cellSize + 2;
      const w = cellSize - 4;
      const h = cellSize - 4;

      // Fill cell with lighter color
      for (let py = y; py < y + h && py < size; py++) {
        for (let px = x; px < x + w && px < size; px++) {
          const idx = (py * size + px) * 4;
          data[idx] = cellColor.r;
          data[idx + 1] = cellColor.g;
          data[idx + 2] = cellColor.b;
          data[idx + 3] = cellColor.a;
        }
      }
    }
  }

  // Draw grid lines
  const lineWidth = Math.max(1, Math.floor(size / 50));

  // Vertical lines
  for (let i = 0; i <= 3; i++) {
    const x = padding + i * cellSize;
    for (let y = padding; y < padding + gridSize && y < size; y++) {
      for (let dx = 0; dx < lineWidth && x + dx < size; dx++) {
        const idx = (y * size + x + dx) * 4;
        data[idx] = gridColor.r;
        data[idx + 1] = gridColor.g;
        data[idx + 2] = gridColor.b;
        data[idx + 3] = gridColor.a;
      }
    }
  }

  // Horizontal lines
  for (let i = 0; i <= 3; i++) {
    const y = padding + i * cellSize;
    for (let x = padding; x < padding + gridSize && x < size; x++) {
      for (let dy = 0; dy < lineWidth && y + dy < size; dy++) {
        const idx = ((y + dy) * size + x) * 4;
        data[idx] = gridColor.r;
        data[idx + 1] = gridColor.g;
        data[idx + 2] = gridColor.b;
        data[idx + 3] = gridColor.a;
      }
    }
  }

  return data;
}

// Simple PNG encoder (uncompressed)
function encodePNG(width, height, data) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  function crc32(data) {
    let crc = -1;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = type.split('').map(c => c.charCodeAt(0));
    const length = data.length;
    const crcData = [...typeBytes, ...data];
    const crc = crc32(crcData);

    return [
      (length >>> 24) & 0xFF,
      (length >>> 16) & 0xFF,
      (length >>> 8) & 0xFF,
      length & 0xFF,
      ...typeBytes,
      ...data,
      (crc >>> 24) & 0xFF,
      (crc >>> 16) & 0xFF,
      (crc >>> 8) & 0xFF,
      crc & 0xFF
    ];
  }

  // IHDR chunk
  const ihdr = chunk('IHDR', [
    (width >>> 24) & 0xFF, (width >>> 16) & 0xFF, (width >>> 8) & 0xFF, width & 0xFF,
    (height >>> 24) & 0xFF, (height >>> 16) & 0xFF, (height >>> 8) & 0xFF, height & 0xFF,
    8, // bit depth
    6, // color type (RGBA)
    0, // compression
    0, // filter
    0  // interlace
  ]);

  // IDAT chunk (uncompressed using zlib stored blocks)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]);
    }
  }

  // Simple zlib wrapper with no compression
  const zlibData = [];
  zlibData.push(0x78, 0x01); // zlib header

  // Split into 65535 byte chunks max
  const chunkSize = 65535;
  for (let i = 0; i < rawData.length; i += chunkSize) {
    const isLast = i + chunkSize >= rawData.length;
    const blockData = rawData.slice(i, i + chunkSize);
    const len = blockData.length;

    zlibData.push(isLast ? 1 : 0); // final flag
    zlibData.push(len & 0xFF, (len >>> 8) & 0xFF);
    zlibData.push((~len) & 0xFF, ((~len) >>> 8) & 0xFF);
    zlibData.push(...blockData);
  }

  // Adler-32 checksum
  let a = 1, b = 0;
  for (let i = 0; i < rawData.length; i++) {
    a = (a + rawData[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = (b << 16) | a;
  zlibData.push((adler >>> 24) & 0xFF, (adler >>> 16) & 0xFF, (adler >>> 8) & 0xFF, adler & 0xFF);

  const idat = chunk('IDAT', zlibData);

  // IEND chunk
  const iend = chunk('IEND', []);

  return Buffer.from([...signature, ...ihdr, ...idat, ...iend]);
}

function generateIcon(size, filename) {
  const data = createPNGData(size);
  const png = encodePNG(size, size, data);
  fs.writeFileSync(filename, png);
  console.log(`Generated: ${filename} (${size}x${size})`);
}

// Generate all icon sizes
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating icons...');
for (const size of sizes) {
  generateIcon(size, path.join(iconsDir, `icon-${size}.png`));
}

console.log('Done! Icons generated in /icons folder');
