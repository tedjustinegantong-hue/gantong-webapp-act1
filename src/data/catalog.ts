import type { Product, ProductCategory, ProductVariant } from '../types/store';

export const STUDIO_IMAGES = {
  // Editorial / Lifestyle Scenes (non-product)
  hero: '/src/assets/images/hero_polo_streetwear_1795496088867.jpg',
  craftEditorial: '/src/assets/images/artisan_inabel_craft_1795495453573.jpg',
  loginCulture: '/src/assets/images/login_habi_culture_1795514058045.jpg',

  // T-Shirts & Polos
  poloWhite: '/src/assets/images/clean_polo_white_inabel_1795515376592.jpg',
  poloNavy: '/src/assets/images/polo_navy_inabel_1795601838123.jpg',
  poloBlack: '/src/assets/images/polo_deep_black_inabel_1795601838874.jpg',
  poloOchre: '/src/assets/images/clean_polo_ochre_weave_1795515360108.jpg',
  poloCrimson: '/src/assets/images/clean_polo_crimson_weave_1795521360130.jpg',
  teeWhite: '/src/assets/images/clean_tee_white_kalinga_1795515355762.jpg',
  teeKalingaBlack: '/src/assets/images/tee_kalinga_deep_black_1795601871422.jpg',
  teeBlack: '/src/assets/images/clean_tee_black_baybayin_1795515377277.jpg',
  teeBaybayinWhite: '/src/assets/images/tee_baybayin_white_1795601841815.jpg',
  teeSand: '/src/assets/images/clean_tee_sand_sun_1795515377615.jpg',
  teeSunBlack: '/src/assets/images/tee_sun_black_1795601866624.jpg',
  teeSage: '/src/assets/images/clean_tee_olive_binakul_1795515378273.jpg',
  teeBinakulSand: '/src/assets/images/clean_tee_sand_binakul_1795521361772.jpg',
  teeIndigo: '/src/assets/images/clean_tee_indigo_okir_1795515427771.jpg',

  // Hoodies
  hoodieBlack: '/src/assets/images/clean_hoodie_black_inabel_1795515428269.jpg',
  hoodieOlive: '/src/assets/images/hoodie_inabel_olive_1795601897305.jpg',
  hoodieWhite: '/src/assets/images/clean_hoodie_white_binakul_1795515429529.jpg',
  hoodieOchre: '/src/assets/images/clean_hoodie_ochre_kalayaan_1795515429159.jpg',
  hoodieCrimson: '/src/assets/images/clean_hoodie_crimson_kalayaan_1795521365980.jpg',

  // Shoes
  shoeWhiteRunner: '/src/assets/images/shoe_clean_white_runner_1795514845773.jpg',
  shoeBlackRunner: '/src/assets/images/shoe_runner_deep_black_1795601866548.jpg',
  shoeOliveRunner: '/src/assets/images/shoe_clean_olive_runner_1795521338707.jpg',
  shoeBlueRunner: '/src/assets/images/shoe_runner_blue_1795601865292.jpg',
  shoeCrimsonRunner: '/src/assets/images/shoe_runner_crimson_1795601866250.jpg',
  sneakerWhite: '/src/assets/images/shoe_clean_court_low_1795514847439.jpg',
  sneakerCourtNatural: '/src/assets/images/shoe_court_natural_1795522306923.jpg',
  sneakerCourtBlue: '/src/assets/images/shoe_clean_court_blue_1795521342873.jpg',
  sneakerCourtCrimson: '/src/assets/images/shoe_clean_court_crimson_1795521342444.jpg',
  sneakerBlack: '/src/assets/images/shoe_clean_black_hightop_1795514847499.jpg',
  sneakerCrimsonHigh: '/src/assets/images/shoe_hightop_crimson_1795601898668.jpg',
  sneakerIndigo: '/src/assets/images/shoe_clean_indigo_runner_1795514847815.jpg',
  sneakerOliveLoom: '/src/assets/images/shoe_clean_olive_loom_runner_1795521385958.jpg',
  shoeBanigSlipon: '/src/assets/images/shoe_clean_banig_slipon_1795514848783.jpg',
  shoeBanigOlive: '/src/assets/images/shoe_banig_olive_1795522303387.jpg',
  shoeBanigBlue: '/src/assets/images/shoe_banig_blue_1795522303352.jpg',
  shoeBanigBlack: '/src/assets/images/shoe_clean_banig_black_1795521343130.jpg',
  shoeDerbyHybrid: '/src/assets/images/shoe_clean_derby_hybrid_1795514850358.jpg',

  // Pants & Gear
  pantsBlackStraight: '/src/assets/images/clean_pants_black_straight_1795515429359.jpg',
  pantsOliveStraight: '/src/assets/images/clean_pants_olive_straight_1795521363442.jpg',
  pantsBrownTwill: '/src/assets/images/clean_pants_brown_twill_1795515429988.jpg',
  cargoBlack: '/src/assets/images/clean_cargo_black_ripstop_1795515431337.jpg',
  cargoOlive: '/src/assets/images/cargo_ripstop_olive_1795601897845.jpg',
  craft: '/src/assets/images/clean_inabel_craft_set_1795515354956.jpg',

  // Bags
  bagBlack: '/src/assets/images/clean_bag_black_sling_1795515358128.jpg',
  bagBlueSling: '/src/assets/images/bag_sling_blue_1795601867048.jpg',
  bagOliveSling: '/src/assets/images/clean_bag_olive_sling_1795521366256.jpg',
  bagNatural: '/src/assets/images/clean_bag_natural_tote_1795515358814.jpg',
  bagToteOlive: '/src/assets/images/bag_tote_olive_1795601836615.jpg',
  bagToteBlack: '/src/assets/images/bag_tote_black_1795601836742.jpg',
  bagMessenger: '/src/assets/images/clean_bag_olive_messenger_1795515359145.jpg',
  bagMessengerBlack: '/src/assets/images/bag_messenger_black_1795601837874.jpg',

  // Caps
  capWhite: '/src/assets/images/clean_cap_white_solihiya_1795515356262.jpg',
  capBlackSolihiya: '/src/assets/images/clean_cap_black_solihiya_1795521363126.jpg',
  capBlack: '/src/assets/images/clean_cap_black_dad_1795515356965.jpg',
  capDadOlive: '/src/assets/images/cap_dad_olive_1795601896101.jpg',
  capDadBlue: '/src/assets/images/cap_dad_blue_1795601946050.jpg',
  capBucket: '/src/assets/images/clean_cap_bucket_sand_1795515356313.jpg',
  capBucketBlack: '/src/assets/images/cap_bucket_black_1795601896691.jpg',
} as const;

export type ColorKey =
  | 'White'
  | 'Black'
  | 'Ochre'
  | 'Indigo'
  | 'Blue'
  | 'Natural'
  | 'Olive'
  | 'Crimson'
  | 'Sand'
  | 'Chestnut';

export const COLOR_HEX: Record<ColorKey, string> = {
  Natural: '#DFD3BC',
  Olive: '#556341',
  Blue: '#234B7E',
  Crimson: '#9B2226',
  Black: '#0A0A0A',
  White: '#FFFFFF',
  Sand: '#C4A47C',
  Ochre: '#B88635',
  Indigo: '#2B3F72',
  Chestnut: '#6E472D',
};

export const PRIMARY_COLOR_OPTIONS: ColorKey[] = [
  'Natural',
  'Olive',
  'Blue',
  'Crimson',
  'Black',
];

export const COLOR_DISPLAY_ORDER: ColorKey[] = [
  'Natural',
  'Olive',
  'Blue',
  'Crimson',
  'Black',
  'White',
  'Sand',
  'Ochre',
  'Indigo',
  'Chestnut',
];

const COLOR_ORDER_INDEX = new Map<string, number>(
  COLOR_DISPLAY_ORDER.map((c, idx) => [c.toLowerCase(), idx])
);

export function sortVariantsByColor(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((a, b) => {
    const aIdx = COLOR_ORDER_INDEX.get(a.colorName.trim().toLowerCase()) ?? 999;
    const bIdx = COLOR_ORDER_INDEX.get(b.colorName.trim().toLowerCase()) ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.colorName.localeCompare(b.colorName);
  });
}

export const STUDIO_IMAGE_OPTIONS: Array<{
  label: string;
  url: string;
  nativeColor: ColorKey;
}> = [
  { label: 'Polo Shirt — Chalk White Inabel Placket', url: STUDIO_IMAGES.poloWhite, nativeColor: 'White' },
  { label: 'Polo Shirt — Deep Navy Blue Inabel Placket', url: STUDIO_IMAGES.poloNavy, nativeColor: 'Blue' },
  { label: 'Polo Shirt — Deep Black Inabel Placket', url: STUDIO_IMAGES.poloBlack, nativeColor: 'Black' },
  { label: 'Polo Shirt — Ochre Knit Weave', url: STUDIO_IMAGES.poloOchre, nativeColor: 'Ochre' },
  { label: 'Polo Shirt — Deep Crimson Knit Weave', url: STUDIO_IMAGES.poloCrimson, nativeColor: 'Crimson' },
  { label: 'T-Shirt — Chalk White Kalinga Geometric', url: STUDIO_IMAGES.teeWhite, nativeColor: 'White' },
  { label: 'T-Shirt — Deep Black Kalinga Geometric', url: STUDIO_IMAGES.teeKalingaBlack, nativeColor: 'Black' },
  { label: 'T-Shirt — Deep Black Baybayin Heavy', url: STUDIO_IMAGES.teeBlack, nativeColor: 'Black' },
  { label: 'T-Shirt — Natural White Baybayin Heavy', url: STUDIO_IMAGES.teeBaybayinWhite, nativeColor: 'White' },
  { label: 'T-Shirt — Sand Embroidered Sun', url: STUDIO_IMAGES.teeSand, nativeColor: 'Sand' },
  { label: 'T-Shirt — Deep Black Embroidered Sun', url: STUDIO_IMAGES.teeSunBlack, nativeColor: 'Black' },
  { label: 'T-Shirt — Olive Binakul Pocket', url: STUDIO_IMAGES.teeSage, nativeColor: 'Olive' },
  { label: 'T-Shirt — Sand Binakul Pocket', url: STUDIO_IMAGES.teeBinakulSand, nativeColor: 'Sand' },
  { label: 'T-Shirt — Indigo Okir Wave', url: STUDIO_IMAGES.teeIndigo, nativeColor: 'Indigo' },
  { label: 'Shoe — Heritage Runner (White)', url: STUDIO_IMAGES.shoeWhiteRunner, nativeColor: 'White' },
  { label: 'Shoe — Heritage Runner (Olive)', url: STUDIO_IMAGES.shoeOliveRunner, nativeColor: 'Olive' },
  { label: 'Shoe — Heritage Runner (Blue)', url: STUDIO_IMAGES.shoeBlueRunner, nativeColor: 'Blue' },
  { label: 'Shoe — Heritage Runner (Crimson)', url: STUDIO_IMAGES.shoeCrimsonRunner, nativeColor: 'Crimson' },
  { label: 'Shoe — Heritage Runner (Deep Black)', url: STUDIO_IMAGES.shoeBlackRunner, nativeColor: 'Black' },
  { label: 'Shoe — Abaca Court Low (Natural)', url: STUDIO_IMAGES.sneakerCourtNatural, nativeColor: 'Natural' },
  { label: 'Shoe — Abaca Court Low (White)', url: STUDIO_IMAGES.sneakerWhite, nativeColor: 'White' },
  { label: 'Shoe — Abaca Court Low (Blue)', url: STUDIO_IMAGES.sneakerCourtBlue, nativeColor: 'Blue' },
  { label: 'Shoe — Abaca Court Low (Crimson)', url: STUDIO_IMAGES.sneakerCourtCrimson, nativeColor: 'Crimson' },
  { label: 'Shoe — Suede High-Top (Crimson)', url: STUDIO_IMAGES.sneakerCrimsonHigh, nativeColor: 'Crimson' },
  { label: 'Shoe — Suede High-Top (Black)', url: STUDIO_IMAGES.sneakerBlack, nativeColor: 'Black' },
  { label: 'Shoe — Loom Runner (Olive)', url: STUDIO_IMAGES.sneakerOliveLoom, nativeColor: 'Olive' },
  { label: 'Shoe — Loom Runner (Blue)', url: STUDIO_IMAGES.sneakerIndigo, nativeColor: 'Blue' },
  { label: 'Shoe — Banig Slip-On Mule (Natural)', url: STUDIO_IMAGES.shoeBanigSlipon, nativeColor: 'Natural' },
  { label: 'Shoe — Banig Slip-On Mule (Olive)', url: STUDIO_IMAGES.shoeBanigOlive, nativeColor: 'Olive' },
  { label: 'Shoe — Banig Slip-On Mule (Blue)', url: STUDIO_IMAGES.shoeBanigBlue, nativeColor: 'Blue' },
  { label: 'Shoe — Banig Slip-On Mule (Black)', url: STUDIO_IMAGES.shoeBanigBlack, nativeColor: 'Black' },
  { label: 'Shoe — Chestnut Derby Hybrid', url: STUDIO_IMAGES.shoeDerbyHybrid, nativeColor: 'Chestnut' },
  { label: 'Pants — Olive Pleated Straight', url: STUDIO_IMAGES.pantsOliveStraight, nativeColor: 'Olive' },
  { label: 'Pants — Black Pleated Straight', url: STUDIO_IMAGES.pantsBlackStraight, nativeColor: 'Black' },
  { label: 'Pants — Chestnut Brown Carpenter Twill', url: STUDIO_IMAGES.pantsBrownTwill, nativeColor: 'Chestnut' },
  { label: 'Pants — Olive Ripstop Cargo', url: STUDIO_IMAGES.cargoOlive, nativeColor: 'Olive' },
  { label: 'Pants — Black Ripstop Cargo', url: STUDIO_IMAGES.cargoBlack, nativeColor: 'Black' },
  { label: 'Bag — Olive T\'nalak Crossbody Sling', url: STUDIO_IMAGES.bagOliveSling, nativeColor: 'Olive' },
  { label: 'Bag — Blue T\'nalak Crossbody Sling', url: STUDIO_IMAGES.bagBlueSling, nativeColor: 'Blue' },
  { label: 'Bag — Black T\'nalak Crossbody Sling', url: STUDIO_IMAGES.bagBlack, nativeColor: 'Black' },
  { label: 'Bag — Natural Rattan Utility Tote', url: STUDIO_IMAGES.bagNatural, nativeColor: 'Natural' },
  { label: 'Bag — Olive Rattan Utility Tote', url: STUDIO_IMAGES.bagToteOlive, nativeColor: 'Olive' },
  { label: 'Bag — Black Rattan Utility Tote', url: STUDIO_IMAGES.bagToteBlack, nativeColor: 'Black' },
  { label: 'Bag — Olive Waxed Inabel Messenger', url: STUDIO_IMAGES.bagMessenger, nativeColor: 'Olive' },
  { label: 'Bag — Black Waxed Inabel Messenger', url: STUDIO_IMAGES.bagMessengerBlack, nativeColor: 'Black' },
  { label: 'Cap — White Solihiya 6-Panel', url: STUDIO_IMAGES.capWhite, nativeColor: 'White' },
  { label: 'Cap — Black Solihiya 6-Panel', url: STUDIO_IMAGES.capBlackSolihiya, nativeColor: 'Black' },
  { label: 'Cap — Olive Tres Estrellas Dad Cap', url: STUDIO_IMAGES.capDadOlive, nativeColor: 'Olive' },
  { label: 'Cap — Blue Tres Estrellas Dad Cap', url: STUDIO_IMAGES.capDadBlue, nativeColor: 'Blue' },
  { label: 'Cap — Black Tres Estrellas Dad Cap', url: STUDIO_IMAGES.capBlack, nativeColor: 'Black' },
  { label: 'Cap — Black Loom-Band Bucket Hat', url: STUDIO_IMAGES.capBucketBlack, nativeColor: 'Black' },
  { label: 'Cap — Sand Loom-Band Bucket Hat', url: STUDIO_IMAGES.capBucket, nativeColor: 'Sand' },
  { label: 'Gear — Handwoven Inabel Craft Set', url: STUDIO_IMAGES.craft, nativeColor: 'Natural' },
  { label: 'Hoodie — Olive Inabel Cuff', url: STUDIO_IMAGES.hoodieOlive, nativeColor: 'Olive' },
  { label: 'Hoodie — Obsidian Black Inabel Cuff', url: STUDIO_IMAGES.hoodieBlack, nativeColor: 'Black' },
  { label: 'Hoodie — Chalk White Binakul', url: STUDIO_IMAGES.hoodieWhite, nativeColor: 'White' },
  { label: 'Hoodie — Ochre Gold Kalayaan', url: STUDIO_IMAGES.hoodieOchre, nativeColor: 'Ochre' },
  { label: 'Hoodie — Deep Crimson Kalayaan', url: STUDIO_IMAGES.hoodieCrimson, nativeColor: 'Crimson' },
];

export const STUDIO_IMAGE_NATIVE_COLOR: Record<string, ColorKey> = Object.fromEntries(
  STUDIO_IMAGE_OPTIONS.map((opt) => [opt.url, opt.nativeColor])
);

export function stripAssetQuery(url: string): string {
  const idx = url.indexOf('?');
  return idx >= 0 ? url.slice(0, idx) : url;
}

export function resolveColorHex(colorName: string, fallbackHex?: string): string {
  const normalized = colorName.trim().toLowerCase();
  const match = (Object.keys(COLOR_HEX) as ColorKey[]).find(
    (k) => k.toLowerCase() === normalized
  );
  if (match) return COLOR_HEX[match];
  return fallbackHex && /^#[0-9a-fA-F]{3,8}$/.test(fallbackHex.trim())
    ? fallbackHex.trim()
    : '#0A0A0A';
}

export function getVariantSizeStock(variant: ProductVariant, size: string): number {
  if (variant.sizeStock && typeof variant.sizeStock[size] === 'number') {
    return Math.max(0, variant.sizeStock[size]);
  }
  return Math.max(0, Number(variant.stock) || 0);
}

export function getVariantTotalStock(variant: ProductVariant, sizes: string[]): number {
  if (variant.sizeStock && sizes.length > 0) {
    return sizes.reduce((sum, s) => sum + getVariantSizeStock(variant, s), 0);
  }
  return Math.max(0, Number(variant.stock) || 0);
}

export function buildSizeStockMap(
  sizes: string[],
  baseStock: number,
  seedOffset = 0,
  soldOutTail = false
): Record<string, number> {
  const result: Record<string, number> = {};
  if (sizes.length === 0) return { 'One Size': Math.max(1, baseStock) };
  if (sizes.length === 1) {
    return { [sizes[0]]: Math.max(1, baseStock) };
  }
  sizes.forEach((sz, sIdx) => {
    if (soldOutTail && sIdx === sizes.length - 1 && sizes.length >= 4) {
      result[sz] = 0;
    } else {
      result[sz] = Math.max(2, ((baseStock + seedOffset + sIdx * 3) % 11) + 2);
    }
  });
  return result;
}

export function normalizeVariantAppearance(
  rawVariant: ProductVariant,
  baseProductImage: string
): ProductVariant {
  const cleanImageUrl = stripAssetQuery(rawVariant.imageUrl || baseProductImage || '');
  const normalizedColorName = rawVariant.colorName.trim() || 'Standard';
  const colorHex = resolveColorHex(normalizedColorName, rawVariant.colorHex);

  const normalized: ProductVariant = {
    colorName: normalizedColorName,
    colorHex,
    imageUrl: cleanImageUrl,
    stock: Math.max(0, Number(rawVariant.stock) || 0),
  };
  if (rawVariant.sizeStock && typeof rawVariant.sizeStock === 'object') {
    normalized.sizeStock = { ...rawVariant.sizeStock };
  }
  return normalized;
}

export function findVariantByColor(
  variants: ProductVariant[] | undefined,
  colorName: string | undefined
): ProductVariant | undefined {
  if (!variants || variants.length === 0 || !colorName) return undefined;
  const target = colorName.trim().toLowerCase();
  return variants.find((v) => v.colorName.trim().toLowerCase() === target);
}

export function getDefaultVariantIndex(product: Pick<Product, 'name' | 'variants'>): number {
  if (!product.variants || product.variants.length === 0) return 0;
  const lowerName = product.name.toLowerCase();
  const titleMatchIdx = product.variants.findIndex((v) => {
    const c = v.colorName.trim().toLowerCase();
    if (!c) return false;
    if (new RegExp(`\\b${c}\\b`, 'i').test(lowerName)) return true;
    // Match "Indigo" in product title to its "Blue" loom runner variant
    if (c === 'blue' && /\bindigo\b/i.test(lowerName)) return true;
    return false;
  });
  return titleMatchIdx >= 0 ? titleMatchIdx : 0;
}

export function resolveSafeVariantImageUrl(
  product: Product | undefined,
  colorName: string,
  fallbackImageUrl = ''
): { imageUrl: string; colorHex?: string; variant?: ProductVariant } {
  const matchedVariant = findVariantByColor(product?.variants, colorName);
  if (matchedVariant) {
    const cleanUrl = stripAssetQuery(matchedVariant.imageUrl);
    return {
      imageUrl: cleanUrl,
      colorHex: matchedVariant.colorHex,
      variant: matchedVariant,
    };
  }

  if (!fallbackImageUrl || fallbackImageUrl.includes('?color=')) {
    return { imageUrl: '' };
  }

  const cleanFallback = stripAssetQuery(fallbackImageUrl);
  const nativeColor = STUDIO_IMAGE_NATIVE_COLOR[cleanFallback];
  if (product?.id.startsWith('hk-') && !product.id.startsWith('hk-custom-') && !nativeColor) {
    return { imageUrl: '' };
  }
  if (
    nativeColor &&
    colorName.trim() &&
    nativeColor.toLowerCase() !== colorName.trim().toLowerCase()
  ) {
    return { imageUrl: '' };
  }
  return { imageUrl: cleanFallback };
}

interface SeedProductSpec {
  id: string;
  name: string;
  category: ProductCategory;
  subCategory: string;
  artisanMaterial: string;
  price: number;
  description: string;
  sizes: string[];
  variants: Array<{ color: ColorKey; imageUrl: string }>;
  featured?: boolean;
  badge?: string;
}

const RAW_SEED: SeedProductSpec[] = [
  // --- T-SHIRTS & POLOS (7 designs) ---
  {
    id: 'hk-tee-04',
    name: 'Escolta White Inabel-Trim Polo Shirt',
    category: 'T-Shirts',
    subCategory: 'Polo Shirts',
    artisanMaterial: '230gsm Combed Pique Cotton & Navy-Terracotta Placket',
    price: 750,
    description:
      'Crisp everyday streetwear polo shirt anchored by a narrow handwoven geometric Ilocano placket trim and matte shell buttons.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Blue', imageUrl: STUDIO_IMAGES.poloNavy },
      { color: 'Black', imageUrl: STUDIO_IMAGES.poloBlack },
      { color: 'White', imageUrl: STUDIO_IMAGES.poloWhite },
    ],
    featured: true,
    badge: 'New Drop',
  },
  {
    id: 'hk-tee-01',
    name: 'Kalinga Geometric Boxy Tee',
    category: 'T-Shirts',
    subCategory: 'Graphic Tees',
    artisanMaterial: '280gsm Combed Cotton & Water-Based Ink',
    price: 590,
    description:
      'Relaxed dropped-shoulder boxy tee printed with terracotta and indigo Cordillera textile geometry, cool enough for Manila afternoons.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: [
      { color: 'Black', imageUrl: STUDIO_IMAGES.teeKalingaBlack },
      { color: 'White', imageUrl: STUDIO_IMAGES.teeWhite },
    ],
    featured: true,
    badge: 'Bestseller',
  },
  {
    id: 'hk-tee-02',
    name: 'Baybayin Heritage Heavy Tee',
    category: 'T-Shirts',
    subCategory: 'Graphic Tees',
    artisanMaterial: '280gsm Ring-Spun Cotton & Woven Hem Tag',
    price: 550,
    description:
      'Thick ribbed-collar everyday street tee displaying crisp Baybayin chest lettering and a woven Ilocano hem label.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Black', imageUrl: STUDIO_IMAGES.teeBlack },
      { color: 'White', imageUrl: STUDIO_IMAGES.teeBaybayinWhite },
    ],
    featured: true,
    badge: 'Signature Drop',
  },
  {
    id: 'hk-tee-03',
    name: 'Vigan Inabel Placket Polo Shirt',
    category: 'T-Shirts',
    subCategory: 'Polo Shirts',
    artisanMaterial: 'Breathable Pique Cotton & Ilocano Inabel Placket',
    price: 790,
    description:
      'Clean everyday streetwear polo shirt anchored by a handwoven geometric button placket and crisp collar structure.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Ochre', imageUrl: STUDIO_IMAGES.poloOchre },
      { color: 'Crimson', imageUrl: STUDIO_IMAGES.poloCrimson },
    ],
    featured: true,
    badge: 'Artisan Batch',
  },
  {
    id: 'hk-tee-05',
    name: 'Taal Embroidered Sun Boxy Tee',
    category: 'T-Shirts',
    subCategory: 'Graphic Tees',
    artisanMaterial: '260gsm Combed Cotton & Indigo Thread Embroidery',
    price: 490,
    description:
      'Soft stone-toned relaxed boxy tee finished with a crisp embroidered eight-rayed geometric Philippine sun emblem on the left chest.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Black', imageUrl: STUDIO_IMAGES.teeSunBlack },
      { color: 'Sand', imageUrl: STUDIO_IMAGES.teeSand },
    ],
    featured: true,
    badge: 'Everyday Value',
  },
  {
    id: 'hk-tee-06',
    name: 'Cordillera Binakul Pocket Tee',
    category: 'T-Shirts',
    subCategory: 'Pocket Tees',
    artisanMaterial: '270gsm Heavyweight Cotton & Handwoven Binakul Pocket',
    price: 620,
    description:
      'Everyday relaxed tee anchored by an authentic stitched Ilocos Binakul optical diamond woven chest pocket.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.teeSage },
      { color: 'Sand', imageUrl: STUDIO_IMAGES.teeBinakulSand },
    ],
    badge: 'Artisan Batch',
  },
  {
    id: 'hk-tee-07',
    name: 'Maranao Okir Wave Heavy Tee',
    category: 'T-Shirts',
    subCategory: 'Graphic Tees',
    artisanMaterial: '265gsm Garment-Washed Cotton & Water-Based Print',
    price: 580,
    description:
      'Enzyme-washed deep indigo street tee featuring crisp ivory Mindanao Okir scroll line-art across the chest.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [{ color: 'Indigo', imageUrl: STUDIO_IMAGES.teeIndigo }],
    badge: 'New Drop',
  },

  // --- SHOES (6 Marikina footwear silhouettes) ---
  {
    id: 'hk-shoe-06',
    name: 'Manila Gum-Sole Heritage Runner',
    category: 'Shoes',
    subCategory: 'Street Runners',
    artisanMaterial: 'Full-Grain Leather, Breathable Mesh & Gum Lug Sole',
    price: 2150,
    description:
      'Sculpted Marikina street runner crafted in full-grain leather, ventilated mesh panels, suede mudguard, and high-traction gum rubber lugs.',
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.shoeOliveRunner },
      { color: 'Blue', imageUrl: STUDIO_IMAGES.shoeBlueRunner },
      { color: 'Crimson', imageUrl: STUDIO_IMAGES.shoeCrimsonRunner },
      { color: 'Black', imageUrl: STUDIO_IMAGES.shoeBlackRunner },
      { color: 'White', imageUrl: STUDIO_IMAGES.shoeWhiteRunner },
    ],
    featured: true,
    badge: 'New Design',
  },
  {
    id: 'hk-shoe-01',
    name: 'Marikina Abaca Court Low',
    category: 'Shoes',
    subCategory: 'Low-Top Sneakers',
    artisanMaterial: 'Marikina Action Leather & Woven Abaca Heel',
    price: 1890,
    description:
      'Hand-lasted by Marikina shoemakers with supple leather, natural woven abaca heel tab, and grippy gum cupsole.',
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    variants: [
      { color: 'Natural', imageUrl: STUDIO_IMAGES.sneakerCourtNatural },
      { color: 'Blue', imageUrl: STUDIO_IMAGES.sneakerCourtBlue },
      { color: 'Crimson', imageUrl: STUDIO_IMAGES.sneakerCourtCrimson },
      { color: 'White', imageUrl: STUDIO_IMAGES.sneakerWhite },
    ],
    featured: true,
    badge: 'Marikina Crafted',
  },
  {
    id: 'hk-shoe-02',
    name: 'Bayanihan Suede High-Top',
    category: 'Shoes',
    subCategory: 'High-Top Sneakers',
    artisanMaterial: 'Suede, Ballistic Canvas & Crimson Stitch',
    price: 2190,
    description:
      'High-top utility sneaker built on a sculpted lug outsole with hand-stitched welt detailing and padded collar.',
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    variants: [
      { color: 'Crimson', imageUrl: STUDIO_IMAGES.sneakerCrimsonHigh },
      { color: 'Black', imageUrl: STUDIO_IMAGES.sneakerBlack },
    ],
    featured: true,
    badge: 'Signature Drop',
  },
  {
    id: 'hk-shoe-03',
    name: 'Tadeco Indigo Loom Runner',
    category: 'Shoes',
    subCategory: 'Street Runners',
    artisanMaterial: 'Handloom Inabel Canvas & Terracotta Suede',
    price: 2050,
    description:
      'Retro runner reimagined with geometric handloom canvas quarters, rust suede overlays, and cushioned EVA midsole.',
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    variants: [
      { color: 'Blue', imageUrl: STUDIO_IMAGES.sneakerIndigo },
      { color: 'Olive', imageUrl: STUDIO_IMAGES.sneakerOliveLoom },
    ],
    featured: true,
    badge: 'Artisan Batch',
  },
  {
    id: 'hk-shoe-04',
    name: 'Leyte Banig Slip-On Mule',
    category: 'Shoes',
    subCategory: 'Slip-Ons',
    artisanMaterial: 'Tikog Banig Weave, Suede Toe & Vulcanized Sole',
    price: 1490,
    description:
      'Laceless tropical slip-on mule crafted with laminated Leyte tikog mat uppers, suede toe cap, and crisp vulcanized sole.',
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    variants: [
      { color: 'Natural', imageUrl: STUDIO_IMAGES.shoeBanigSlipon },
      { color: 'Olive', imageUrl: STUDIO_IMAGES.shoeBanigOlive },
      { color: 'Blue', imageUrl: STUDIO_IMAGES.shoeBanigBlue },
      { color: 'Black', imageUrl: STUDIO_IMAGES.shoeBanigBlack },
    ],
    featured: true,
    badge: 'Marikina Crafted',
  },
  {
    id: 'hk-shoe-05',
    name: 'Pampanga Brass-Eyelet Derby Hybrid',
    category: 'Shoes',
    subCategory: 'Derby Sneakers',
    artisanMaterial: 'Oiled Chestnut Leather, Moc Apron & Antique Brass',
    price: 1990,
    description:
      'Marikina moc-stitched derby upper mounted on a modern street rubber cupsole with solid antique brass eyelets.',
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    variants: [{ color: 'Chestnut', imageUrl: STUDIO_IMAGES.shoeDerbyHybrid }],
    featured: true,
    badge: 'Limited Run',
  },

  // --- PANTS & GEAR (4 designs) ---
  {
    id: 'hk-pg-02',
    name: 'Escolta Black Pleat Straight Pants',
    category: 'Pants & Gear',
    subCategory: 'Straight Pants',
    artisanMaterial: '11oz Brushed Cotton Twill & Tailored Front Pleat',
    price: 1150,
    description:
      'Clean straight-leg pleated trousers without bulky side cargo pockets, tailored to drape cleanly with polo shirts and Marikina shoes.',
    sizes: ['28', '30', '32', '34', '36'],
    variants: [
      { color: 'Black', imageUrl: STUDIO_IMAGES.pantsBlackStraight },
      { color: 'Olive', imageUrl: STUDIO_IMAGES.pantsOliveStraight },
    ],
    featured: true,
    badge: 'New Drop',
  },
  {
    id: 'hk-pg-03',
    name: 'Tondo Brown Carpenter Twill Pants',
    category: 'Pants & Gear',
    subCategory: 'Straight Pants',
    artisanMaterial: '13oz Chestnut Duck Canvas & Contrast Stitch',
    price: 1250,
    description:
      'Warm earth-brown relaxed carpenter pants reinforced with contrast topstitching, utility tool loop, and antique brass waist hardware.',
    sizes: ['28', '30', '32', '34', '36'],
    variants: [{ color: 'Chestnut', imageUrl: STUDIO_IMAGES.pantsBrownTwill }],
    featured: true,
    badge: 'New Drop',
  },
  {
    id: 'hk-pg-01',
    name: 'Banaue Pleated Ripstop Cargo Pants',
    category: 'Pants & Gear',
    subCategory: 'Cargo Pants',
    artisanMaterial: 'Cotton Ripstop & Inabel Pocket Tab',
    price: 1290,
    description:
      'Wide-leg articulated cargo pants with expandable thigh pockets, drawcord hems, and handwoven Ilocano pocket tab.',
    sizes: ['28', '30', '32', '34', '36'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.cargoOlive },
      { color: 'Black', imageUrl: STUDIO_IMAGES.cargoBlack },
    ],
    badge: 'Signature Drop',
  },
  {
    id: 'hk-pg-04',
    name: 'Handwoven Inabel Loom Craft Set',
    category: 'Pants & Gear',
    subCategory: 'Accessories',
    artisanMaterial: 'Ilocano Inabel Textile, Thread Spools & Cobbler Kit',
    price: 690,
    description:
      'Collector edition artisan kit pairing hand-loomed Ilocano geometric textile yardage with natural Abaca woven trim.',
    sizes: ['One Size'],
    variants: [{ color: 'Natural', imageUrl: STUDIO_IMAGES.craft }],
    badge: 'Artisan Batch',
  },

  // --- BAGS (3 designs) ---
  {
    id: 'hk-bag-01',
    name: 'T\'nalak Tech Crossbody Sling',
    category: 'Bags',
    subCategory: 'Crossbody Slings',
    artisanMaterial: 'Ballistic Nylon & South Cotabato T\'nalak Panel',
    price: 950,
    description:
      'Weather-resistant everyday sling anchored by an authentic T\'nalak abaca-weave front pocket and quick-release buckle.',
    sizes: ['One Size'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.bagOliveSling },
      { color: 'Blue', imageUrl: STUDIO_IMAGES.bagBlueSling },
      { color: 'Black', imageUrl: STUDIO_IMAGES.bagBlack },
    ],
    featured: true,
    badge: 'Artisan Batch',
  },
  {
    id: 'hk-bag-02',
    name: 'Solihiya Rattan Utility Tote',
    category: 'Bags',
    subCategory: 'Tote Bags',
    artisanMaterial: '18oz Canvas, Woven Rattan & Leather Straps',
    price: 1150,
    description:
      'Daily carryall featuring handwoven Philippine rattan cane panels framed in heavy duck canvas.',
    sizes: ['One Size'],
    variants: [
      { color: 'Natural', imageUrl: STUDIO_IMAGES.bagNatural },
      { color: 'Olive', imageUrl: STUDIO_IMAGES.bagToteOlive },
      { color: 'Black', imageUrl: STUDIO_IMAGES.bagToteBlack },
    ],
    featured: true,
    badge: 'Signature Drop',
  },
  {
    id: 'hk-bag-03',
    name: 'Cordillera Waxed Inabel Messenger',
    category: 'Bags',
    subCategory: 'Messenger Bags',
    artisanMaterial: 'Waxed Cotton Canvas & Crimson-Gold Inabel Trim',
    price: 1390,
    description:
      'Structured commuter flap messenger in waxed canvas banded with handwoven crimson-and-gold Cordillera textile.',
    sizes: ['One Size'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.bagMessenger },
      { color: 'Black', imageUrl: STUDIO_IMAGES.bagMessengerBlack },
    ],
    badge: 'New Drop',
  },

  // --- CAPS (3 designs) ---
  {
    id: 'hk-cap-01',
    name: 'Solihiya Side-Panel 6-Panel Cap',
    category: 'Caps',
    subCategory: '6-Panel Caps',
    artisanMaterial: 'Cotton Twill & Bicol Solihiya Weave',
    price: 550,
    description:
      'Structured low-profile 6-panel cap featuring woven rattan-cane side panels and embroidered front emblem.',
    sizes: ['One Size'],
    variants: [
      { color: 'Black', imageUrl: STUDIO_IMAGES.capBlackSolihiya },
      { color: 'White', imageUrl: STUDIO_IMAGES.capWhite },
    ],
    featured: true,
    badge: 'Signature Drop',
  },
  {
    id: 'hk-cap-02',
    name: 'Tres Estrellas Washed Dad Cap',
    category: 'Caps',
    subCategory: 'Dad Caps',
    artisanMaterial: 'Enzyme-Washed Twill & Antique Gold Thread',
    price: 450,
    description:
      'Unstructured 6-panel dad cap embroidered with an antique gold sun and three stars over soft washed cotton.',
    sizes: ['One Size'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.capDadOlive },
      { color: 'Blue', imageUrl: STUDIO_IMAGES.capDadBlue },
      { color: 'Black', imageUrl: STUDIO_IMAGES.capBlack },
    ],
    featured: true,
    badge: 'Bestseller',
  },
  {
    id: 'hk-cap-03',
    name: 'Ilocos Loom-Band Sand Bucket Hat',
    category: 'Caps',
    subCategory: 'Bucket Hats',
    artisanMaterial: 'Heavy Cotton Canvas & Woven Ribbon Crown Band',
    price: 590,
    description:
      'Breathable wide-brim bucket hat wrapped with a handwoven crimson-and-indigo Ilocano geometric headband.',
    sizes: ['S/M', 'L/XL'],
    variants: [
      { color: 'Black', imageUrl: STUDIO_IMAGES.capBucketBlack },
      { color: 'Sand', imageUrl: STUDIO_IMAGES.capBucket },
    ],
    badge: 'New Drop',
  },

  // --- HOODIES (3 designs) ---
  {
    id: 'hk-hoodie-01',
    name: 'Vigan Inabel Cuff Oversized Hoodie',
    category: 'Hoodies',
    subCategory: 'Oversized Hoodies',
    artisanMaterial: '440gsm French Terry & Ilocano Inabel Trim',
    price: 1390,
    description:
      'Drop-shoulder boxy hoodie crafted from combed cotton fleece and finished with handloom Vigan geometric cuff panels.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Olive', imageUrl: STUDIO_IMAGES.hoodieOlive },
      { color: 'Black', imageUrl: STUDIO_IMAGES.hoodieBlack },
    ],
    badge: 'Signature Drop',
  },
  {
    id: 'hk-hoodie-02',
    name: 'Binakul Pocket Heavyweight Pullover',
    category: 'Hoodies',
    subCategory: 'Oversized Hoodies',
    artisanMaterial: 'Loopback Fleece & Ilocos Binakul Pocket',
    price: 1450,
    description:
      'Heavyweight loopback fleece pullover anchored by a hand-cut Ilocos Binakul optical weave chest pocket.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [{ color: 'White', imageUrl: STUDIO_IMAGES.hoodieWhite }],
    badge: 'Artisan Batch',
  },
  {
    id: 'hk-hoodie-03',
    name: 'Kalayaan Baybayin Sun Hoodie',
    category: 'Hoodies',
    subCategory: 'Oversized Hoodies',
    artisanMaterial: '420gsm Organic Cotton & Chain-Stitch Embroidery',
    price: 1290,
    description:
      'Organic cotton pullover featuring raised chain-stitch Baybayin chest lettering and heavy double-lined hood.',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Crimson', imageUrl: STUDIO_IMAGES.hoodieCrimson },
      { color: 'Ochre', imageUrl: STUDIO_IMAGES.hoodieOchre },
    ],
    badge: 'Limited Run',
  },
];

export const INITIAL_CATALOG: Product[] = RAW_SEED.map((item, idx) => {
  const variants: ProductVariant[] = sortVariantsByColor(
    item.variants.map((v, cIdx) => {
      const sizeStock = buildSizeStockMap(
        item.sizes,
        6 + ((idx + cIdx) % 5),
        idx + cIdx * 2,
        cIdx > 0 && (idx + cIdx) % 3 === 0
      );
      const variantTotal = Object.values(sizeStock).reduce((a, b) => a + b, 0);
      return {
        colorName: v.color,
        colorHex: COLOR_HEX[v.color],
        imageUrl: v.imageUrl,
        stock: variantTotal,
        sizeStock,
      };
    })
  );
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const defaultIdx = getDefaultVariantIndex({ name: item.name, variants });
  return {
    id: item.id,
    name: item.name,
    slug: item.id,
    category: item.category,
    subCategory: item.subCategory,
    artisanMaterial: item.artisanMaterial,
    price: item.price,
    description: item.description,
    sizes: item.sizes,
    variants,
    defaultImage: variants[defaultIdx]?.imageUrl || variants[0]?.imageUrl || '',
    featured: Boolean(item.featured),
    badge: item.badge ?? '',
    totalStock,
  };
});

export function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}
