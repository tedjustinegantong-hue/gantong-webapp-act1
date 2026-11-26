import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, CheckCircle2, Search, SlidersHorizontal } from 'lucide-react';
import type { Product, ProductCategory } from './types/store';
import {
  COLOR_DISPLAY_ORDER,
  formatPHP,
  resolveColorHex,
  STUDIO_IMAGES,
} from './data/catalog';
import { StoreProvider, useStore } from './context/StoreContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar, type AppView } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { OrderHistoryView } from './components/OrderHistoryView';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginView } from './components/LoginView';
import { ResilientImage } from './components/ResilientImage';

const CATEGORY_TABS: Array<{ label: string; value: 'All' | ProductCategory }> = [
  { label: 'All Pieces', value: 'All' },
  { label: 'T-Shirts & Polos', value: 'T-Shirts' },
  { label: 'Shoes', value: 'Shoes' },
  { label: 'Bags', value: 'Bags' },
  { label: 'Caps', value: 'Caps' },
  { label: 'Hoodies', value: 'Hoodies' },
  { label: 'Pants & Gear', value: 'Pants & Gear' },
];

const CATEGORY_ORDER: ProductCategory[] = [
  'Shoes',
  'T-Shirts',
  'Bags',
  'Caps',
  'Pants & Gear',
  'Hoodies',
];

function interleaveByCategory(items: Product[]): Product[] {
  const buckets = new Map<ProductCategory, Product[]>();
  for (const cat of CATEGORY_ORDER) {
    buckets.set(cat, []);
  }
  for (const item of items) {
    const list = buckets.get(item.category);
    if (list) list.push(item);
    else buckets.set(item.category, [item]);
  }

  const result: Product[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const cat of CATEGORY_ORDER) {
      const list = buckets.get(cat);
      if (list && list.length > 0) {
        const next = list.shift();
        if (next) {
          result.push(next);
          added = true;
        }
      }
    }
  }
  return result;
}

const CURATED_SPOTLIGHTS: Array<{
  title: string;
  subtitle: string;
  category: ProductCategory;
  image: string;
  alt: string;
}> = [
  {
    title: 'Marikina Footwear',
    subtitle: '6 hand-lasted silhouettes',
    category: 'Shoes',
    image: STUDIO_IMAGES.sneakerIndigo,
    alt: 'Indigo handloom runner crafted by Marikina shoemakers',
  },
  {
    title: 'Tees & Polos',
    subtitle: 'Inabel plackets & boxy cotton',
    category: 'T-Shirts',
    image: STUDIO_IMAGES.poloOchre,
    alt: 'Ochre knit streetwear polo shirt with woven placket',
  },
  {
    title: 'Woven Carryalls',
    subtitle: 'Rattan & Mindanao T\'nalak',
    category: 'Bags',
    image: STUDIO_IMAGES.bagNatural,
    alt: 'Natural woven rattan and canvas utility tote bag',
  },
  {
    title: 'Solihiya Headwear',
    subtitle: 'Bicol cane & twill caps',
    category: 'Caps',
    image: STUDIO_IMAGES.capWhite,
    alt: 'Chalk white 6-panel cap with woven rattan side panels',
  },
];

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

const StorefrontShell: React.FC = () => {
  const { products, isAdmin, toastMessage } = useStore();

  const [activeView, setActiveView] = useState<AppView>('home');
  const [cartOpen, setCartOpen] = useState(false);

  // Catalog Filters
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Product Detail Modal (derived from live catalog by ID to avoid stale stock or accidental resets)
  const [modalProductId, setModalProductId] = useState<string | null>(null);
  const [modalVariantIdx, setModalVariantIdx] = useState(0);
  const [modalSessionId, setModalSessionId] = useState(0);

  const modalProduct = useMemo(
    () => (modalProductId ? products.find((p) => p.id === modalProductId) ?? null : null),
    [products, modalProductId]
  );

  const minPrice = useMemo(
    () => (products.length > 0 ? Math.min(...products.map((p) => p.price)) : 450),
    [products]
  );

  const featuredProducts = useMemo(() => {
    const pinned = products.filter((p) => p.featured);
    const shoesFirst = pinned.filter((p) => p.category === 'Shoes');
    const restInterleaved = interleaveByCategory(pinned.filter((p) => p.category !== 'Shoes'));
    // Interleave Shoes and rest cleanly so the Home grid opens with varied silhouettes & all 5 shoe designs
    const combined: Product[] = [];
    const maxLen = Math.max(shoesFirst.length, restInterleaved.length);
    for (let i = 0; i < maxLen; i++) {
      if (shoesFirst[i]) combined.push(shoesFirst[i]);
      if (restInterleaved[i * 2]) combined.push(restInterleaved[i * 2]);
      if (restInterleaved[i * 2 + 1]) combined.push(restInterleaved[i * 2 + 1]);
    }
    return combined;
  }, [products]);

  const subCategories = useMemo(() => {
    const set = new Set<string>();
    products
      .filter((p) => selectedCategory === 'All' || p.category === selectedCategory)
      .forEach((p) => set.add(p.subCategory));
    return ['All', ...Array.from(set)];
  }, [products, selectedCategory]);

  const availableColors = useMemo(() => {
    const counts = new Map<string, { name: string; hex: string; count: number }>();
    const scoped = products.filter(
      (p) =>
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (selectedSubCategory === 'All' || p.subCategory === selectedSubCategory)
    );
    for (const p of scoped) {
      const seenForProduct = new Set<string>();
      for (const v of p.variants) {
        const key = v.colorName.trim().toLowerCase();
        if (seenForProduct.has(key)) continue;
        seenForProduct.add(key);
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, {
            name: v.colorName.trim(),
            hex: resolveColorHex(v.colorName, v.colorHex),
            count: 1,
          });
        }
      }
    }
    const orderIdx = new Map<string, number>(
      COLOR_DISPLAY_ORDER.map((c, idx) => [c.toLowerCase(), idx])
    );
    return Array.from(counts.values()).sort((a, b) => {
      const ai = orderIdx.get(a.name.toLowerCase()) ?? 999;
      const bi = orderIdx.get(b.name.toLowerCase()) ?? 999;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
  }, [products, selectedCategory, selectedSubCategory]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const colorQ = selectedColor.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (selectedSubCategory !== 'All' && p.subCategory !== selectedSubCategory) return false;
      if (
        selectedColor !== 'All' &&
        !p.variants.some((v) => v.colorName.trim().toLowerCase() === colorQ)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.subCategory.toLowerCase().includes(q) ||
        p.artisanMaterial.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const pinned = sorted.filter((p) => p.featured);
      const regular = sorted.filter((p) => !p.featured);
      return [...interleaveByCategory(pinned), ...interleaveByCategory(regular)];
    }
    return sorted;
  }, [products, selectedCategory, selectedSubCategory, selectedColor, searchQuery, sortBy]);

  const handleNavigate = (view: AppView, category?: 'All' | ProductCategory) => {
    setActiveView(view);
    if (view === 'shop' && category) {
      setSelectedCategory(category);
      setSelectedSubCategory('All');
      setSelectedColor('All');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (cat: 'All' | ProductCategory) => {
    setSelectedCategory(cat);
    setSelectedSubCategory('All');
    setSelectedColor('All');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#171717]">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'login' ? (
          <LoginView
            onNavigate={handleNavigate}
            onBackToStore={() => handleNavigate('shop', 'All')}
          />
        ) : activeView === 'orders' ? (
          <OrderHistoryView
            onBackToCatalog={() => handleNavigate('shop', 'All')}
            onOpenLogin={() => handleNavigate('login')}
          />
        ) : activeView === 'admin' ? (
          <AdminDashboard onBackToCatalog={() => handleNavigate('shop', 'All')} />
        ) : activeView === 'shop' ? (
          /* PAGE 2: SHOP — Full Streetwear Catalog */
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E9E0D2]">
              <div>
                <p className="text-xs font-medium text-[#596653]">
                  HABI Collection · Nationwide Delivery
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#171717] mt-1">
                  Streetwear Catalog
                </h1>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative sm:w-72">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tees, Marikina, T'nalak..."
                    aria-label="Search catalog products"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E9E0D2] rounded-lg focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-neutral-500 shrink-0" />
                  <select
                    aria-label="Sort products"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2.5 text-sm bg-white border border-[#E9E0D2] rounded-lg focus:outline-none focus:border-[#171717] cursor-pointer"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs & Subcategory Strip */}
            <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 p-1 bg-[#E9E0D2]/60 rounded-lg overflow-x-auto">
                {CATEGORY_TABS.map((tab) => {
                  const count =
                    tab.value === 'All'
                      ? products.length
                      : products.filter((p) => p.category === tab.value).length;
                  const active = selectedCategory === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleCategoryChange(tab.value)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#171717] shadow-sm'
                          : 'text-neutral-600 hover:text-[#171717]'
                      }`}
                    >
                      {tab.label} <span className="tabular-nums opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                {subCategories.length > 2 && (
                  <select
                    aria-label="Filter by subcategory"
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#E9E0D2] rounded-lg text-xs font-medium text-[#171717] cursor-pointer"
                  >
                    {subCategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub === 'All' ? 'All Silhouettes' : sub}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-stone-500 tabular-nums whitespace-nowrap">
                  Showing {filteredProducts.length} of {products.length}
                </span>
              </div>
            </div>

            {/* Organized Color Filter Strip */}
            <div className="pb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-600 mr-1">Color:</span>
              <button
                type="button"
                onClick={() => setSelectedColor('All')}
                aria-pressed={selectedColor === 'All'}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  selectedColor === 'All'
                    ? 'bg-[#171717] text-white border-[#171717]'
                    : 'bg-white text-neutral-700 border-[#E5E0D8] hover:border-[#171717]'
                }`}
              >
                All Colors
              </button>
              {availableColors.map((col) => {
                const isSelected = selectedColor.toLowerCase() === col.name.toLowerCase();
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() =>
                      setSelectedColor(isSelected ? 'All' : col.name)
                    }
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-white text-neutral-700 border-[#E5E0D8] hover:border-[#171717]'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                        isSelected ? 'border-white/70' : 'border-neutral-300'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    />
                    <span>{col.name}</span>
                    <span
                      className={`tabular-nums text-[11px] ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-400'
                      }`}
                    >
                      ({col.count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3-Column Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl space-y-3">
                <p className="text-base font-semibold text-[#141413]">
                  No pieces matched your current filters
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedSubCategory('All');
                    setSelectedColor('All');
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-[#141413] text-white rounded-lg cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    preferredColor={selectedColor === 'All' ? undefined : selectedColor}
                    onSelect={(p, activeVarIdx) => {
                      setModalProductId(p.id);
                      setModalVariantIdx(activeVarIdx);
                      setModalSessionId((n) => n + 1);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ) : activeView === 'craft' ? (
          /* PAGE 3: CRAFT — Material Provenance & Local Artisan Guilds */
          <section className="bg-[#171717] text-[#F7F4EE] min-h-[75vh]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 space-y-14">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                <div className="lg:col-span-6">
                  <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden bg-stone-800">
                    <ResilientImage
                      src={STUDIO_IMAGES.craftEditorial}
                      alt="Filipino artisan handloom Inabel weaving and Marikina leather shoemaking tools"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="lg:col-span-6 flex flex-col justify-between gap-8 py-2">
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-[#E09F3E] tracking-wide">
                      HABI Material Provenance
                    </p>
                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance">
                      Every seam preserves a regional Filipino craft lineage.
                    </h1>
                    <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
                      We partner directly with family-run handloom cooperatives in Ilocos Sur and South Cotabato alongside independent cobblers in Marikina—ensuring fair craft commissions and authentic small-batch materials on modern street proportions.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleNavigate('shop', 'Shoes')}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#F8F7F4] hover:bg-[#E09F3E] text-[#141413] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Shop Marikina Footwear</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('shop', 'T-Shirts')}
                      className="px-5 py-3 border border-stone-600 hover:border-stone-300 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Browse Tees &amp; Polos
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-stone-800 text-sm">
                <div>
                  <h2 className="font-semibold text-white text-base">Ilocano Inabel &amp; Binakul</h2>
                  <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                    Pedal-loomed cotton geometric panels woven in Vigan and Bangar, integrated into polo plackets, pockets, and hoodie cuffs.
                  </p>
                </div>
                <div>
                  <h2 className="font-semibold text-white text-base">Marikina Footwear Guild</h2>
                  <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                    Full-grain leather, banig mat weave, and abaca uppers hand-lasted with natural gum cupsoles for enduring street wear.
                  </p>
                </div>
                <div>
                  <h2 className="font-semibold text-white text-base">Mindanao T&apos;nalak Abaca</h2>
                  <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                    Hand-dyed abaca fiber panels anchoring technical ballistic nylon slings and commuter packs.
                  </p>
                </div>
                <div>
                  <h2 className="font-semibold text-white text-base">Bicol Solihiya Cane</h2>
                  <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                    Open-weave rattan cane inlaid into structured 6-panel caps and heavy canvas carryalls.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* PAGE 1: HOME — Editorial Storefront Hero, Curated Directory & Featured Releases */
          <>
            <section className="bg-[#E9E0D2]/45">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                  <div className="lg:col-span-5 flex flex-col justify-between gap-8 py-2">
                    <div className="space-y-5">
                      <p className="text-xs font-medium text-[#596653]">
                        HABI Manila · Handwoven Streetwear
                      </p>
                      <h1 className="font-display text-[clamp(2.25rem,4vw,3.6rem)] font-bold tracking-tight leading-[1.06] text-[#171717] text-balance">
                        Woven by local hands, tailored for Manila streets.
                      </h1>
                      <p className="text-base text-neutral-700 leading-relaxed max-w-md">
                        Everyday Filipino streetwear at honest prices—breathable graphic tees, woven-placket polo shirts, straight-leg pants, and Marikina footwear crafted with Ilocano Inabel and Mindanao T&apos;nalak.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleNavigate('shop', 'All')}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#171717] hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Shop {products.length}-Piece Collection</span>
                          <ArrowDownRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('craft')}
                          className="px-5 py-3 bg-white border border-[#B8A58A] hover:border-[#171717] text-sm font-medium text-[#171717] rounded-lg transition-colors cursor-pointer"
                        >
                          Our Craft
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[#B8A58A]/45 text-xs">
                        <div>
                          <span className="block font-semibold text-[#171717] tabular-nums">
                            From {formatPHP(minPrice)}
                          </span>
                          <span className="text-neutral-600">Accessible Streetwear</span>
                        </div>
                        <div>
                          <span className="block font-semibold text-[#171717]">
                            4 Weaving Regions
                          </span>
                          <span className="text-neutral-600">Ilocos to Cotabato</span>
                        </div>
                        <div>
                          <span className="block font-semibold text-[#171717]">
                            Marikina Built
                          </span>
                          <span className="text-neutral-600">Hand-Lasted Footwear</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="h-full min-h-[300px] lg:min-h-[440px] rounded-2xl overflow-hidden bg-[#E9E0D2] border border-[#E9E0D2]">
                      <ResilientImage
                        src={STUDIO_IMAGES.hero}
                        alt="Filipino streetwear models wearing clean polo shirts, straight-leg cotton pants, and white Marikina leather sneakers"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Minimalist Filipino Earth-Tone Divider */}
            <div className="grid grid-cols-4 h-[3px]" aria-hidden="true">
              <div className="bg-[#171717]" />
              <div className="bg-[#596653]" />
              <div className="bg-[#B8A58A]" />
              <div className="bg-[#E9E0D2]" />
            </div>

            {/* Curated Silhouettes Visual Directory */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {CURATED_SPOTLIGHTS.map((item) => {
                  const catCount = products.filter((p) => p.category === item.category).length;
                  return (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() => handleNavigate('shop', item.category)}
                      className="group text-left bg-white border border-[#E9E0D2] hover:border-[#171717] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-[#E5E6E8] flex items-center justify-center overflow-hidden border-b border-[#E5E0D8]/80">
                        <ResilientImage
                          src={item.image}
                          alt={item.alt}
                          className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="p-3.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-display text-sm font-bold text-[#171717] group-hover:text-black transition-colors truncate">
                            {item.title}
                          </h2>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-[#596653] shrink-0">
                          {catCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Featured Collection Preview */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E9E0D2]">
                <div>
                  <p className="text-xs font-medium text-[#596653]">Pinned by Studio</p>
                  <h2 className="font-display text-3xl font-bold text-[#171717] mt-1">
                    Featured Releases
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate('shop', 'All')}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#171717] hover:text-[#596653] transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span>Browse All {products.length} Pieces</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p, activeVarIdx) => {
                      setModalProductId(p.id);
                      setModalVariantIdx(activeVarIdx);
                      setModalSessionId((n) => n + 1);
                    }}
                  />
                ))}
              </div>

              {/* Category Shortcuts into Shop Page */}
              <div className="pt-8 border-t border-[#E9E0D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORY_TABS.filter((t) => t.value !== 'All').map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleNavigate('shop', tab.value)}
                      className="px-3.5 py-2 text-xs font-medium bg-white border border-[#E9E0D2] hover:border-[#171717] rounded-lg text-[#171717] transition-colors cursor-pointer"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate('shop', 'All')}
                  className="px-5 py-2.5 bg-[#171717] hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
                >
                  Open Full Shop
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#E9E0D2] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-500">
          <div className="space-y-1">
            <p className="font-display text-sm font-bold text-[#171717]">HABI</p>
            <p>Escolta &amp; Marikina Studio · Nationwide Philippines Dispatch (Free shipping ₱1,999+)</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate('home')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('shop', 'All')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('craft')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Craft
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('orders')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Order History
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('login')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Member Login
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigate('admin')}
                className="text-[#141413] font-medium hover:underline cursor-pointer"
              >
                Admin Dashboard
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductDetailModal
        key={modalProduct ? `${modalProduct.id}-${modalSessionId}` : 'closed'}
        product={modalProduct}
        initialVariantIndex={modalVariantIdx}
        onClose={() => setModalProductId(null)}
        onOpenCart={() => setCartOpen(true)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onViewOrders={() => handleNavigate('orders')}
        onOpenLogin={() => {
          setCartOpen(false);
          handleNavigate('login');
        }}
      />

      {/* Action Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#141413] text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-stone-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <StorefrontShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
