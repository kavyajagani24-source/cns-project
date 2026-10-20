const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toHash = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toHash), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(size) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.46;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Normalization [-1, 1]
      const nx = (x - cx) / (width * 0.42);
      const ny = (y - cy) / (height * 0.42);

      // Base background circle: Dark navy slate #0b1329 with glow
      let rCol = 11, gCol = 19, bCol = 41, alpha = 0;

      if (dist <= r) {
        alpha = 255;
        // Anti-aliasing border
        if (dist > r - 1.5) {
          alpha = Math.round(255 * (r - dist) / 1.5);
        }

        // Circular background fill
        rCol = 14; gCol = 23; bCol = 42; // #0e172a

        // Shield boundary check
        // Top edge: ny > -0.7
        // Sides: |nx| < 0.75
        // Bottom point: ny < 0.85 and |nx| < (0.85 - ny) * 0.75 + 0.1
        const inShieldTop = ny >= -0.7 && ny <= 0.0 && Math.abs(nx) <= 0.7;
        const inShieldBottom = ny > 0.0 && ny <= 0.8 && Math.abs(nx) <= 0.7 * (1.0 - Math.pow(ny / 0.8, 1.4));

        if (inShieldTop || inShieldBottom) {
          // Inside shield: Cyan to Emerald gradient (#06b6d4 to #10b981)
          const grad = (ny + 0.7) / 1.5;
          rCol = Math.round(6 * (1 - grad) + 16 * grad);
          gCol = Math.round(182 * (1 - grad) + 185 * grad);
          bCol = Math.round(212 * (1 - grad) + 129 * grad);

          // Inner emblem / core: Dark shield inset
          const inCoreTop = ny >= -0.5 && ny <= -0.05 && Math.abs(nx) <= 0.45;
          const inCoreBottom = ny > -0.05 && ny <= 0.55 && Math.abs(nx) <= 0.45 * (1.0 - Math.pow(ny / 0.55, 1.4));
          if (inCoreTop || inCoreBottom) {
            rCol = 11; gCol = 24; bCol = 45; // Dark core
            // Light bolt / check mark
            const isBolt = (nx >= -0.15 && nx <= 0.15 && ny >= -0.35 && ny <= 0.35) ||
                          (Math.abs(nx - ny * 0.5) < 0.12 && ny >= -0.2 && ny <= 0.25);
            if (isBolt) {
              rCol = 56; gCol = 189; bCol = 248; // Cyan bolt #38bdf8
            }
          }
        }
      }

      rawData[offset++] = rCol;
      rawData[offset++] = gCol;
      rawData[offset++] = bCol;
      rawData[offset++] = alpha;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = zlib.deflateSync(rawData);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const size of [16, 32, 48, 128]) {
  const buf = createPng(size);
  const filePath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${buf.length} bytes)`);
}
