'use strict';
// Reads a PNG the way an image consumer would: signature, chunk framing and
// CRCs, then the inflated scanlines. Enough to check the plugin's swatches.

const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Decode an 8-bit RGB PNG; returns its size and the color of every pixel. */
function decodeRgbPng(png) {
  assert.deepEqual(png.subarray(0, 8), SIGNATURE, 'PNG signature');
  const chunks = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    const crc = png.readUInt32BE(offset + 8 + length);
    assert.equal(crc, zlib.crc32(png.subarray(offset + 4, offset + 8 + length)) >>> 0, `CRC of ${type}`);
    chunks.push({ type, data });
    offset += 12 + length;
  }
  assert.equal(offset, png.length, 'chunks cover the whole file');
  assert.deepEqual(chunks.map(chunk => chunk.type), ['IHDR', 'IDAT', 'IEND']);

  const header = chunks[0].data;
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  assert.equal(header.readUInt8(8), 8, 'bit depth');
  assert.equal(header.readUInt8(9), 2, 'truecolor');

  const raw = zlib.inflateSync(chunks[1].data);
  const rowLength = 1 + width * 3;
  assert.equal(raw.length, rowLength * height, 'scanline bytes');
  const colors = new Set();
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * rowLength], 0, 'filter byte');
    for (let x = 0; x < width; x++) {
      const pixel = y * rowLength + 1 + x * 3;
      colors.add(`#${raw.subarray(pixel, pixel + 3).toString('hex')}`);
    }
  }
  return { width, height, colors: [...colors] };
}

module.exports = { decodeRgbPng };
