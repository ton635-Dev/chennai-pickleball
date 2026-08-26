// 既存の緑アイコンから、背景だけをピンクに置き換えた別コミュニティ用アイコンを生成する。
// 使い方: node scripts/gen-pink-icons.cjs
// パドル(ライム色)と形状・アンチエイリアスはそのまま、背景グラデーションのみ差し替える。
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ピンクのグラデーション(上 → 下)。緑版(#0D7860 → #0A604D)と同じ濃さ感
const PINK_TOP = [236, 72, 153]; // #EC4899
const PINK_BOTTOM = [190, 24, 93]; // #BE185D
const LIME = [216, 236, 63]; // パドル・ボールの色(維持)

function decodePng(buf) {
  let pos = 8;
  let w, h;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6)
        throw new Error("8bit RGBA のPNGのみ対応");
    }
    if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const img = Buffer.alloc(w * h * bpp);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const cur = raw[p++];
      const left = x >= bpp ? img[row + x - bpp] : 0;
      const up = y > 0 ? img[row - stride + x] : 0;
      const ul = x >= bpp && y > 0 ? img[row - stride + x - bpp] : 0;
      let v;
      if (f === 0) v = cur;
      else if (f === 1) v = cur + left;
      else if (f === 2) v = cur + up;
      else if (f === 3) v = cur + ((left + up) >> 1);
      else {
        const pa = Math.abs(up - ul);
        const pb = Math.abs(left - ul);
        const pc = Math.abs(left + up - 2 * ul);
        const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        v = cur + pr;
      }
      img[row + x] = v & 255;
    }
  }
  return { w, h, img };
}

function encodePng(w, h, img) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    img.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunks = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])];
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const b of body) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  chunks.push(chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function recolor(srcPath, dstPath) {
  const { w, h, img } = decodePng(fs.readFileSync(srcPath));
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const bg = [
      PINK_TOP[0] + (PINK_BOTTOM[0] - PINK_TOP[0]) * t,
      PINK_TOP[1] + (PINK_BOTTOM[1] - PINK_TOP[1]) * t,
      PINK_TOP[2] + (PINK_BOTTOM[2] - PINK_TOP[2]) * t,
    ];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = img[i + 3];
      if (a === 0) continue;
      // R成分で「パドル色の割合」を推定(背景R≈10-13、ライムR=216)。
      // エッジのアンチエイリアス画素も自然に混ざる
      const l = Math.min(1, Math.max(0, (img[i] - 13) / (LIME[0] - 13)));
      for (let c = 0; c < 3; c++) {
        img[i + c] = Math.round(LIME[c] * l + bg[c] * (1 - l));
      }
    }
  }
  fs.writeFileSync(dstPath, encodePng(w, h, img));
  console.log("generated:", dstPath);
}

const root = path.join(__dirname, "..");
recolor(path.join(root, "public/icon-512.png"), path.join(root, "public/icon-512-pink.png"));
recolor(path.join(root, "public/icon-192.png"), path.join(root, "public/icon-192-pink.png"));
recolor(path.join(root, "public/apple-icon.png"), path.join(root, "public/apple-icon-pink.png"));
recolor(path.join(root, "public/icon.png"), path.join(root, "public/icon-pink.png"));
