import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Product, ProductVariant } from '../types/store';
import {
  formatPHP,
  getDefaultVariantIndex,
  getVariantSizeStock,
  getVariantTotalStock,
} from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  preferredColor?: string;
  onSelect: (product: Product, activeVariantIndex: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  preferredColor,
  onSelect,
}) => {
  const { addToCart } = useStore();
  const normalizedPreferred =
    preferredColor && preferredColor !== 'All' ? preferredColor : null;
  const [selectedColorName, setSelectedColorName] = useState<string | null>(
    normalizedPreferred
  );
  const [justAdded, setJustAdded] = useState(false);
  const prevProductIdRef = useRef(product.id);
  const prevPreferredRef = useRef(normalizedPreferred);

  useEffect(() => {
    const productChanged = prevProductIdRef.current !== product.id;
    const preferredChanged = prevPreferredRef.current !== normalizedPreferred;
    if (productChanged || preferredChanged) {
      prevProductIdRef.current = product.id;
      prevPreferredRef.current = normalizedPreferred;
      setSelectedColorName(normalizedPreferred);
    }
  }, [product.id, normalizedPreferred]);

  const defaultIdx = getDefaultVariantIndex(product);
  const matchedIdx = selectedColorName
    ? product.variants.findIndex(
        (v) => v.colorName.trim().toLowerCase() === selectedColorName.trim().toLowerCase()
      )
    : -1;
  const safeIdx = matchedIdx >= 0 ? matchedIdx : defaultIdx;
  const activeVariant: ProductVariant = product.variants[safeIdx] || {
    colorName: 'Standard',
    colorHex: '#0A0A0A',
    imageUrl: product.defaultImage,
    stock: product.totalStock,
  };

  const activeVariantStock = getVariantTotalStock(activeVariant, product.sizes);
  const firstAvailableSize =
    product.sizes.find((sz) => getVariantSizeStock(activeVariant, sz) > 0) ||
    product.sizes[0] ||
    'One Size';

  const preloadVariants = () => {
    for (const v of product.variants) {
      if (v.imageUrl) {
        const img = new Image();
        img.src = v.imageUrl;
      }
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeVariantStock <= 0) return;
    await addToCart(product, activeVariant, firstAvailableSize, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article
      onClick={() => onSelect(product, safeIdx)}
      onMouseEnter={preloadVariants}
      className="group bg-white border border-[#E5E0D8] border-b-2 hover:border-[#B8A58A] hover:border-b-[#171717] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col"
    >
      {/* Consistent 4:3 Studio Container with object-contain & zero CSS filters */}
      <div className="relative aspect-[4/3] bg-[#E5E6E8] flex items-center justify-center overflow-hidden border-b border-[#E5E0D8]/80">
        <ResilientImage
          src={activeVariant.imageUrl}
          alt={`${product.name} — ${activeVariant.colorName}`}
          className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      {/* Minimalist Craft Metadata & Organized Color Swatches */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
            <div className="flex items-center gap-1.5 text-neutral-500 min-w-0">
              <span className="font-medium text-[#171717] shrink-0">{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{product.subCategory}</span>
            </div>
            {product.badge && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600 shrink-0">
                {product.badge}
              </span>
            )}
          </div>

          <h3 className="font-display text-[17px] font-semibold text-[#171717] leading-snug line-clamp-2 group-hover:text-black transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{product.artisanMaterial}</p>
        </div>

        {/* Organized Color Options & Quick-Add Bar */}
        <div className="space-y-2.5 pt-3 border-t border-[#E5E0D8]/80">
          <div
            className="flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {product.variants.map((variant, idx) => {
                const isSelected = idx === safeIdx;
                const variantTotal = getVariantTotalStock(variant, product.sizes);
                const isOut = variantTotal <= 0;
                return (
                  <button
                    key={`${product.id}-${variant.colorName}`}
                    type="button"
                    disabled={isOut}
                    title={`${variant.colorName}${isOut ? ' (Out of stock)' : ''}`}
                    aria-label={`Select ${variant.colorName} color for ${product.name}`}
                    aria-pressed={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOut) setSelectedColorName(variant.colorName);
                    }}
                    className={`w-5 h-5 rounded-full border shrink-0 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] ${
                      isOut
                        ? 'border-neutral-300 opacity-35 cursor-not-allowed'
                        : isSelected
                          ? 'border-[#171717] ring-2 ring-[#171717] ring-offset-2 ring-offset-white scale-110 cursor-pointer'
                          : 'border-neutral-400 hover:border-[#171717] hover:scale-105 cursor-pointer'
                    }`}
                    style={{ backgroundColor: variant.colorHex }}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-medium text-neutral-600 shrink-0">
              Color: <span className="text-[#171717] font-semibold">{activeVariant.colorName}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-[#171717] tabular-nums">
              {formatPHP(product.price)}
            </span>
            <button
              type="button"
              disabled={activeVariantStock <= 0}
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} in ${activeVariant.colorName} to bag`}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                activeVariantStock <= 0
                  ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                  : justAdded
                    ? 'bg-[#596653] text-white cursor-pointer'
                    : 'bg-[#171717] text-white hover:bg-neutral-800 cursor-pointer'
              }`}
            >
              {activeVariantStock <= 0 ? (
                <span>Sold Out</span>
              ) : justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
