import React, { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import type { Product, ProductVariant } from '../types/store';
import {
  formatPHP,
  getVariantSizeStock,
  getVariantTotalStock,
} from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { ResilientImage } from './ResilientImage';

interface ProductDetailModalProps {
  product: Product | null;
  initialVariantIndex?: number;
  onClose: () => void;
  onOpenCart: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  initialVariantIndex = 0,
  onClose,
  onOpenCart,
}) => {
  const { addToCart } = useStore();
  const initialSafeIdx =
    product && initialVariantIndex < product.variants.length ? initialVariantIndex : 0;
  const initialColor = product?.variants[initialSafeIdx]?.colorName ?? '';
  const [selectedColorName, setSelectedColorName] = useState(initialColor);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeNotice, setSizeNotice] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const productId = product?.id ?? '';

  useEffect(() => {
    if (!product) return;
    const safeVarIdx =
      initialVariantIndex < product.variants.length ? initialVariantIndex : 0;
    const initialVar = product.variants[safeVarIdx] || product.variants[0];
    const firstInStockSize =
      product.sizes.find((sz) => getVariantSizeStock(initialVar, sz) > 0) ||
      product.sizes[0] ||
      'One Size';

    setSelectedColorName(initialVar?.colorName ?? '');
    setSelectedSize(firstInStockSize);
    setQuantity(1);
    setSizeNotice(null);
    setAddedFeedback(false);

    // Preload all variant studio photography for instant color switches
    for (const v of product.variants) {
      if (v.imageUrl) {
        const preload = new Image();
        preload.src = v.imageUrl;
      }
    }
    // Intentionally keyed by productId & initialVariantIndex so live Firestore stock refreshes never reset selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, initialVariantIndex]);

  useEffect(() => {
    if (!productId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [productId, onClose]);

  const resolvedIdx = product
    ? product.variants.findIndex(
        (v) => v.colorName.trim().toLowerCase() === selectedColorName.trim().toLowerCase()
      )
    : -1;
  const safeVarIdx = resolvedIdx >= 0 ? resolvedIdx : 0;

  useEffect(() => {
    const activeThumb = thumbRefs.current[safeVarIdx];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [safeVarIdx]);

  if (!product) return null;

  const activeVariant: ProductVariant = product.variants[safeVarIdx] || product.variants[0];
  const currentSize = selectedSize || product.sizes[0] || 'One Size';
  const activeComboStock = getVariantSizeStock(activeVariant, currentSize);
  const effectiveQty = Math.max(1, Math.min(activeComboStock || 1, quantity));

  const handleSelectColor = (idx: number) => {
    const nextVariant = product.variants[idx];
    if (!nextVariant) return;
    if (getVariantTotalStock(nextVariant, product.sizes) <= 0) return;

    setSelectedColorName(nextVariant.colorName);
    setAddedFeedback(false);

    // Preserve selectedSize unless that exact size is unavailable in the new color
    const currentSizeAvailable = getVariantSizeStock(nextVariant, currentSize) > 0;
    const nextSize = currentSizeAvailable
      ? currentSize
      : product.sizes.find((sz) => getVariantSizeStock(nextVariant, sz) > 0) || currentSize;
    if (nextSize !== currentSize) {
      setSelectedSize(nextSize);
      setSizeNotice(
        `${currentSize} is out of stock in ${nextVariant.colorName} — switched to ${nextSize}.`
      );
    } else {
      setSizeNotice(null);
    }

    const nextStock = getVariantSizeStock(nextVariant, nextSize);
    if (nextStock > 0 && quantity > nextStock) {
      setQuantity(nextStock);
    }
  };

  const handleSelectSize = (sz: string) => {
    const stockForSize = getVariantSizeStock(activeVariant, sz);
    if (stockForSize <= 0) return;
    // Never reset selected color when choosing a size
    setSelectedSize(sz);
    setSizeNotice(null);
    setAddedFeedback(false);
    if (quantity > stockForSize) {
      setQuantity(stockForSize);
    }
  };

  const handleAddToCart = async () => {
    if (!activeVariant || activeComboStock <= 0) return;
    await addToCart(product, activeVariant, currentSize, effectiveQty);
    setAddedFeedback(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-[#E9E0D2] rounded-2xl overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 border border-[#E9E0D2] flex items-center justify-center text-[#171717] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Dynamic Color-Variant 4:3 Studio Gallery */}
          <div className="bg-[#FAF8F4] border-b md:border-b-0 md:border-r border-[#E5E0D8] flex flex-col justify-between p-5 sm:p-6">
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#E5E6E8] border border-[#E5E0D8] flex items-center justify-center">
              <ResilientImage
                src={activeVariant.imageUrl}
                alt={`${product.name} — ${activeVariant.colorName}`}
                className="w-full h-full object-contain object-center"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#171717]">
                <span
                  className="w-3 h-3 rounded-full border border-neutral-400 shrink-0"
                  style={{ backgroundColor: activeVariant.colorHex }}
                />
                Viewing: {activeVariant.colorName}
              </span>
              <span className="tabular-nums text-neutral-500">
                {safeVarIdx + 1} of {product.variants.length} colors
              </span>
            </div>

            {/* Smooth-Scrolling Synchronized Color Variant Thumbnail Gallery */}
            <div className="mt-2.5 flex items-start gap-2.5 overflow-x-auto scroll-smooth pb-1">
              {product.variants.map((v, idx) => {
                const isActive = idx === safeVarIdx;
                const colorTotal = getVariantTotalStock(v, product.sizes);
                return (
                  <button
                    key={`${product.id}-thumb-${v.colorName}-${idx}`}
                    ref={(el) => {
                      thumbRefs.current[idx] = el;
                    }}
                    type="button"
                    title={`${v.colorName}${colorTotal <= 0 ? ' (Out of stock)' : ''}`}
                    aria-label={`Preview ${v.colorName} color`}
                    aria-pressed={isActive}
                    disabled={colorTotal <= 0}
                    onClick={() => handleSelectColor(idx)}
                    className={`group/thumb flex flex-col items-center gap-1 shrink-0 transition-opacity ${
                      colorTotal <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div
                      className={`relative w-20 aspect-[4/3] rounded-lg overflow-hidden bg-[#E5E6E8] flex items-center justify-center transition-all ${
                        isActive
                          ? 'border-2 border-[#171717] ring-2 ring-[#171717]/20'
                          : 'border border-[#D6D0C6] group-hover/thumb:border-[#78716C]'
                      }`}
                    >
                      <ResilientImage
                        src={v.imageUrl}
                        alt={`${product.name} — ${v.colorName}`}
                        className="w-full h-full object-contain object-center"
                      />
                    </div>
                    <span
                      className={`text-[10px] leading-tight ${
                        isActive ? 'font-semibold text-[#171717]' : 'text-neutral-500'
                      }`}
                    >
                      {v.colorName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>{product.subCategory}</span>
                {product.badge && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-700 font-medium">{product.badge}</span>
                  </>
                )}
              </div>

              <h2
                id="pdp-title"
                className="font-display text-2xl sm:text-3xl font-bold text-[#171717] leading-tight"
              >
                {product.name}
              </h2>

              <div className="flex items-baseline justify-between gap-4">
                <span className="text-2xl font-semibold text-[#171717] tabular-nums">
                  {formatPHP(product.price)}
                </span>
                <span
                  className={`text-xs font-medium tabular-nums ${
                    activeComboStock > 0 ? 'text-stone-600' : 'text-[#8B1E24]'
                  }`}
                >
                  {activeComboStock > 0
                    ? `${activeComboStock} available · ${activeVariant.colorName} / ${currentSize}`
                    : `Unavailable · ${activeVariant.colorName} / ${currentSize}`}
                </span>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">{product.description}</p>

              <div className="pt-2 border-t border-[#E9E0D2]">
                <p className="text-xs text-stone-500">
                  Crafted Material: <span className="text-[#171717] font-medium">{product.artisanMaterial}</span>
                </p>
              </div>

              {/* Color Variant Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-700">
                    Available Colors ({product.variants.length}) · Selected:{' '}
                    <span className="text-[#171717] font-semibold">{activeVariant.colorName}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {product.variants.map((variant, idx) => {
                    const isSelected = idx === safeVarIdx;
                    const colorTotal = getVariantTotalStock(variant, product.sizes);
                    const isOutOfStock = colorTotal <= 0;
                    return (
                      <button
                        key={`${product.id}-opt-${variant.colorName}-${idx}`}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isOutOfStock}
                        onClick={() => handleSelectColor(idx)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          isOutOfStock
                            ? 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed line-through'
                            : isSelected
                              ? 'border-[#171717] bg-[#E9E0D2]/55 text-[#171717] ring-1 ring-[#171717] shadow-sm cursor-pointer'
                              : 'border-[#E9E0D2] bg-white text-neutral-700 hover:border-[#B8A58A] cursor-pointer'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border shrink-0 ${
                            isSelected ? 'border-[#171717]' : 'border-neutral-400'
                          }`}
                          style={{ backgroundColor: variant.colorHex }}
                        />
                        <span>{variant.colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Selection (Per Color+Size Availability) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-700">
                    Size:{' '}
                    <span className="text-[#171717] font-semibold">{currentSize}</span>
                  </span>
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {activeComboStock > 0
                      ? `${activeComboStock} units left`
                      : 'Out of stock'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((sz) => {
                    const szStock = getVariantSizeStock(activeVariant, sz);
                    const isUnavailable = szStock <= 0;
                    const isSelected = currentSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={isUnavailable}
                        aria-disabled={isUnavailable}
                        aria-pressed={isSelected}
                        title={
                          isUnavailable
                            ? `${activeVariant.colorName} / ${sz} is out of stock`
                            : `${szStock} available in ${activeVariant.colorName} / ${sz}`
                        }
                        onClick={() => handleSelectSize(sz)}
                        className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          isUnavailable
                            ? 'bg-neutral-100 text-neutral-400 border-neutral-200 line-through cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#171717] text-white border-[#171717] cursor-pointer'
                              : 'bg-white text-stone-700 border-[#E9E0D2] hover:border-[#B8A58A] cursor-pointer'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
                {sizeNotice && (
                  <p className="text-[11px] text-neutral-600">{sizeNotice}</p>
                )}
              </div>
            </div>

            {/* Quantity & Add to Cart Action */}
            <div className="space-y-3 pt-4 border-t border-[#E9E0D2]">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-[#E9E0D2] rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={effectiveQty <= 1 || activeComboStock <= 0}
                    aria-label="Decrease quantity"
                    className="w-10 h-11 flex items-center justify-center text-stone-700 hover:bg-[#FAF8F4] disabled:opacity-40 rounded-l-lg cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">
                    {activeComboStock <= 0 ? 0 : effectiveQty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(Math.max(1, activeComboStock), 20, q + 1))
                    }
                    disabled={effectiveQty >= activeComboStock || activeComboStock <= 0}
                    aria-label="Increase quantity"
                    className="w-10 h-11 flex items-center justify-center text-stone-700 hover:bg-[#FAF8F4] disabled:opacity-40 rounded-r-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleAddToCart()}
                  disabled={activeComboStock <= 0}
                  className={`flex-1 h-11 px-5 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${
                    addedFeedback
                      ? 'bg-[#596653] hover:bg-[#495544]'
                      : 'bg-[#171717] hover:bg-neutral-800'
                  }`}
                >
                  {activeComboStock <= 0 ? (
                    <span>Out of Stock</span>
                  ) : addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added ({activeVariant.colorName} · {currentSize})</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart · {formatPHP(product.price * effectiveQty)}</span>
                    </>
                  )}
                </button>
              </div>

              {addedFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCart();
                  }}
                  className="w-full py-2.5 px-4 bg-[#E9E0D2]/60 hover:bg-[#E9E0D2] text-[#171717] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Open Shopping Bag &amp; Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
