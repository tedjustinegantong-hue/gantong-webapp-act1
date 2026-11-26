export type RecolorMode = 'dark-to-color' | 'light-to-color' | 'chroma-to-color';

const recolorCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h /= 6;
  return [h, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tn = t;
  if (tn < 0) tn += 1;
  if (tn > 1) tn -= 1;
  if (tn < 1 / 6) return p + (q - p) * 6 * tn;
  if (tn < 1 / 2) return q;
  if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getHsvSat(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function stripAssetQuery(url: string): string {
  const qIdx = url.indexOf('?');
  return qIdx >= 0 ? url.slice(0, qIdx) : url;
}

function buildCacheKey(
  src: string,
  targetHex?: string,
  mode: RecolorMode = 'light-to-color',
  neutralizeBg = true
): string {
  const cleanSrc = stripAssetQuery(src);
  return `v7::${cleanSrc}::${targetHex ?? 'ORIG'}::${mode}::${neutralizeBg ? 'nbg' : 'rawbg'}`;
}

export function getCachedRecoloredUrl(
  src: string,
  targetHex?: string,
  mode: RecolorMode = 'light-to-color',
  neutralizeBg = true
): string | undefined {
  return recolorCache.get(buildCacheKey(src, targetHex, mode, neutralizeBg));
}

const STUDIO_BG_R = 247;
const STUDIO_BG_G = 244;
const STUDIO_BG_B = 238;

function finalizeSquareStudioCanvas(
  sourceCanvas: HTMLCanvasElement,
  isBg: Uint8Array,
  srcWidth: number,
  srcHeight: number
): string {
  const squareSize = 640;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = squareSize;
  outCanvas.height = squareSize;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    return sourceCanvas.toDataURL('image/jpeg', 0.93);
  }

  // Fill seamless #F7F4EE studio cream background
  outCtx.fillStyle = `rgb(${STUDIO_BG_R}, ${STUDIO_BG_G}, ${STUDIO_BG_B})`;
  outCtx.fillRect(0, 0, squareSize, squareSize);

  // Compute tight product foreground bounding box (ignoring isolated edge specks)
  let minX = srcWidth;
  let minY = srcHeight;
  let maxX = -1;
  let maxY = -1;
  const marginGuard = 4;
  for (let y = marginGuard; y < srcHeight - marginGuard; y++) {
    for (let x = marginGuard; x < srcWidth - marginGuard; x++) {
      if (!isBg[y * srcWidth + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = srcWidth - 1;
    maxY = srcHeight - 1;
  } else {
    const padSide = Math.round(srcWidth * 0.03);
    const padBottom = Math.round(srcHeight * 0.06);
    minX = Math.max(0, minX - padSide);
    maxX = Math.min(srcWidth - 1, maxX + padSide);
    minY = Math.max(0, minY - padSide);
    maxY = Math.min(srcHeight - 1, maxY + padBottom);
  }

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);
  const targetBox = Math.round(squareSize * 0.84);
  const fitScale = Math.min(targetBox / cropW, targetBox / cropH);
  const drawW = Math.round(cropW * fitScale);
  const drawH = Math.round(cropH * fitScale);
  const drawX = Math.round((squareSize - drawW) / 2);
  const drawY = Math.round((squareSize - drawH) / 2);

  outCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, drawX, drawY, drawW, drawH);
  return outCanvas.toDataURL('image/jpeg', 0.93);
}

/**
 * Segments the centered product from its studio background,
 * standardizes studio backdrops to uniform cream-ivory (#F7F4EE) with soft floor shadows,
 * applies balanced natural pigment transfer without altering shape, logos, woven trims,
 * soles, or stitching, and outputs a centered 1:1 square studio frame.
 */
export async function recolorProductImage(
  src: string,
  targetHex?: string,
  mode: RecolorMode = 'light-to-color',
  neutralizeBg = true
): Promise<string> {
  const cleanSrc = stripAssetQuery(src);
  const cacheKey = buildCacheKey(cleanSrc, targetHex, mode, neutralizeBg);
  const cached = recolorCache.get(cacheKey);
  if (cached) return cached;

  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) return existingPromise;

  const task = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      try {
        const maxDim = 640;
        const scale = Math.min(
          1,
          maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
        );
        const width = Math.max(1, Math.round((img.naturalWidth || 640) * scale));
        const height = Math.max(1, Math.round((img.naturalHeight || 480) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(cleanSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const totalPixels = width * height;

        // Clean studio footwear flags
        const isCleanWhiteRunner = cleanSrc.includes('shoe_clean_white_runner');
        const isCleanCourtLow = cleanSrc.includes('shoe_clean_court_low');
        const isCleanBlackHightop = cleanSrc.includes('shoe_clean_black_hightop');
        const isCleanIndigoRunner = cleanSrc.includes('shoe_clean_indigo_runner');
        const isCleanBanigSlipon = cleanSrc.includes('shoe_clean_banig_slipon');
        const isCleanDerbyHybrid = cleanSrc.includes('shoe_clean_derby_hybrid');

        // Clean studio apparel, bags & caps flags
        const isCleanPoloWhite = cleanSrc.includes('clean_polo_white');
        const isCleanPoloOchre = cleanSrc.includes('clean_polo_ochre');
        const isCleanTeeWhite = cleanSrc.includes('clean_tee_white');
        const isCleanTeeBlack = cleanSrc.includes('clean_tee_black');
        const isCleanTeeSand = cleanSrc.includes('clean_tee_sand');
        const isCleanTeeOlive = cleanSrc.includes('clean_tee_olive');
        const isCleanTeeIndigo = cleanSrc.includes('clean_tee_indigo');
        const isCleanHoodieBlack = cleanSrc.includes('clean_hoodie_black');
        const isCleanHoodieWhite = cleanSrc.includes('clean_hoodie_white');
        const isCleanHoodieOchre = cleanSrc.includes('clean_hoodie_ochre');
        const isCleanPantsBlack = cleanSrc.includes('clean_pants_black');
        const isCleanPantsBrown = cleanSrc.includes('clean_pants_brown');
        const isCleanCargoBlack = cleanSrc.includes('clean_cargo_black');
        const isCleanBagBlack = cleanSrc.includes('clean_bag_black');
        const isCleanBagNatural = cleanSrc.includes('clean_bag_natural');
        const isCleanBagOlive = cleanSrc.includes('clean_bag_olive');
        const isCleanCapWhite = cleanSrc.includes('clean_cap_white');
        const isCleanCapBlack = cleanSrc.includes('clean_cap_black');
        const isCleanCapBucket = cleanSrc.includes('clean_cap_bucket');

        // Unified studio asset check (all clean_* + shoe_clean_*)
        const isCleanStudioAsset =
          isCleanWhiteRunner ||
          isCleanCourtLow ||
          isCleanBlackHightop ||
          isCleanIndigoRunner ||
          isCleanBanigSlipon ||
          isCleanDerbyHybrid ||
          cleanSrc.includes('clean_');

        // Fallback/legacy flags (e.g. if an admin still references a legacy path)
        const isIndigoRunner = isCleanIndigoRunner || cleanSrc.includes('sneaker_indigo');
        const isDerbyHybrid = isCleanDerbyHybrid || cleanSrc.includes('shoe_derby_hybrid');
        const isNaturalBag = isCleanBagNatural || cleanSrc.includes('bag_natural');
        const isBanigShoe = isCleanBanigSlipon || cleanSrc.includes('shoe_banig_slipon');
        const isWhiteTee = isCleanTeeWhite || cleanSrc.includes('tee_white');
        const isBlackTee = isCleanTeeBlack || cleanSrc.includes('tee_black');
        const isOchrePolo = isCleanPoloOchre || cleanSrc.includes('polo_ochre');
        const isWhitePolo = isCleanPoloWhite || cleanSrc.includes('polo_white_inabel');
        const isWhiteHoodie = isCleanHoodieWhite || cleanSrc.includes('hoodie_white');
        const isOchreHoodie = isCleanHoodieOchre || cleanSrc.includes('hoodie_ochre');
        const isWhiteCap = isCleanCapWhite || cleanSrc.includes('cap_white');
        const isBlackCargo = isCleanCargoBlack || cleanSrc.includes('cargo_black');
        const isWhiteRunner = isCleanWhiteRunner || cleanSrc.includes('shoes_white_runner');
        const isBrownPants = isCleanPantsBrown || cleanSrc.includes('pants_brown_twill');
        const isSandTee = isCleanTeeSand || cleanSrc.includes('tee_sand_baybayin');
        const isSageTee = isCleanTeeOlive || cleanSrc.includes('tee_sage_binakul');
        const isIndigoTee = isCleanTeeIndigo || cleanSrc.includes('tee_indigo_okir');
        const isOliveMessenger = isCleanBagOlive || cleanSrc.includes('bag_messenger_olive');
        const isSandBucket = isCleanCapBucket || cleanSrc.includes('cap_bucket_sand');

        // 1. Build background mask using neutral perimeter + studio corner/cutout seeds with edge-barrier
        const isBg = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        const seedR = new Float32Array(totalPixels);
        const seedG = new Float32Array(totalPixels);
        const seedB = new Float32Array(totalPixels);
        let head = 0;
        let tail = 0;

        // Measure median & 98th-percentile luminance across neutral perimeter pixels
        const borderNeutralLums: number[] = [];
        const recordBorderLum = (px: number, py: number) => {
          const bIdx = (py * width + px) * 4;
          const br = data[bIdx];
          const bg = data[bIdx + 1];
          const bb = data[bIdx + 2];
          if (getHsvSat(br, bg, bb) < 0.095) {
            const bl = getLuminance(br, bg, bb);
            if (bl >= 0.52 && bl <= 0.89) {
              borderNeutralLums.push(bl);
            }
          }
        };
        for (let x = 0; x < width; x += 4) {
          recordBorderLum(x, 2);
          recordBorderLum(x, height - 3);
        }
        for (let y = 0; y < height; y += 4) {
          recordBorderLum(2, y);
          recordBorderLum(width - 3, y);
        }
        borderNeutralLums.sort((a, b) => a - b);
        const bgBaseLum =
          borderNeutralLums.length > 0
            ? borderNeutralLums[Math.floor(borderNeutralLums.length * 0.5)]
            : 0.82;
        const borderMaxNeutralLum =
          borderNeutralLums.length > 0
            ? borderNeutralLums[Math.min(borderNeutralLums.length - 1, Math.floor(borderNeutralLums.length * 0.98))]
            : 0.85;

        const enqueueBg = (x: number, y: number, rRef: number, gRef: number, bRef: number) => {
          const cx = clamp(x, 0, width - 1);
          const cy = clamp(y, 0, height - 1);
          const pos = cy * width + cx;
          if (isBg[pos]) return;
          const idx = pos * 4;
          const pr = data[idx];
          const pg = data[idx + 1];
          const pb = data[idx + 2];
          const pLum = getLuminance(pr, pg, pb);
          const pSat = getHsvSat(pr, pg, pb);
          // Never seed perimeter pixels that belong to a garment touching the frame edge
          const edgeSatLimit = isCleanBagOlive ? 0.14 : 0.10;
          if (isCleanStudioAsset && (pLum < 0.46 || pSat > edgeSatLimit)) return;
          isBg[pos] = 1;
          seedR[pos] = rRef;
          seedG[pos] = gRef;
          seedB[pos] = bRef;
          queue[tail++] = pos;
        };

        // Seed outer perimeter frame
        for (let x = 0; x < width; x++) {
          const tIdx = x * 4;
          enqueueBg(x, 0, data[tIdx], data[tIdx + 1], data[tIdx + 2]);
          const bIdx = ((height - 1) * width + x) * 4;
          enqueueBg(x, height - 1, data[bIdx], data[bIdx + 1], data[bIdx + 2]);
        }
        for (let y = 1; y < height - 1; y++) {
          const lIdx = y * width * 4;
          enqueueBg(0, y, data[lIdx], data[lIdx + 1], data[lIdx + 2]);
          const rIdx = (y * width + (width - 1)) * 4;
          enqueueBg(width - 1, y, data[rIdx], data[rIdx + 1], data[rIdx + 2]);
        }

        // Seed safe outer studio margins
        const interiorSeeds: Array<[number, number]> = [
          [0.04, 0.04],
          [0.96, 0.04],
          [0.04, 0.94],
          [0.96, 0.94],
        ];
        // Also seed enclosed gray wall inside the natural tote leather handles
        if (isCleanBagNatural) {
          interiorSeeds.push([0.50, 0.16], [0.50, 0.22]);
        }

        for (const [fx, fy] of interiorSeeds) {
          const sx = Math.round(fx * width);
          const sy = Math.round(fy * height);
          const idx = (sy * width + sx) * 4;
          const sr = data[idx];
          const sg = data[idx + 1];
          const sb = data[idx + 2];
          const sLum = getLuminance(sr, sg, sb);
          const sSat = getHsvSat(sr, sg, sb);
          if (sLum > 0.60 && sLum < 0.89 && sSat < 0.09) {
            enqueueBg(sx, sy, sr, sg, sb);
          }
        }

        const isLightProduct =
          mode === 'light-to-color' ||
          isCleanWhiteRunner ||
          isCleanCourtLow ||
          isCleanBanigSlipon ||
          isCleanPoloWhite ||
          isCleanTeeWhite ||
          isCleanHoodieWhite ||
          isCleanBagNatural ||
          isCleanCapWhite;
        const maxLocalStep = isCleanStudioAsset
          ? isLightProduct
            ? 10
            : isCleanBagOlive
              ? 20
              : 18
          : isLightProduct
            ? 22
            : 34;
        const maxBgSat = isCleanStudioAsset
          ? isLightProduct
            ? 0.075
            : isCleanBagOlive
              ? 0.14
              : 0.095
          : mode === 'chroma-to-color'
            ? 0.22
            : 0.24;
        const lightLumUpperBound = Math.min(0.882, Math.max(bgBaseLum + 0.022, borderMaxNeutralLum + 0.005));

        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = (curr - cx) / width;
          const cIdx = curr * 4;
          const cr = data[cIdx];
          const cg = data[cIdx + 1];
          const cb = data[cIdx + 2];
          const sr = seedR[curr];
          const sg = seedG[curr];
          const sb = seedB[curr];

          const neighbors = [
            cx > 0 ? curr - 1 : -1,
            cx < width - 1 ? curr + 1 : -1,
            cy > 0 ? curr - width : -1,
            cy < height - 1 ? curr + width : -1,
          ];

          for (let n = 0; n < 4; n++) {
            const next = neighbors[n];
            if (next < 0 || isBg[next]) continue;

            const nx = next % width;
            const ny = (next - nx) / width;
            const nIdx = next * 4;
            const nr = data[nIdx];
            const ng = data[nIdx + 1];
            const nb = data[nIdx + 2];

            const sat = getHsvSat(nr, ng, nb);
            const distSeed = colorDist(nr, ng, nb, sr, sg, sb);
            const step = colorDist(nr, ng, nb, cr, cg, cb);
            const lum = getLuminance(nr, ng, nb);

            let canFlood = false;
            if (isCleanStudioAsset) {
              if (isLightProduct) {
                // Edge-barrier: stop cleanly at garment/shoe outline seams while traversing smooth studio gradients
                const nxL = Math.max(0, nx - 1);
                const nxR = Math.min(width - 1, nx + 1);
                const nyT = Math.max(0, ny - 1);
                const nyB = Math.min(height - 1, ny + 1);
                const lI = (ny * width + nxL) * 4;
                const rI = (ny * width + nxR) * 4;
                const tI = (nyT * width + nx) * 4;
                const bI = (nyB * width + nx) * 4;
                const grad2 = Math.max(
                  colorDist(data[lI], data[lI + 1], data[lI + 2], data[rI], data[rI + 1], data[rI + 2]),
                  colorDist(data[tI], data[tI + 1], data[tI + 2], data[bI], data[bI + 1], data[bI + 2])
                );
                const warmItemEdge = nr - nb >= 7 && lum > 0.58;
                const isFloorBand = ny / height > 0.74;
                const isOuterMargin = nx < width * 0.10 || nx > width * 0.90 || ny < height * 0.08 || ny > height * 0.92;
                const isFloorCastShadow = isFloorBand && lum >= 0.44 && lum < bgBaseLum - 0.025;
                const gradLimit = isFloorCastShadow
                  ? 18
                  : isOuterMargin
                    ? 14
                    : lum > borderMaxNeutralLum - 0.01
                      ? 8
                      : 11;
                const stepLimit = isFloorCastShadow
                  ? 12
                  : isOuterMargin
                    ? 10
                    : lum > borderMaxNeutralLum - 0.01
                      ? 6
                      : 8;

                canFlood =
                  !warmItemEdge &&
                  lum > 0.44 &&
                  lum <= lightLumUpperBound &&
                  sat < maxBgSat &&
                  step <= stepLimit &&
                  grad2 <= gradLimit;
              } else {
                const warmLimit = isCleanBagOlive ? 18 : 12;
                const warmItemEdge = nr - nb >= warmLimit && lum > 0.52;
                canFlood =
                  !warmItemEdge &&
                  lum > 0.48 &&
                  sat < maxBgSat &&
                  step < maxLocalStep &&
                  distSeed < 110;
              }
            } else if (mode === 'dark-to-color') {
              canFlood = isOliveMessenger
                ? lum > 0.45 && sat < 0.16 && step < maxLocalStep && distSeed < 135
                : lum > 0.34 && sat < maxBgSat && step < maxLocalStep && distSeed < 135;
            } else if (mode === 'chroma-to-color') {
              const warmDiff = nr - nb;
              canFlood =
                sat < maxBgSat &&
                warmDiff < 24 &&
                step < maxLocalStep &&
                distSeed < 135;
            } else {
              const warmBlock =
                (isNaturalBag || isBanigShoe || isWhiteCap) && nr - nb >= 12 && lum > 0.72;
              canFlood =
                !warmBlock &&
                lum < 0.845 &&
                sat < maxBgSat &&
                step < maxLocalStep &&
                distSeed < 88;
            }

            if (canFlood) {
              isBg[next] = 1;
              seedR[next] = sr;
              seedG[next] = sg;
              seedB[next] = sb;
              queue[tail++] = next;
            }
          }
        }

        // Standardize studio background toward seamless #F7F4EE cream-ivory with subtle floor shadows
        if (neutralizeBg) {
          for (let i = 0; i < totalPixels; i++) {
            if (!isBg[i]) continue;
            const px = i % width;
            const py = (i - px) / width;
            const fx = px / width;
            const fy = py / height;
            const idx = i * 4;
            const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);

            // Subtle floor contact shadow only beneath product & away from outer 6% margins
            const edgeFadeX = clamp(Math.min(fx, 1 - fx) / 0.07, 0, 1);
            const edgeFadeY = clamp(Math.min(fy, 1 - fy) / 0.07, 0, 1);
            const floorWeight = fy > 0.56 ? clamp((fy - 0.56) / 0.16, 0, 1) : 0;
            const shadowDeficit = clamp(bgBaseLum - lum, 0, 0.32);
            const shadowDrop = Math.round(shadowDeficit * 82 * floorWeight * edgeFadeX * edgeFadeY);

            data[idx] = clamp(STUDIO_BG_R - shadowDrop, 206, STUDIO_BG_R);
            data[idx + 1] = clamp(STUDIO_BG_G - shadowDrop, 203, STUDIO_BG_G);
            data[idx + 2] = clamp(STUDIO_BG_B - shadowDrop, 197, STUDIO_BG_B);
          }
        }

        if (!targetHex) {
          ctx.putImageData(imageData, 0, 0);
          const bgOnlyUrl = finalizeSquareStudioCanvas(canvas, isBg, width, height);
          recolorCache.set(cacheKey, bgOnlyUrl);
          resolve(bgOnlyUrl);
          return;
        }

        // 2. Anti-aliased 1px foreground edge smoothing
        const fgWeight = new Float32Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
          fgWeight[i] = isBg[i] ? 0 : 1;
        }
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const pos = y * width + x;
            if (isBg[pos]) continue;
            const bgNeighbors =
              isBg[pos - 1] + isBg[pos + 1] + isBg[pos - width] + isBg[pos + width];
            if (bgNeighbors > 0) {
              fgWeight[pos] = Math.max(0.28, 1 - bgNeighbors * 0.2);
            }
          }
        }

        // 3. Natural luminance-preserving pigment transfer (restrained saturation for authentic textiles & leather)
        const [tR, tG, tB] = hexToRgb(targetHex);
        const [tH, rawS, rawL] = rgbToHsl(tR, tG, tB);
        const tS = rawL > 0.88 ? Math.min(rawS, 0.04) : Math.min(rawS, 0.44);
        const tL = rawL > 0.88 ? 0.905 : clamp(rawL, 0.145, 0.89);

        const mapLightGarmentLuminance = (origL: number, midRef = 0.84): number => {
          if (tL < 0.45) {
            return clamp(tL * (0.45 + 0.55 * (origL / midRef)), 0.05, 0.92);
          }
          return clamp(tL + (origL - midRef) * 0.72, 0.08, 0.95);
        };

        const mapDarkGarmentLuminance = (origL: number, midRef = 0.16): number => {
          const delta = origL - midRef;
          if (tL > 0.60) {
            // Shifting Black -> Sand or White with preserved fold shading
            return clamp(tL + delta * 0.95, 0.16, 0.94);
          }
          return clamp(tL + delta * 0.88, 0.06, 0.90);
        };

        for (let i = 0; i < totalPixels; i++) {
          const w = fgWeight[i];
          if (w <= 0) continue;

          const x = i % width;
          const y = (i - x) / width;
          const fx = x / width;
          const fy = y / height;

          const idx = i * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = getLuminance(r, g, b);
          const sat = getHsvSat(r, g, b);
          const [, , origL] = rgbToHsl(r, g, b);

          let blend = w;
          let outR = r;
          let outG = g;
          let outB = b;

          // --- SHOES ---
          if (isCleanWhiteRunner || isCleanCourtLow) {
            if (r - b >= 16 && sat >= 0.15) continue; // Protect gum sole & abaca heel tab
            if (isCleanWhiteRunner && fy >= 0.64 && fy <= 0.735 && lum >= 0.54 && sat < 0.09) {
              continue; // Protect white EVA midsole strip (heel to toe)
            }
            if (
              ((isCleanWhiteRunner && fy >= 0.725) || (isCleanCourtLow && fy >= 0.715)) &&
              sat < 0.10 &&
              Math.abs(r - b) <= 8
            ) {
              continue; // Protect floor contact shadow beneath outsole & heel
            }
            if (lum < 0.30 || sat > 0.22) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.86);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanBlackHightop) {
            if (fy > 0.66 && lum > 0.18) continue; // Protect lugged outsole
            if (sat > 0.20 && r > b + 12) continue; // Protect crimson welt stitch & pull tab
            if (lum > 0.44) continue;
            const nextL = mapDarkGarmentLuminance(origL, 0.15);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanIndigoRunner) {
            if (fy >= 0.65 || (lum > 0.62 && sat < 0.24)) continue; // Protect cream laces, heel tab, midsole & gum sole
            const isBlueWeave = b > r + 4 && sat >= 0.10;
            const isRustSuede = r > b + 14 && sat >= 0.18 && lum < 0.64;
            const isDarkLoomShadow = !isBlueWeave && !isRustSuede && fy < 0.64 && lum < 0.48 && b >= r - 2;
            if (!isBlueWeave && !isRustSuede && !isDarkLoomShadow) continue;
            if (isBlueWeave || isDarkLoomShadow) {
              if (isBlueWeave) {
                blend *= clamp((b - r - 1) / 8, 0.45, 1);
              } else {
                blend *= 0.85;
              }
              const nextL = clamp(tL + (origL - 0.20) * 0.78, 0.08, 0.90);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else {
              blend *= clamp((r - b - 12) / 14, 0, 1);
              const nextL = clamp(tL * 0.84 + (origL - 0.34) * 0.68, 0.06, 0.80);
              [outR, outG, outB] = hslToRgb(tH, tS * 0.90, nextL);
            }
          } else if (isCleanBanigSlipon) {
            if (fy >= 0.60 && lum > 0.64 && sat < 0.15) continue; // Protect white vulcanized sole
            if (lum < 0.20 && fx < 0.24) continue; // Protect heel patch
            if (r - b < 8 || lum < 0.22 || lum > 0.86) continue;
            const banigStrength = clamp((r - b - 6) / 16, 0, 1);
            blend *= banigStrength;
            const nextL = mapLightGarmentLuminance(origL, 0.64);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanDerbyHybrid) {
            if (fy >= 0.65 || (lum >= 0.62 && sat < 0.20)) continue; // Protect cupsole & moc stitching
            if (r - b < 12 || lum < 0.09 || lum > 0.60) continue;
            blend *= clamp((r - b - 10) / 18, 0, 1);
            const nextL = clamp(tL + (origL - 0.26) * 0.82, 0.06, 0.88);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);

            // --- CLEAN STUDIO CLOTHES ---
          } else if (isCleanPoloWhite) {
            // Protect navy-terracotta woven placket, collar trim & shell buttons
            if (fx >= 0.44 && fx <= 0.56 && fy >= 0.11 && fy <= 0.41 && (lum < 0.68 || sat > 0.12)) {
              continue;
            }
            if (lum < 0.34 || sat > 0.22) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.88);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanTeeWhite) {
            // Protect Kalinga terracotta & indigo geometric chest print block
            if (fx >= 0.38 && fx <= 0.62 && fy >= 0.29 && fy <= 0.69 && (sat > 0.12 || lum < 0.72)) {
              continue;
            }
            if (lum < 0.34 || sat > 0.22) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.88);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanHoodieWhite) {
            // Protect Binakul chest pocket, drawstrings eyelets & tips
            if (fx >= 0.525 && fx <= 0.66 && fy >= 0.39 && fy <= 0.58) continue;
            if (lum < 0.28 || sat > 0.20) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.86);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanTeeSand) {
            // Protect embroidered indigo Philippine sun emblem on chest
            if (
              fx >= 0.54 &&
              fx <= 0.68 &&
              fy >= 0.24 &&
              fy <= 0.44 &&
              (b >= r - 4 || lum < 0.42)
            ) {
              continue;
            }
            if (lum < 0.22 || b > r + 6) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.72);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanTeeOlive) {
            // Protect woven Binakul chest pocket & neck size label
            if (fx >= 0.40 && fx <= 0.60 && fy >= 0.28 && fy <= 0.58) continue;
            if (fx >= 0.46 && fx <= 0.54 && fy >= 0.12 && fy <= 0.20 && lum > 0.56) continue;
            if (lum < 0.18 || lum > 0.76) continue;
            const nextL = clamp(tL + (origL - 0.44) * 0.85, 0.06, 0.93);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanTeeIndigo) {
            // Protect white Okir wave chest print & neck print
            if (fx >= 0.33 && fx <= 0.67 && fy >= 0.26 && fy <= 0.45 && lum > 0.46 && sat < 0.24) {
              continue;
            }
            if (fx >= 0.45 && fx <= 0.55 && fy >= 0.11 && fy <= 0.19 && lum > 0.42) continue;
            if (lum > 0.62) continue;
            const nextL = clamp(tL + (origL - 0.24) * 0.86, 0.06, 0.92);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanPoloOchre) {
            // Protect dark woven placket & chest emblem
            if (fx >= 0.44 && fx <= 0.62 && fy >= 0.11 && fy <= 0.41 && (lum < 0.35 || sat < 0.22)) {
              continue;
            }
            if (lum < 0.20 || lum > 0.86) continue;
            const nextL = clamp(tL + (origL - 0.50) * 0.85, 0.06, 0.94);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanHoodieOchre) {
            // Protect dark Baybayin chest lettering & inner white neck label
            if (fx >= 0.37 && fx <= 0.63 && fy >= 0.31 && fy <= 0.44 && (lum < 0.32 || sat < 0.24)) {
              continue;
            }
            if (fx >= 0.47 && fx <= 0.53 && fy >= 0.23 && fy <= 0.29 && lum > 0.68 && sat < 0.20) {
              continue;
            }
            if (lum < 0.18 || lum > 0.86) continue;
            const nextL = clamp(tL + (origL - 0.50) * 0.85, 0.06, 0.94);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanTeeBlack) {
            // Protect white Baybayin lettering, bottom hem tag & neck print
            if (fx >= 0.40 && fx <= 0.60 && fy >= 0.27 && fy <= 0.42 && lum > 0.44) continue;
            if (fx >= 0.62 && fx <= 0.72 && fy >= 0.76 && fy <= 0.86 && lum > 0.34) continue;
            if (fx >= 0.48 && fx <= 0.55 && fy >= 0.11 && fy <= 0.17 && lum > 0.40) continue;
            if (lum > 0.46) continue;
            const nextL = mapDarkGarmentLuminance(origL, 0.15);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanHoodieBlack) {
            // Protect neck woven label & red-gold sleeve cuffs
            if (fx >= 0.46 && fx <= 0.54 && fy >= 0.13 && fy <= 0.22 && lum > 0.38) continue;
            if (fy >= 0.68 && (fx <= 0.24 || fx >= 0.76) && (r - b > 14 || lum > 0.36)) continue;
            if (lum > 0.45) continue;
            const nextL = mapDarkGarmentLuminance(origL, 0.15);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanPantsBlack || isCleanCargoBlack) {
            if (isCleanCargoBlack && fx >= 0.28 && fx <= 0.38 && fy >= 0.34 && fy <= 0.42 && lum > 0.26) {
              continue; // Protect Ilocano pocket tab
            }
            if (fx >= 0.48 && fx <= 0.53 && fy >= 0.08 && fy <= 0.14 && lum > 0.42) continue; // Button
            if (lum > 0.48) continue;
            const nextL = mapDarkGarmentLuminance(origL, 0.16);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanPantsBrown) {
            // Protect topstitching highlights & antique brass waist button
            if (lum > 0.56 && sat < 0.26) continue;
            if (lum < 0.10 || lum > 0.72) continue;
            const nextL = clamp(tL + (origL - 0.32) * 0.85, 0.06, 0.92);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);

            // --- CLEAN STUDIO BAGS & CAPS ---
          } else if (isCleanBagNatural) {
            // Protect dark leather handles/tabs, brass rivets/zipper, floor shadow & middle woven rattan cane weave
            if (fy < 0.34 || lum < 0.36) continue;
            if (
              (fy >= 0.86 || (fy >= 0.81 && (fx < 0.27 || fx > 0.73))) &&
              sat < 0.10 &&
              Math.abs(r - b) <= 8
            ) {
              continue;
            }
            if (fx >= 0.36 && fx <= 0.72 && fy >= 0.44 && fy <= 0.87 && sat >= 0.25 && r - b >= 45) {
              continue;
            }
            const nextL = mapLightGarmentLuminance(origL, 0.78);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanBagBlack) {
            // Protect T'nalak front woven panel & cobra buckle metal accents
            if (fx >= 0.41 && fx <= 0.78 && fy >= 0.32 && fy <= 0.79 && (r - b >= 14 || lum > 0.36)) {
              continue;
            }
            if (lum > 0.48) continue;
            const nextL = mapDarkGarmentLuminance(origL, 0.16);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanBagOlive) {
            // Protect crimson-gold woven band & black webbing straps/buckles
            if (fy >= 0.54 && fy <= 0.77 && (r - g >= 16 || (r - b >= 24 && lum > 0.44))) continue;
            if (sat < 0.12 && lum < 0.24) continue;
            if (lum < 0.12 || lum > 0.66) continue;
            const nextL = clamp(tL + (origL - 0.28) * 0.85, 0.05, 0.90);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanCapWhite) {
            // Protect woven Solihiya rattan side panel, darker floor shadow & black embroidered emblem / eyelets
            if (r - b >= 12 && sat >= 0.13) continue;
            if (
              (fy >= 0.70 || (fy >= 0.64 && (fx < 0.20 || fx > 0.74))) &&
              lum < 0.76 &&
              sat < 0.10 &&
              Math.abs(r - b) <= 8
            ) {
              continue;
            }
            if (lum < 0.34) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.86);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanCapBlack) {
            // Protect antique gold sun & three stars embroidery
            if (fx >= 0.31 && fx <= 0.49 && fy >= 0.25 && fy <= 0.50 && r - b >= 12 && lum >= 0.26) {
              continue;
            }
            if (lum > 0.58) continue;
            const nextL = mapDarkGarmentLuminance(origL, 0.20);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);
          } else if (isCleanCapBucket) {
            // Protect crimson-indigo woven loom ribbon band (low g-b) while keeping crown & golden-sand brim recolored
            if (fy >= 0.39 && fy <= 0.63 && g - b <= 18) {
              continue;
            }
            if (lum < 0.20 || lum > 0.84) continue;
            const nextL = mapLightGarmentLuminance(origL, 0.62);
            [outR, outG, outB] = hslToRgb(tH, tS, nextL);

            // --- LEGACY MODES (fallback for any admin custom references) ---
          } else if (mode === 'dark-to-color') {
            if (isBlackTee && fx >= 0.63 && fx <= 0.71 && fy >= 0.77 && fy <= 0.85) continue;
            if (isBlackCargo && fx >= 0.29 && fx <= 0.37 && fy >= 0.35 && fy <= 0.41) continue;
            if (isOliveMessenger) {
              if (lum < 0.14 || lum > 0.46 || (r - b > 22 && sat > 0.24)) continue;
              const nextL = clamp(tL + (origL - 0.28) * 0.85, 0.05, 0.92);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else {
              if (lum > 0.42 || (sat > 0.22 && r > b + 18)) continue;
              const nextL = mapDarkGarmentLuminance(origL, 0.15);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            }
          } else if (mode === 'chroma-to-color') {
            if (isIndigoRunner) {
              if (!(b > r + 10 && sat >= 0.16) || (lum > 0.72 && sat < 0.22)) continue;
              blend *= clamp((b - r - 8) / 20, 0, 1);
              const nextL = clamp(tL + (origL - 0.32) * 0.8, 0.06, 0.92);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isIndigoTee) {
              if (!(b > r + 10 && sat >= 0.15) || lum >= 0.52) continue;
              blend *= clamp((b - r - 8) / 20, 0, 1);
              const nextL = clamp(tL + (origL - 0.24) * 0.85, 0.05, 0.92);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isSageTee) {
              if (fx < 0.09 || fx > 0.91 || fy < 0.10 || fy > 0.91) continue;
              if (fx >= 0.40 && fx <= 0.60 && fy >= 0.29 && fy <= 0.57) continue;
              if (fx >= 0.45 && fx <= 0.55 && fy >= 0.12 && fy <= 0.20 && lum > 0.60) continue;
              if (!(g >= r - 2 && lum >= 0.22 && lum <= 0.66)) continue;
              const nextL = clamp(tL + (origL - 0.44) * 0.85, 0.06, 0.93);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isSandTee) {
              if (lum < 0.24 || b > r + 6) continue;
              const nextL = mapLightGarmentLuminance(origL, 0.72);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isBrownPants) {
              if (r - b < 14 || sat < 0.16 || (lum > 0.68 && sat < 0.24)) continue;
              blend *= clamp((r - b - 12) / 20, 0, 1);
              const nextL = clamp(tL + (origL - 0.32) * 0.85, 0.06, 0.92);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isSandBucket) {
              if (fx < 0.16 || fx > 0.85 || fy < 0.16 || fy > 0.75) continue;
              if (r > g + 26 || b > g + 4 || (fy >= 0.40 && fy <= 0.60 && (sat > 0.46 || lum < 0.30))) {
                continue;
              }
              const nextL = mapLightGarmentLuminance(origL, 0.62);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isDerbyHybrid) {
              if (fx < 0.14 || fx > 0.88 || fy < 0.20 || fy > 0.69) continue;
              if (!(r > g && g > b && r - b >= 24 && lum < 0.56)) continue;
              blend *= clamp((r - b - 22) / 24, 0, 1);
              const nextL = clamp(tL + (origL - 0.28) * 0.85, 0.05, 0.92);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else if (isOchrePolo || isOchreHoodie) {
              if (r - b < 18 || sat < 0.18 || lum <= 0.24 || (lum > 0.84 && sat < 0.25)) continue;
              blend *= clamp((r - b - 16) / 24, 0, 1);
              const nextL = clamp(tL + (origL - 0.50) * 0.85, 0.06, 0.95);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else {
              if (sat < 0.26 || r - b < 32 || (lum > 0.84 && sat < 0.25)) continue;
              blend *= clamp((r - b - 30) / 28, 0, 1);
              const nextL = clamp(tL + (origL - 0.50) * 0.85, 0.06, 0.95);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            }
          } else {
            if (isBanigShoe) {
              if (fy > 0.77 || (lum > 0.78 && sat < 0.16 && r - b < 14)) continue;
              if (fx < 0.10 || fx > 0.90 || fy < 0.24) continue;
              const nextL = mapLightGarmentLuminance(origL, 0.68);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            } else {
              if (isWhiteTee && (fy < 0.11 || fy > 0.90 || fx < 0.12 || fx > 0.88)) continue;
              if (
                isWhitePolo &&
                fx >= 0.45 &&
                fx <= 0.55 &&
                fy >= 0.12 &&
                fy <= 0.40 &&
                (lum < 0.68 || sat > 0.15)
              ) {
                continue;
              }
              if (isWhiteRunner && (fy < 0.13 || fy > 0.83 || fx < 0.10 || fx > 0.90)) continue;
              if (isWhiteHoodie && fx >= 0.53 && fx <= 0.655 && fy >= 0.395 && fy <= 0.575) continue;
              if (isWhiteCap && r - b >= 14 && sat >= 0.14) continue;
              if (lum < 0.34 || sat > 0.24 || (r - b > 26 && sat > 0.20)) continue;
              if (isNaturalBag && (fx < 0.20 || fx > 0.80 || fy < 0.32 || fy > 0.88)) continue;
              const nextL = mapLightGarmentLuminance(origL, 0.86);
              [outR, outG, outB] = hslToRgb(tH, tS, nextL);
            }
          }

          data[idx] = Math.round(r * (1 - blend) + outR * blend);
          data[idx + 1] = Math.round(g * (1 - blend) + outG * blend);
          data[idx + 2] = Math.round(b * (1 - blend) + outB * blend);
        }

        ctx.putImageData(imageData, 0, 0);
        const resultUrl = finalizeSquareStudioCanvas(canvas, isBg, width, height);
        recolorCache.set(cacheKey, resultUrl);
        resolve(resultUrl);
      } catch {
        resolve(cleanSrc);
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    };

    img.onerror = () => {
      inFlightRequests.delete(cacheKey);
      resolve(cleanSrc);
    };

    img.src = cleanSrc;
  });

  inFlightRequests.set(cacheKey, task);
  return task;
}
