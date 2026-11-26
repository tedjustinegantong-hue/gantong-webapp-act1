import React from 'react';
import { CheckCircle2, Clock, Package, ShoppingBag, Truck, XCircle } from 'lucide-react';
import type { OrderStatus, PaymentStatus } from '../types/store';
import { formatPHP, resolveSafeVariantImageUrl } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { ResilientImage } from './ResilientImage';
import { PaymentMethodBadge } from './PaymentLogos';

interface OrderHistoryViewProps {
  onBackToCatalog: () => void;
  onOpenLogin?: () => void;
}

function getStatusDisplay(status: OrderStatus) {
  switch (status) {
    case 'Pending':
      return { icon: Clock, label: 'Pending Confirmation', style: 'text-amber-800 bg-amber-50 border-amber-200' };
    case 'Confirmed':
      return { icon: CheckCircle2, label: 'Confirmed', style: 'text-sky-800 bg-sky-50 border-sky-200' };
    case 'Preparing':
      return { icon: Package, label: 'Preparing Shipment', style: 'text-indigo-800 bg-indigo-50 border-indigo-200' };
    case 'Shipped':
      return { icon: Truck, label: 'In Transit', style: 'text-emerald-800 bg-emerald-50 border-emerald-200' };
    case 'Delivered':
      return { icon: CheckCircle2, label: 'Delivered', style: 'text-emerald-900 bg-emerald-100 border-emerald-300' };
    case 'Cancelled':
      return { icon: XCircle, label: 'Cancelled', style: 'text-stone-600 bg-stone-100 border-stone-300' };
  }
}

function formatOrderDate(createdAt: unknown): string {
  if (!createdAt) return 'Just now';
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toDate' in createdAt &&
    typeof (createdAt as { toDate: () => Date }).toDate === 'function'
  ) {
    return (createdAt as { toDate: () => Date }).toDate().toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return 'Recent order';
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  onBackToCatalog,
  onOpenLogin,
}) => {
  const { user, products, orders, ordersLoading, signInWithGoogle, cancelOrder } = useStore();

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[70vh]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-stone-200">
        <div>
          <p className="text-xs font-medium text-stone-500">Customer Account</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#141413] mt-1">
            Order History
          </h1>
        </div>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="px-4 py-2 text-xs font-semibold border border-stone-300 rounded-lg hover:bg-stone-100 text-[#141413] transition-colors self-start sm:self-auto cursor-pointer"
        >
          Back to Catalog
        </button>
      </div>

      {!user ? (
        <div className="mt-10 bg-white border border-stone-200 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-4">
          <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto stroke-[1.5]" />
          <h2 className="font-display text-xl font-bold text-[#141413]">
            Sign in to view your Order History
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Completed purchases are securely tied to your Habing Kalye account so you can track shipments and review past drops across devices.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-6 py-3 bg-[#141413] hover:bg-[#292524] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Sign In / Register
              </button>
            )}
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-5 py-3 bg-[#EFECE5] hover:bg-stone-200 text-[#141413] text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Continue with Google
            </button>
          </div>
        </div>
      ) : !user.emailVerified ? (
        <div className="mt-10 bg-white border border-stone-200 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-4">
          <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto stroke-[1.5]" />
          <h2 className="font-display text-xl font-bold text-[#141413]">
            Verify your email to view Order History
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Please verify your email address via the link sent to {user.email} before accessing saved orders.
          </p>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-6 py-3 bg-[#141413] hover:bg-[#292524] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Open Account Verification
            </button>
          )}
        </div>
      ) : ordersLoading ? (
        <div className="mt-8 space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 bg-white border border-stone-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10 bg-white border border-stone-200 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-4">
          <Package className="w-10 h-10 text-stone-400 mx-auto stroke-[1.5]" />
          <h2 className="font-display text-xl font-bold text-[#141413]">
            No orders placed yet
          </h2>
          <p className="text-sm text-stone-600">
            Once you complete checkout, every purchased hoodie, sneaker, bag, or cap will appear right here.
          </p>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="px-6 py-3 bg-[#141413] hover:bg-[#9B2226] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Explore Collection
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((order) => {
            const statusInfo = getStatusDisplay(order.status);
            const StatusIcon = statusInfo.icon;

            return (
              <article
                key={order.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
              >
                <div className="px-6 py-4 bg-[#EFECE5]/60 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="block text-stone-500">Order Number</span>
                      <span className="font-mono font-semibold text-[#141413] tabular-nums">
                        {order.orderNumber}
                      </span>
                    </div>
                    <div>
                      <span className="block text-stone-500">Date Placed</span>
                      <span className="font-medium text-[#141413]">
                        {formatOrderDate(order.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-stone-500">Payment</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <PaymentMethodBadge method={order.paymentMethod} />
                        <span className="font-medium text-[#141413]">{order.paymentMethod}</span>
                        {order.paymentStatus && (
                          <span
                            className={`text-[11px] font-semibold ${
                              (order.paymentStatus as PaymentStatus) === 'Paid'
                                ? 'text-emerald-700'
                                : (order.paymentStatus as PaymentStatus) === 'Pending Verification'
                                ? 'text-amber-700'
                                : 'text-stone-600'
                            }`}
                          >
                            · {order.paymentStatus}
                          </span>
                        )}
                      </div>
                      {order.paymentReference && (
                        <span className="block font-mono text-[10px] text-stone-500 mt-0.5">
                          Ref: {order.paymentReference}
                          {order.paymentChannel ? ` (${order.paymentChannel})` : ''}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-stone-500">Total</span>
                      <span className="font-semibold text-[#141413] tabular-nums">
                        {formatPHP(order.total)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${statusInfo.style}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusInfo.label}</span>
                    </span>
                    {order.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => void cancelOrder(order.id)}
                        className="px-3 py-1.5 text-xs font-medium text-[#9B2226] border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 divide-y divide-stone-100">
                  {order.items.map((item, idx) => {
                    const matchedProduct = products.find((p) => p.id === item.productId);
                    const { imageUrl: safeSrc } = resolveSafeVariantImageUrl(
                      matchedProduct,
                      item.colorName,
                      item.imageUrl
                    );
                    return (
                      <div
                        key={`${order.id}-${item.productId}-${idx}`}
                        className="py-3 first:pt-0 last:pb-0 flex items-center gap-4"
                      >
                        <div className="w-20 aspect-[4/3] rounded-lg overflow-hidden bg-[#E5E6E8] border border-[#E5E0D8] shrink-0 flex items-center justify-center">
                          <ResilientImage
                            src={safeSrc}
                            alt={`${item.productName} (${item.colorName})`}
                            className="w-full h-full object-contain object-center"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-[#141413] truncate">
                            {item.productName}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Color: {item.colorName} · Size: {item.size} · Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-[#141413] tabular-nums">
                            {formatPHP(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 text-xs text-stone-600 flex flex-wrap justify-between gap-2">
                  <span>
                    Ship to: <strong className="text-[#141413]">{order.customerName}</strong> —{' '}
                    {order.shippingAddress}, {order.city}
                  </span>
                  <span className="tabular-nums">
                    Shipping: {order.shippingFee === 0 ? 'Free' : formatPHP(order.shippingFee)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
