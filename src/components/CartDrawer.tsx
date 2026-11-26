import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  FIELD_LIMITS,
  FREE_SHIPPING_THRESHOLD,
  type Order,
  type PaymentMethod,
  type PaymentStatus,
} from '../types/store';
import { formatPHP, resolveSafeVariantImageUrl } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { ResilientImage } from './ResilientImage';
import {
  BankTransferLogo,
  CashOnDeliveryLogo,
  GCashLogo,
  MayaLogo,
  PaymentMethodBadge,
  VisaMastercardLogos,
} from './PaymentLogos';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onViewOrders: () => void;
  onOpenLogin?: () => void;
}

interface BankAccountConfig {
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  channels: string[];
}

interface PublicPaymentConfig {
  paymongoConfigured: boolean;
  stripeConfigured: boolean;
  availableWalletGateway: 'paymongo' | null;
  availableCardGateway: 'paymongo' | 'stripe' | null;
  merchant: {
    name: string;
    gcashNumber: string;
    mayaNumber: string;
    bankAccounts: BankAccountConfig[];
  };
}

interface PaymentSessionResponse {
  sessionId: string;
  signature: string;
  paymentMethod: PaymentMethod;
  mode: 'cod' | 'gateway' | 'qr_reference' | 'bank_transfer' | 'gateway_unconfigured';
  paymentStatus: PaymentStatus;
  paymentChannel: string;
  subtotalPhp: number;
  shippingFeePhp: number;
  amountPhp: number;
  referenceCode: string;
  gatewayProvider: 'paymongo' | 'stripe' | null;
  gatewayConfigured: boolean;
  gatewaySessionId: string;
  gatewayCheckoutUrl: string | null;
  qrDataUrl: string | null;
  expiresAt: number;
  message: string;
}

interface PaymentVerifyResponse {
  verified: boolean;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentChannel: string;
  paymentReference: string;
  gatewaySessionId: string;
  amountPhp: number;
  error?: string;
}

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethod;
  title: string;
  subtitle: string;
}> = [
  { id: 'COD', title: 'Cash on Delivery', subtitle: 'Pay courier on arrival' },
  { id: 'GCash', title: 'GCash', subtitle: 'QRPH / E-Wallet' },
  { id: 'Maya', title: 'Maya', subtitle: 'QRPH / E-Wallet' },
  { id: 'Card', title: 'Credit / Debit Card', subtitle: 'Visa & Mastercard' },
  { id: 'Bank Transfer', title: 'Bank Transfer', subtitle: 'BPI / UnionBank' },
];

const BANK_CHANNELS = [
  'BPI InstaPay',
  'BPI PESONet',
  'UnionBank InstaPay',
  'UnionBank PESONet',
];

function getPaymentStatusBadgeStyle(status: PaymentStatus): string {
  switch (status) {
    case 'Paid':
      return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    case 'Pay on Delivery':
      return 'text-[#141413] bg-[#F5F1E8] border-[#D8CEBC]';
    case 'Pending Verification':
      return 'text-amber-800 bg-amber-50 border-amber-200';
    case 'Awaiting Payment':
      return 'text-stone-700 bg-stone-100 border-stone-300';
  }
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  onViewOrders,
  onOpenLogin,
}) => {
  const {
    user,
    products,
    cart,
    cartSubtotal,
    shippingFee,
    cartTotal,
    signInWithGoogle,
    updateCartQuantity,
    removeFromCart,
    placeOrder,
    showToast,
  } = useStore();

  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('Metro Manila');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [codConfirmed, setCodConfirmed] = useState(true);
  const [paymentReference, setPaymentReference] = useState('');
  const [bankChannel, setBankChannel] = useState(BANK_CHANNELS[0]);
  const [gatewayCheckResult, setGatewayCheckResult] = useState<PaymentVerifyResponse | null>(null);
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.displayName || '');
      setCustomerEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (open && step === 'confirmed' && cart.length > 0) {
      setStep('bag');
    }
  }, [open, cart.length, step]);

  // Fetch public gateway capabilities when checkout opens
  useEffect(() => {
    if (!open || step !== 'checkout') return;
    let cancelled = false;
    fetch('/api/payments/config')
      .then((res) => (res.ok ? (res.json() as Promise<PublicPaymentConfig>) : null))
      .then((cfg) => {
        if (!cancelled && cfg) setPaymentConfig(cfg);
      })
      .catch(() => {
        // Non-blocking; payment session endpoint handles runtime behavior
      });
    return () => {
      cancelled = true;
    };
  }, [open, step]);

  const cartSignature = useMemo(
    () => cart.map((i) => `${i.productId}:${i.quantity}`).join(','),
    [cart]
  );

  const initializePaymentSession = useCallback(
    async (signal?: AbortSignal) => {
      if (!user || !user.emailVerified || cart.length === 0) {
        setPaymentSession(null);
        return;
      }
      setSessionLoading(true);
      setSessionError(null);
      setGatewayCheckResult(null);

      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/payments/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          signal,
          body: JSON.stringify({
            paymentMethod,
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            customerName: customerName || user.displayName || 'Habing Kalye Customer',
            customerEmail: customerEmail || user.email || '',
            origin: window.location.origin,
          }),
        });

        const data = (await res.json()) as PaymentSessionResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Unable to initialize payment session.');
        }
        if (!signal?.aborted) {
          setPaymentSession(data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!signal?.aborted) {
          setPaymentSession(null);
          setSessionError(
            err instanceof Error ? err.message : 'Unable to connect to payment server.'
          );
        }
      } finally {
        if (!signal?.aborted) {
          setSessionLoading(false);
        }
      }
    },
    [user, cart, paymentMethod, customerName, customerEmail]
  );

  useEffect(() => {
    if (!open || step !== 'checkout' || !user || !user.emailVerified || cart.length === 0) {
      return;
    }
    const controller = new AbortController();
    void initializePaymentSession(controller.signal);
    return () => controller.abort();
  }, [open, step, user, paymentMethod, cartSignature, initializePaymentSession]);

  if (!open) return null;

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);

  const handleSelectMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setFormError(null);
    setSessionError(null);
    setGatewayCheckResult(null);
    setPaymentReference('');
  };

  const handleCopyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedText(label);
      showToast(`Copied ${label}`);
      window.setTimeout(() => setCopiedText(null), 1800);
    } catch {
      showToast(`Reference: ${value}`);
    }
  };

  const handleCheckGatewayStatus = async () => {
    if (!user || !paymentSession) return;
    setCheckingGateway(true);
    setFormError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sessionId: paymentSession.sessionId,
          signature: paymentSession.signature,
        }),
      });
      const data = (await res.json()) as PaymentVerifyResponse;
      if (!res.ok || !data.verified) {
        setGatewayCheckResult(null);
        setFormError(
          data.error ||
            'Payment has not cleared at the gateway yet. Complete checkout in the gateway tab first.'
        );
        return;
      }
      setGatewayCheckResult(data);
      showToast('Gateway settlement verified');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to check gateway status.');
    } finally {
      setCheckingGateway(false);
    }
  };

  const renderOptionLogo = (id: PaymentMethod) => {
    switch (id) {
      case 'COD':
        return <CashOnDeliveryLogo className="w-8 h-6" />;
      case 'GCash':
        return <GCashLogo className="w-14 h-6" />;
      case 'Maya':
        return <MayaLogo className="w-14 h-6" />;
      case 'Card':
        return <VisaMastercardLogos />;
      case 'Bank Transfer':
        return <BankTransferLogo className="w-8 h-6" />;
    }
  };

  const canAttemptPlaceOrder =
    Boolean(user?.emailVerified) &&
    !submitting &&
    !sessionLoading &&
    Boolean(paymentSession) &&
    paymentSession?.mode !== 'gateway_unconfigured' &&
    (paymentMethod !== 'COD' || codConfirmed) &&
    (paymentSession?.mode !== 'gateway' || Boolean(gatewayCheckResult?.verified));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError('Please sign in first to save your order to Order History.');
      return;
    }
    if (!user.emailVerified) {
      setFormError(
        'Please verify your email address (or sign in with Google) to complete checkout.'
      );
      return;
    }
    if (customerName.trim().length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (customerPhone.trim().length < 6) {
      setFormError('Please enter a valid contact phone number.');
      return;
    }
    if (shippingAddress.trim().length < 5) {
      setFormError('Please enter your complete street address and barangay.');
      return;
    }
    if (!paymentSession) {
      setFormError(
        sessionError || 'Payment session is still initializing. Please refresh payment details.'
      );
      return;
    }
    if (paymentSession.mode === 'gateway_unconfigured') {
      setFormError(
        'Card payment gateway is not configured on the server. Select COD, GCash, Maya, or Bank Transfer.'
      );
      return;
    }
    if (paymentMethod === 'COD' && !codConfirmed) {
      setFormError('Please tick the Cash on Delivery confirmation box below.');
      return;
    }
    if (
      (paymentSession.mode === 'qr_reference' || paymentSession.mode === 'bank_transfer') &&
      !/^[A-Za-z0-9-]{6,40}$/.test(paymentReference.trim())
    ) {
      setFormError(
        `Enter your ${
          paymentMethod === 'Bank Transfer' ? 'bank transfer' : paymentMethod
        } transaction reference number (6–40 letters, numbers, or dashes).`
      );
      return;
    }

    setSubmitting(true);
    try {
      let verifiedData = gatewayCheckResult;
      if (!verifiedData || !verifiedData.verified) {
        const idToken = await user.getIdToken();
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            sessionId: paymentSession.sessionId,
            signature: paymentSession.signature,
            codConfirmed: paymentMethod === 'COD' ? codConfirmed : undefined,
            paymentReference:
              paymentSession.mode === 'qr_reference' || paymentSession.mode === 'bank_transfer'
                ? paymentReference.trim()
                : undefined,
            paymentChannel:
              paymentMethod === 'Bank Transfer'
                ? bankChannel
                : paymentSession.paymentChannel,
          }),
        });

        const payload = (await verifyRes.json()) as PaymentVerifyResponse;
        if (!verifyRes.ok || !payload.verified) {
          throw new Error(
            payload.error || 'Payment verification failed. No order was marked as paid.'
          );
        }
        verifiedData = payload;
      }

      const created = await placeOrder({
        customerName,
        customerEmail: customerEmail || user.email || '',
        customerPhone,
        shippingAddress,
        city,
        paymentMethod: verifiedData.paymentMethod,
        paymentStatus: verifiedData.paymentStatus,
        paymentChannel: verifiedData.paymentChannel,
        paymentReference: verifiedData.paymentReference,
        gatewaySessionId: verifiedData.gatewaySessionId,
      });

      setConfirmedOrder(created);
      setStep('confirmed');
      setPaymentReference('');
      setGatewayCheckResult(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div
        className="w-full max-w-lg bg-[#FAFAFA] h-full flex flex-col border-l border-neutral-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#141413]" />
            <h2 className="font-display text-lg font-bold text-[#141413]">
              {step === 'bag' && 'Shopping Bag'}
              {step === 'checkout' && 'Checkout & Payment'}
              {step === 'confirmed' && 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="p-2 text-stone-500 hover:text-[#141413] rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-stone-500">Order Recorded</p>
                    <h3 className="font-display text-lg font-bold text-[#141413] tabular-nums">
                      {confirmedOrder.orderNumber}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Maraming salamat, {confirmedOrder.customerName}. Your items and verified payment details are saved to your Order History.
                </p>

                <div className="pt-3 border-t border-stone-100 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500">Payment Method</span>
                    <span className="inline-flex items-center gap-2 font-medium text-[#141413]">
                      <PaymentMethodBadge method={confirmedOrder.paymentMethod} />
                      <span>{confirmedOrder.paymentMethod}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500">Payment Status</span>
                    <span
                      className={`px-2 py-0.5 font-semibold rounded border ${getPaymentStatusBadgeStyle(
                        confirmedOrder.paymentStatus
                      )}`}
                    >
                      {confirmedOrder.paymentStatus}
                    </span>
                  </div>
                  {confirmedOrder.paymentChannel && (
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500">Channel</span>
                      <span className="font-medium text-[#141413]">
                        {confirmedOrder.paymentChannel}
                      </span>
                    </div>
                  )}
                  {confirmedOrder.paymentReference && (
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500">Reference</span>
                      <span className="font-mono font-medium text-[#141413]">
                        {confirmedOrder.paymentReference}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Delivery To</span>
                    <span className="font-medium text-[#141413] text-right max-w-[230px] truncate">
                      {confirmedOrder.shippingAddress}, {confirmedOrder.city}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-stone-100 text-sm font-semibold">
                    <span>
                      {confirmedOrder.paymentStatus === 'Paid' ? 'Total Paid' : 'Order Total'}
                    </span>
                    <span className="tabular-nums">{formatPHP(confirmedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-stone-600">Items Purchased</h4>
                <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {confirmedOrder.items.map((item, idx) => {
                    const matchedProduct = products.find((p) => p.id === item.productId);
                    const { imageUrl: safeSrc } = resolveSafeVariantImageUrl(
                      matchedProduct,
                      item.colorName,
                      item.imageUrl
                    );
                    return (
                      <div key={`${item.productId}-${idx}`} className="p-3 flex items-center gap-3">
                        <div className="w-16 aspect-[4/3] rounded-lg overflow-hidden bg-[#E5E6E8] border border-[#E5E0D8] shrink-0 flex items-center justify-center">
                          <ResilientImage
                            src={safeSrc}
                            alt={`${item.productName} (${item.colorName})`}
                            className="w-full h-full object-contain object-center"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#141413] truncate">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            {item.colorName} · {item.size} · Qty {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">
                          {formatPHP(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('bag');
                  onClose();
                  onViewOrders();
                }}
                className="w-full py-3 px-5 bg-[#141413] hover:bg-[#9B2226] text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Order History</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-stone-300 mb-3 stroke-[1.5]" />
              <p className="text-base font-semibold text-[#141413]">Your bag is empty</p>
              <p className="text-xs text-stone-500 mt-1 max-w-[240px]">
                Explore our Marikina sneakers, Inabel hoodies, T&apos;nalak bags, and Solihiya caps.
              </p>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-4">
              {/* Free shipping bar */}
              <div className="bg-white border border-stone-200 rounded-xl p-3.5 text-xs">
                {remainingForFreeShipping === 0 ? (
                  <p className="text-emerald-700 font-medium">
                    Complimentary Metro Manila & nationwide shipping unlocked.
                  </p>
                ) : (
                  <p className="text-stone-600">
                    Add{' '}
                    <span className="font-semibold text-[#141413] tabular-nums">
                      {formatPHP(remainingForFreeShipping)}
                    </span>{' '}
                    more for free nationwide shipping.
                  </p>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const matchedProduct = products.find((p) => p.id === item.productId);
                  const { imageUrl: safeSrc, colorHex: matchedHex } = resolveSafeVariantImageUrl(
                    matchedProduct,
                    item.colorName,
                    item.imageUrl
                  );
                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-stone-200 rounded-xl p-3.5 flex gap-3.5"
                    >
                      <div className="w-24 aspect-[4/3] rounded-lg overflow-hidden bg-[#E5E6E8] border border-[#E5E0D8] shrink-0 flex items-center justify-center">
                        <ResilientImage
                          src={safeSrc}
                          alt={`${item.productName} (${item.colorName})`}
                          className="w-full h-full object-contain object-center"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[#141413] truncate">
                              {item.productName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-stone-300 inline-block"
                                style={{
                                  backgroundColor: matchedHex ?? item.colorHex,
                                }}
                              />
                              <span>{item.colorName}</span>
                              <span aria-hidden="true">·</span>
                              <span>Size {item.size}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeFromCart(item.id)}
                            aria-label={`Remove ${item.productName}`}
                            className="p-1 text-stone-400 hover:text-[#9B2226] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center border border-stone-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() => void updateCartQuantity(item.id, -1)}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-l-lg cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center text-xs font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => void updateCartQuantity(item.id, 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-r-lg cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-semibold text-[#141413] tabular-nums">
                            {formatPHP(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Step: Checkout Form */
            <form
              id="checkout-form"
              onSubmit={(e) => void handlePlaceOrder(e)}
              className="space-y-5"
            >
              {!user ? (
                <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#141413]">
                    Sign in required to save Order History
                  </p>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Sign in with your Habing Kalye email or Google account to initialize a verified payment session.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {onOpenLogin && (
                      <button
                        type="button"
                        onClick={onOpenLogin}
                        className="flex-1 py-2.5 px-4 bg-[#141413] hover:bg-[#292524] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Sign In / Register
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void signInWithGoogle()}
                      className="flex-1 py-2.5 px-3.5 bg-[#EFECE5] hover:bg-stone-200 text-[#141413] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Google Sign-In
                    </button>
                  </div>
                </div>
              ) : !user.emailVerified ? (
                <div className="bg-[#F5F1E8] border border-[#D8CEBC] rounded-xl p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-[#141413]">
                    Email verification required for checkout
                  </p>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Check your inbox for the verification link, or open your account page to refresh status.
                  </p>
                  {onOpenLogin && (
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="w-full py-2.5 px-4 bg-[#141413] hover:bg-[#292524] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Verify on Account Page
                    </button>
                  )}
                </div>
              ) : null}

              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#9B2226] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Shipping Details Card */}
              <div className="space-y-3 bg-white border border-stone-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  1. Delivery Details
                </h3>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.CUSTOMER_NAME_MAX}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={160}
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={FIELD_LIMITS.PHONE_MAX}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 917 555 0142"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Street Address & Barangay
                  </label>
                  <textarea
                    required
                    rows={2}
                    maxLength={FIELD_LIMITS.ADDRESS_MAX}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="42 Escolta St., Binondo"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    City / Province
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.CITY_MAX}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                  />
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="space-y-3.5 bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    2. Payment Method
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#141413]" />
                    Server Verified
                  </span>
                </div>

                {/* Single-select radio group */}
                <div
                  role="radiogroup"
                  aria-label="Payment Method"
                  className="space-y-2"
                >
                  {PAYMENT_OPTIONS.map((option) => {
                    const selected = paymentMethod === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => handleSelectMethod(option.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-[#141413] bg-[#F5F1E8]/70 ring-1 ring-[#141413]'
                            : 'border-stone-200 bg-white hover:border-stone-400'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              selected
                                ? 'border-[#141413] bg-[#141413]'
                                : 'border-stone-400 bg-white'
                            }`}
                          >
                            {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#141413]">
                              {option.title}
                            </p>
                            <p className="text-[11px] text-stone-500 truncate">
                              {option.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">{renderOptionLogo(option.id)}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Contextual Payment Instructions & Flows */}
                {user?.emailVerified && (
                  <div className="rounded-xl border border-stone-200 bg-[#FAFAFA] p-4 space-y-3">
                    {sessionLoading ? (
                      <div className="flex items-center gap-2 text-xs text-stone-600 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#141413]" />
                        <span>Preparing secure {paymentMethod} session...</span>
                      </div>
                    ) : sessionError ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[#9B2226]">{sessionError}</p>
                        <button
                          type="button"
                          onClick={() => void initializePaymentSession()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-stone-300 rounded-lg bg-white hover:border-[#141413] cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Payment Session</span>
                        </button>
                      </div>
                    ) : paymentSession ? (
                      <>
                        {/* COD Flow */}
                        {paymentMethod === 'COD' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-2">
                              <span className="text-stone-600">Cash Due Upon Delivery</span>
                              <span className="font-bold text-[#141413] tabular-nums">
                                {formatPHP(paymentSession.amountPhp)}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">
                              {paymentSession.message} Orders remain in{' '}
                              <strong className="text-[#141413]">Pay on Delivery</strong> status until our courier remits cash.
                            </p>
                            <label className="flex items-start gap-2.5 text-xs text-[#141413] cursor-pointer select-none pt-1">
                              <input
                                type="checkbox"
                                checked={codConfirmed}
                                onChange={(e) => setCodConfirmed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-[#141413] rounded cursor-pointer"
                              />
                              <span>
                                I confirm Cash on Delivery payment of{' '}
                                <strong className="tabular-nums">
                                  {formatPHP(paymentSession.amountPhp)}
                                </strong>{' '}
                                when my Habing Kalye parcel arrives.
                              </span>
                            </label>
                          </div>
                        )}

                        {/* GCash & Maya Flow */}
                        {(paymentMethod === 'GCash' || paymentMethod === 'Maya') && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-2">
                              <span className="font-semibold text-[#141413]">
                                {paymentMethod} Checkout
                              </span>
                              <span className="font-mono text-[11px] text-stone-600">
                                {paymentSession.referenceCode}
                              </span>
                            </div>

                            {paymentSession.qrDataUrl && (
                              <div className="flex flex-col items-center bg-white border border-stone-200 rounded-xl p-4 space-y-2">
                                <img
                                  src={paymentSession.qrDataUrl}
                                  alt={`${paymentMethod} QR code for ${formatPHP(
                                    paymentSession.amountPhp
                                  )}`}
                                  className="w-40 h-40 object-contain"
                                />
                                <p className="text-xs font-semibold text-[#141413] tabular-nums">
                                  Amount: {formatPHP(paymentSession.amountPhp)}
                                </p>
                                <p className="text-[11px] text-stone-500 text-center">
                                  {paymentMethod === 'GCash'
                                    ? `GCash Merchant: ${
                                        paymentConfig?.merchant.gcashNumber || '0917 842 4224'
                                      }`
                                    : `Maya Merchant: ${
                                        paymentConfig?.merchant.mayaNumber || '0918 764 4224'
                                      }`}
                                </p>
                              </div>
                            )}

                            <p className="text-xs text-stone-600 leading-relaxed">
                              {paymentSession.message}
                            </p>

                            {paymentSession.mode === 'gateway' &&
                            paymentSession.gatewayCheckoutUrl ? (
                              <div className="space-y-2.5">
                                <a
                                  href={paymentSession.gatewayCheckoutUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2.5 px-4 bg-[#141413] hover:bg-stone-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                  <span>Open {paymentMethod} Gateway</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  disabled={checkingGateway}
                                  onClick={() => void handleCheckGatewayStatus()}
                                  className="w-full py-2 px-4 border border-stone-300 hover:border-[#141413] bg-white text-[#141413] text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                  {checkingGateway ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {gatewayCheckResult?.verified
                                      ? 'Settlement Verified (Paid)'
                                      : 'Verify Gateway Payment'}
                                  </span>
                                </button>

                                {gatewayCheckResult?.verified && (
                                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>
                                      Payment confirmed via {gatewayCheckResult.paymentChannel}.
                                      Ready to place order.
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-stone-700">
                                  {paymentMethod} Reference Number (from wallet receipt)
                                </label>
                                <input
                                  type="text"
                                  required
                                  maxLength={40}
                                  value={paymentReference}
                                  onChange={(e) => setPaymentReference(e.target.value)}
                                  placeholder="e.g. 901482739104"
                                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-[#141413]"
                                />
                                <p className="text-[11px] text-stone-500">
                                  Saved as <strong className="text-[#141413]">Pending Verification</strong> — we never mark QR transfers Paid without treasury confirmation.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card (Visa / Mastercard) Flow */}
                        {paymentMethod === 'Card' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                              <span className="text-xs font-semibold text-[#141413] inline-flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" />
                                Hosted Card Gateway
                              </span>
                              <VisaMastercardLogos />
                            </div>

                            {paymentSession.mode === 'gateway' &&
                            paymentSession.gatewayCheckoutUrl ? (
                              <div className="space-y-2.5">
                                <p className="text-xs text-stone-600 leading-relaxed">
                                  {paymentSession.message}
                                </p>
                                <a
                                  href={paymentSession.gatewayCheckoutUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2.5 px-4 bg-[#141413] hover:bg-stone-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                  <span>Pay {formatPHP(paymentSession.amountPhp)} by Card</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  disabled={checkingGateway}
                                  onClick={() => void handleCheckGatewayStatus()}
                                  className="w-full py-2 px-4 border border-stone-300 hover:border-[#141413] bg-white text-[#141413] text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                  {checkingGateway ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {gatewayCheckResult?.verified
                                      ? 'Card Payment Verified (Paid)'
                                      : 'Verify Card Payment Status'}
                                  </span>
                                </button>

                                {gatewayCheckResult?.verified && (
                                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>
                                      Verified by {gatewayCheckResult.paymentChannel}. Click Place
                                      Order to finalize.
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg bg-[#F5F1E8] border border-[#D8CEBC] space-y-2 text-xs">
                                <p className="font-semibold text-[#141413]">
                                  Card Gateway Configuration Needed
                                </p>
                                <p className="text-stone-600 leading-relaxed">
                                  {paymentSession.message}
                                </p>
                                <p className="text-[11px] text-stone-500">
                                  To complete checkout right now, select COD, GCash, Maya, or Bank Transfer above.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bank Transfer Flow */}
                        {paymentMethod === 'Bank Transfer' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-2">
                              <span className="font-semibold text-[#141413]">
                                Philippine Bank Transfer
                              </span>
                              <span className="font-mono text-[11px] text-stone-600">
                                Memo: {paymentSession.referenceCode}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {(
                                paymentConfig?.merchant.bankAccounts || [
                                  {
                                    bankCode: 'BPI',
                                    bankName: 'Bank of the Philippine Islands (BPI)',
                                    accountName: 'Habing Kalye Artisanal Streetwear',
                                    accountNumber: '0049-8120-7741',
                                    channels: ['InstaPay', 'PESONet'],
                                  },
                                  {
                                    bankCode: 'UnionBank',
                                    bankName: 'UnionBank of the Philippines',
                                    accountName: 'Habing Kalye Artisanal Streetwear',
                                    accountNumber: '1094-2285-6014',
                                    channels: ['InstaPay', 'PESONet'],
                                  },
                                ]
                              ).map((acct) => (
                                <div
                                  key={acct.bankCode}
                                  className="p-2.5 bg-white border border-stone-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-[#141413]">{acct.bankName}</p>
                                    <p className="text-[11px] text-stone-500">
                                      {acct.accountName} ·{' '}
                                      <span className="font-mono text-[#141413]">
                                        {acct.accountNumber}
                                      </span>
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleCopyValue(
                                        `${acct.bankCode} Account`,
                                        acct.accountNumber
                                      )
                                    }
                                    className="px-2 py-1 text-[11px] font-medium border border-stone-300 rounded hover:border-[#141413] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    {copiedText === `${acct.bankCode} Account` ? (
                                      <Check className="w-3 h-3 text-emerald-700" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>Copy</span>
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Transfer Channel Used
                              </label>
                              <select
                                value={bankChannel}
                                onChange={(e) => setBankChannel(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#141413]"
                              >
                                {BANK_CHANNELS.map((ch) => (
                                  <option key={ch} value={ch}>
                                    {ch}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Bank Reference / Trace Number
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={40}
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="e.g. IP202604189921"
                                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-[#141413]"
                              />
                              <p className="text-[11px] text-stone-500 mt-1">
                                Saved as <strong className="text-[#141413]">Pending Verification</strong> until our team verifies credit to the bank account.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Totals & CTA */}
        {cart.length > 0 && step !== 'confirmed' && (
          <div className="p-6 border-t border-stone-200 bg-white space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPHP(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {shippingFee === 0 ? 'Free' : formatPHP(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#141413] pt-2 border-t border-stone-100">
                <span>Total</span>
                <span className="tabular-nums">{formatPHP(cartTotal)}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-5 bg-[#141413] hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 py-3 text-xs font-semibold text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-100 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={!canAttemptPlaceOrder}
                  className="flex-1 py-3 px-5 bg-[#141413] hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Verifying & Placing Order...'
                    : `Place Order · ${formatPHP(cartTotal)}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
