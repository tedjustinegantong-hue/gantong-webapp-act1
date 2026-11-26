import React, { useMemo, useState } from 'react';
import {
  CloudUpload,
  Edit3,
  Lock,
  Package,
  Pin,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  FIELD_LIMITS,
  type OrderStatus,
  type PaymentStatus,
  type Product,
  type ProductCategory,
  type ProductVariant,
} from '../types/store';
import {
  COLOR_HEX,
  formatPHP,
  getDefaultVariantIndex,
  normalizeVariantAppearance,
  stripAssetQuery,
  STUDIO_IMAGE_OPTIONS,
  STUDIO_IMAGES,
} from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { ResilientImage } from './ResilientImage';

interface AdminDashboardProps {
  onBackToCatalog: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'T-Shirts',
  'Hoodies',
  'Shoes',
  'Bags',
  'Caps',
  'Pants & Gear',
];

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'Pay on Delivery',
  'Awaiting Payment',
  'Pending Verification',
  'Paid',
];

function createEmptyProduct(): Product {
  const id = `hk-custom-${Date.now()}`;
  return {
    id,
    name: '',
    slug: id,
    category: 'T-Shirts',
    subCategory: 'Graphic Tees',
    artisanMaterial: '260gsm Combed Cotton & Woven Hem Tag',
    price: 590,
    description: '',
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      normalizeVariantAppearance(
        {
          colorName: 'Black',
          colorHex: COLOR_HEX.Black,
          imageUrl: STUDIO_IMAGES.teeBlack,
          stock: 25,
        },
        STUDIO_IMAGES.teeBlack
      ),
      normalizeVariantAppearance(
        {
          colorName: 'Olive',
          colorHex: COLOR_HEX.Olive,
          imageUrl: STUDIO_IMAGES.teeSage,
          stock: 25,
        },
        STUDIO_IMAGES.teeSage
      ),
    ],
    defaultImage: STUDIO_IMAGES.teeBlack,
    featured: false,
    badge: 'New Drop',
    totalStock: 50,
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToCatalog }) => {
  const {
    user,
    isAdmin,
    products,
    firestoreProductCount,
    outOfSyncCatalogCount,
    allOrders,
    allOrdersLoading,
    signInWithGoogle,
    saveProduct,
    toggleProductPin,
    deleteProduct,
    updateOrderStatus,
    updateOrderPaymentStatus,
    syncCatalogToFirestore,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Product Editor Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sizesInput, setSizesInput] = useState('S, M, L, XL');
  const [savingProduct, setSavingProduct] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pinnedCount = useMemo(
    () => products.filter((p) => p.featured).length,
    [products]
  );

  const unpinnedShoes = useMemo(
    () => products.filter((p) => p.category === 'Shoes' && !p.featured),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter((p) => {
        if (pinnedOnly && !p.featured) return false;
        const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.subCategory.toLowerCase().includes(q) ||
          p.artisanMaterial.toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      })
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [products, searchQuery, categoryFilter, pinnedOnly]);

  const metrics = useMemo(() => {
    const grossRevenue = allOrders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.total, 0);
    const pendingCount = allOrders.filter(
      (o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Preparing'
    ).length;
    return {
      totalProducts: products.length,
      totalOrders: allOrders.length,
      grossRevenue,
      pendingCount,
    };
  }, [products.length, allOrders]);

  if (!user) {
    return (
      <section className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <Lock className="w-10 h-10 text-stone-400 mx-auto stroke-[1.5]" />
        <h1 className="font-display text-2xl font-bold text-[#141413]">
          Admin Authentication Required
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Sign in with your authorized administrator Google account ({ADMIN_EMAIL}) to manage products, color variants, and customer orders.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-6 py-2.5 bg-[#141413] hover:bg-[#9B2226] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="px-5 py-2.5 border border-stone-300 text-sm font-medium rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <Lock className="w-10 h-10 text-[#9B2226] mx-auto stroke-[1.5]" />
        <h1 className="font-display text-2xl font-bold text-[#141413]">
          Access Restricted
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Signed in as <strong>{user.email}</strong>. Full admin privileges are restricted to{' '}
          <strong>{ADMIN_EMAIL}</strong>.
        </p>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="px-6 py-2.5 bg-[#141413] text-white text-sm font-semibold rounded-lg hover:bg-stone-800 cursor-pointer"
        >
          Back to Storefront
        </button>
      </section>
    );
  }

  const openCreateModal = () => {
    const fresh = createEmptyProduct();
    setEditingProduct(fresh);
    setSizesInput(fresh.sizes.join(', '));
    setIsEditMode(false);
    setFormError(null);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({
      ...product,
      variants: product.variants.map((v) => ({ ...v })),
    });
    setSizesInput(product.sizes.join(', '));
    setIsEditMode(true);
    setFormError(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);

    if (editingProduct.name.trim().length < 2) {
      setFormError('Product name must be at least 2 characters.');
      return;
    }
    if (editingProduct.description.trim().length < 4) {
      setFormError('Product description must be at least 4 characters.');
      return;
    }
    if (editingProduct.price <= 0) {
      setFormError('Price must be greater than zero.');
      return;
    }
    if (editingProduct.variants.length === 0) {
      setFormError('At least one color variant is required.');
      return;
    }

    const parsedSizes = sizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const sizes = parsedSizes.length > 0 ? parsedSizes : ['One Size'];

    const baseImageFallback = stripAssetQuery(
      editingProduct.variants[0]?.imageUrl || editingProduct.defaultImage || STUDIO_IMAGES.teeBlack
    );
    const normalizedVariants = editingProduct.variants.map((v) =>
      normalizeVariantAppearance(v, baseImageFallback)
    );

    setSavingProduct(true);
    try {
      await saveProduct(
        {
          ...editingProduct,
          sizes,
          variants: normalizedVariants,
          defaultImage: normalizedVariants[0]?.imageUrl || baseImageFallback,
        },
        isEditMode
      );
      setEditingProduct(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleVariantChange = (
    idx: number,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    if (!editingProduct) return;
    const baseFallback = stripAssetQuery(
      editingProduct.variants[0]?.imageUrl || editingProduct.defaultImage || STUDIO_IMAGES.teeBlack
    );
    const next = editingProduct.variants.map((v, i) => {
      if (i !== idx) return v;
      if (field === 'colorName') {
        const nextColorName = String(value);
        const normalized = normalizeVariantAppearance(
          {
            ...v,
            colorName: nextColorName,
          },
          baseFallback
        );
        return {
          ...normalized,
          colorName: nextColorName,
        };
      }
      if (field === 'imageUrl') {
        const cleanUrl = stripAssetQuery(String(value));
        const matchedOpt = STUDIO_IMAGE_OPTIONS.find((opt) => opt.url === cleanUrl);
        return normalizeVariantAppearance(
          {
            ...v,
            colorName: matchedOpt ? matchedOpt.nativeColor : v.colorName,
            imageUrl: cleanUrl,
          },
          cleanUrl
        );
      }
      if (field === 'colorHex') {
        return {
          ...v,
          colorHex: String(value),
        };
      }
      return { ...v, [field]: value };
    });
    setEditingProduct({ ...editingProduct, variants: next });
  };

  const addVariantRow = () => {
    if (!editingProduct || editingProduct.variants.length >= 8) return;
    const usedUrls = new Set(
      editingProduct.variants.map((v) => stripAssetQuery(v.imageUrl))
    );
    const nextOption =
      STUDIO_IMAGE_OPTIONS.find((opt) => !usedUrls.has(opt.url)) ||
      STUDIO_IMAGE_OPTIONS[0];
    const newVariant = normalizeVariantAppearance(
      {
        colorName: nextOption.nativeColor,
        colorHex: COLOR_HEX[nextOption.nativeColor],
        imageUrl: nextOption.url,
        stock: 15,
      },
      nextOption.url
    );
    setEditingProduct({
      ...editingProduct,
      variants: [...editingProduct.variants, newVariant],
    });
  };

  const removeVariantRow = (idx: number) => {
    if (!editingProduct || editingProduct.variants.length <= 1) return;
    setEditingProduct({
      ...editingProduct,
      variants: editingProduct.variants.filter((_, i) => i !== idx),
    });
  };

  const handleSyncCatalog = async () => {
    setSyncing(true);
    try {
      await syncCatalogToFirestore();
    } finally {
      setSyncing(false);
    }
  };

  const handleTogglePin = async (product: Product) => {
    setPinningId(product.id);
    try {
      await toggleProductPin(product);
    } finally {
      setPinningId(null);
    }
  };

  const handlePinAllShoes = async () => {
    for (const shoe of unpinnedShoes) {
      await toggleProductPin(shoe);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <p className="text-xs font-medium text-[#9B2226]">
            Admin Role Active · {user.email}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#141413] mt-1">
            Store Management Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {outOfSyncCatalogCount > 0 && (
            <button
              type="button"
              onClick={() => void handleSyncCatalog()}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 hover:border-[#141413] text-xs font-semibold text-[#141413] rounded-lg transition-colors cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>
                {syncing
                  ? 'Syncing Catalog...'
                  : `Sync ${outOfSyncCatalogCount} Catalog Items to Firestore`}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#141413] hover:bg-[#9B2226] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs text-stone-500">Catalog Products</p>
          <p className="font-display text-2xl font-bold text-[#141413] mt-1 tabular-nums">
            {metrics.totalProducts}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 tabular-nums">
            {firestoreProductCount} persisted in Firestore
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs text-stone-500">Total Orders</p>
          <p className="font-display text-2xl font-bold text-[#141413] mt-1 tabular-nums">
            {metrics.totalOrders}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Real-time order stream</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs text-stone-500">Gross Revenue</p>
          <p className="font-display text-2xl font-bold text-[#141413] mt-1 tabular-nums">
            {formatPHP(metrics.grossRevenue)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Excludes cancelled orders</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs text-stone-500">Awaiting Dispatch</p>
          <p className="font-display text-2xl font-bold text-[#9B2226] mt-1 tabular-nums">
            {metrics.pendingCount}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Pending / Confirmed / Preparing</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE5] rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'products'
              ? 'bg-white text-[#141413] shadow-sm'
              : 'text-stone-600 hover:text-[#141413]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Products ({products.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-white text-[#141413] shadow-sm'
              : 'text-stone-600 hover:text-[#141413]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Orders ({allOrders.length})</span>
        </button>
      </div>

      {activeTab === 'products' ? (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shoes, tees, or artisan materials..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                />
              </div>

              <div className="flex items-center gap-2">
                {unpinnedShoes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handlePinAllShoes()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-[#141413] hover:border-[#9B2226] hover:text-[#9B2226] whitespace-nowrap cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>Pin All Shoes ({unpinnedShoes.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPinnedOnly((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                    pinnedOnly
                      ? 'bg-[#9B2226] text-white border-[#9B2226]'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-[#141413]'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Pinned ({pinnedCount})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#141413] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-500">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Color Variants</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Home Pin</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 aspect-[4/3] rounded-lg overflow-hidden bg-[#E5E6E8] border border-[#E5E0D8] shrink-0 flex items-center justify-center">
                          <ResilientImage
                            src={
                              product.variants[getDefaultVariantIndex(product)]?.imageUrl ||
                              product.defaultImage
                            }
                            alt={product.name}
                            className="w-full h-full object-contain object-center"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#141413] truncate max-w-[240px]">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate max-w-[240px]">
                            {product.artisanMaterial}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                      {product.category}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {product.variants.map((v) => (
                          <span
                            key={v.colorName}
                            title={v.colorName}
                            className="w-4 h-4 rounded-full border border-stone-300 inline-block"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        ))}
                        <span className="text-stone-500 ml-1 tabular-nums">
                          {product.variants.length}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#141413] tabular-nums whitespace-nowrap">
                      {formatPHP(product.price)}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-stone-600">
                      {product.totalStock}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={pinningId === product.id}
                        onClick={() => void handleTogglePin(product)}
                        aria-pressed={product.featured}
                        aria-label={
                          product.featured
                            ? `Unpin ${product.name} from Home`
                            : `Pin ${product.name} to Home`
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          product.featured
                            ? 'bg-[#9B2226] text-white border-[#9B2226]'
                            : 'bg-white text-stone-600 border-stone-300 hover:border-[#141413] hover:text-[#141413]'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                        <span>{product.featured ? 'Pinned' : 'Pin'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          aria-label={`Edit ${product.name}`}
                          className="p-2 text-stone-600 hover:text-[#141413] hover:bg-stone-100 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteProduct(product.id)}
                          aria-label={`Delete ${product.name}`}
                          className="p-2 text-stone-500 hover:text-[#9B2226] hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Orders Tab */
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {allOrdersLoading ? (
            <div className="p-10 text-center text-sm text-stone-500">Loading customer orders...</div>
          ) : allOrders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShoppingCart className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-[#141413]">No orders received yet</p>
              <p className="text-xs text-stone-500">
                Completed customer checkouts appear here in real time for status fulfillment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-500">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Payment & Settlement</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {allOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-stone-50/70">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#141413] tabular-nums whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#141413]">{order.customerName}</p>
                        <p className="text-[11px] text-stone-500">
                          {order.customerEmail} · {order.city}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-[260px]">
                        {order.items.map((i) => `${i.quantity}x ${i.productName} (${i.colorName})`).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap space-y-1">
                        <div className="font-medium text-[#141413]">
                          {order.paymentMethod}
                          {order.paymentChannel ? (
                            <span className="text-[11px] text-stone-500 font-normal">
                              {' '}
                              · {order.paymentChannel}
                            </span>
                          ) : null}
                        </div>
                        {order.paymentReference && (
                          <p className="font-mono text-[10px] text-stone-500">
                            Ref: {order.paymentReference}
                          </p>
                        )}
                        <select
                          aria-label={`Update payment status for ${order.orderNumber}`}
                          value={order.paymentStatus || 'Pay on Delivery'}
                          onChange={(e) =>
                            void updateOrderPaymentStatus(
                              order.id,
                              e.target.value as PaymentStatus
                            )
                          }
                          className="mt-1 px-2 py-1 text-[11px] font-medium border border-stone-300 rounded bg-white text-[#141413] focus:outline-none focus:border-[#141413] cursor-pointer"
                        >
                          {PAYMENT_STATUSES.map((pst) => (
                            <option key={pst} value={pst}>
                              {pst}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#141413] tabular-nums whitespace-nowrap">
                        {formatPHP(order.total)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          aria-label={`Update status for ${order.orderNumber}`}
                          value={order.status}
                          onChange={(e) =>
                            void updateOrderStatus(order.id, e.target.value as OrderStatus)
                          }
                          className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-lg bg-white text-[#141413] focus:outline-none focus:border-[#141413] cursor-pointer"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={() => setEditingProduct(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl bg-[#F8F7F4] border border-stone-200 rounded-2xl overflow-hidden shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#141413]">
                {isEditMode ? 'Edit Product' : 'Create New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-2 text-stone-500 hover:text-[#141413] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSaveProduct(e)}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#9B2226]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.NAME_MAX}
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category: e.target.value as ProductCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={editingProduct.subCategory}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, subCategory: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Price (PHP)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={500000}
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Badge (optional)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={editingProduct.badge}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, badge: e.target.value })
                    }
                    placeholder="Artisan Batch"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Artisan Material
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={editingProduct.artisanMaterial}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        artisanMaterial: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Sizes (comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    placeholder="S, M, L, XL"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={FIELD_LIMITS.DESC_MAX}
                    value={editingProduct.description}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#141413] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.featured)}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, featured: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#9B2226] rounded cursor-pointer"
                    />
                    <span>Pin product to Home Featured Releases</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Color Variants Builder */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#141413]">
                    Color Variants & Matched Images
                  </h3>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    disabled={editingProduct.variants.length >= 8}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-stone-300 rounded-md hover:border-[#141413] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Color
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editingProduct.variants.map((variant, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-stone-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-stone-500 mb-0.5">
                          Color Name
                        </label>
                        <input
                          type="text"
                          required
                          value={variant.colorName}
                          onChange={(e) =>
                            handleVariantChange(idx, 'colorName', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-stone-500 mb-0.5">
                          Swatch Hex
                        </label>
                        <input
                          type="color"
                          value={variant.colorHex}
                          onChange={(e) =>
                            handleVariantChange(idx, 'colorHex', e.target.value)
                          }
                          className="w-full h-8 p-0.5 border border-stone-300 rounded-md cursor-pointer"
                        />
                      </div>

                      <div className="sm:col-span-5 flex items-center gap-2">
                        <div className="w-10 aspect-[4/3] rounded bg-[#E5E6E8] border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                          <ResilientImage
                            src={stripAssetQuery(variant.imageUrl)}
                            alt={variant.colorName}
                            className="w-full h-full object-contain object-center"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] text-stone-500 mb-0.5">
                            Studio Image Asset
                          </label>
                          <select
                            value={stripAssetQuery(variant.imageUrl)}
                            onChange={(e) =>
                              handleVariantChange(idx, 'imageUrl', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md bg-white"
                          >
                            {STUDIO_IMAGE_OPTIONS.map((opt) => (
                              <option key={opt.url} value={opt.url}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[10px] text-stone-500 mb-0.5">
                          Stock
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={variant.stock}
                          onChange={(e) =>
                            handleVariantChange(idx, 'stock', Number(e.target.value))
                          }
                          className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded-md tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => removeVariantRow(idx)}
                          disabled={editingProduct.variants.length <= 1}
                          className="p-1.5 text-stone-400 hover:text-[#9B2226] disabled:opacity-30 cursor-pointer"
                          aria-label="Remove variant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 bg-[#141413] hover:bg-[#9B2226] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {savingProduct ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
