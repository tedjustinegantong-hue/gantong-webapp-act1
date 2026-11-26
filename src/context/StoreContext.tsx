import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  FIELD_LIMITS,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  type CartItem,
  type Order,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type Product,
  type ProductVariant,
  type UserProfile,
} from '../types/store';
import {
  findVariantByColor,
  getDefaultVariantIndex,
  getVariantSizeStock,
  getVariantTotalStock,
  INITIAL_CATALOG,
  normalizeVariantAppearance,
  resolveSafeVariantImageUrl,
  sortVariantsByColor,
  STUDIO_IMAGE_NATIVE_COLOR,
  stripAssetQuery,
} from '../data/catalog';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

const GUEST_CART_KEY = 'hk_guest_cart_v1';

export interface CheckoutPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentChannel?: string;
  paymentReference?: string;
  gatewaySessionId?: string;
}

interface StoreContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  products: Product[];
  productsLoading: boolean;
  firestoreProductCount: number;
  outOfSyncCatalogCount: number;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  shippingFee: number;
  cartTotal: number;
  orders: Order[];
  ordersLoading: boolean;
  allOrders: Order[];
  allOrdersLoading: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  signInWithGoogle: () => Promise<User | null>;
  signInWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  registerWithEmail: (
    fullName: string,
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  addToCart: (product: Product, variant: ProductVariant, size: string, quantity?: number) => Promise<void>;
  updateCartQuantity: (cartItemId: string, delta: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  placeOrder: (payload: CheckoutPayload) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
  saveProduct: (product: Product, isEdit: boolean) => Promise<void>;
  toggleProductPin: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  syncCatalogToFirestore: () => Promise<number>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function makeCartItemId(productId: string, colorName: string, size: string): string {
  return sanitizeId(`${productId.trim()}__${colorName.trim()}__${size.trim()}`);
}

function loadGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartItem[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function toTimestampMillis(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (val instanceof Date) return val.getTime();
  return 0;
}

function mapFirebaseAuthError(error: unknown, fallback: string): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email address or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many attempts detected. Please wait a few minutes and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled yet in Firebase Authentication. Enable it in Firebase Console (Authentication → Sign-in method → Email/Password) or continue with Google below.';
    default:
      return error instanceof Error ? error.message : fallback;
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => loadGuestCart());
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const userProfileReadyRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const isAdmin = useMemo(() => {
    if (!user || !user.emailVerified) return false;
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
    return profile?.role === 'admin';
  }, [user, profile]);

  // 1. Public real-time product catalog listener (merges live Firestore edits over INITIAL_CATALOG)
  useEffect(() => {
    const productsRef = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const docs: Product[] = snapshot.docs.map((d) => d.data() as Product);
        setFirestoreProducts(docs);
        setProductsLoading(false);
      },
      (error) => {
        setProductsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );
    return () => unsubscribe();
  }, []);

  const products = useMemo(() => {
    if (firestoreProducts.length === 0) {
      return INITIAL_CATALOG;
    }
    const byId = new Map<string, Product>();
    for (const item of INITIAL_CATALOG) {
      byId.set(item.id, item);
    }
    for (const remote of firestoreProducts) {
      const seed = byId.get(remote.id);
      if (seed) {
        // Guard against legacy ID swaps (e.g. old hk-pg-02 craft set before it became Escolta Black Pleat Straight Pants)
        const sameProductIdentity =
          typeof remote.name === 'string' &&
          remote.name.trim().toLowerCase() === seed.name.trim().toLowerCase();

        const effectiveSizes =
          sameProductIdentity && remote.sizes?.length ? remote.sizes : seed.sizes;

        const mergedVariants = seed.variants.map((sv) => {
          const remoteVar = sameProductIdentity
            ? (remote.variants || []).find(
                (rv) => rv.colorName.trim().toLowerCase() === sv.colorName.trim().toLowerCase()
              )
            : undefined;
          const mergedSizeStock =
            remoteVar?.sizeStock && typeof remoteVar.sizeStock === 'object'
              ? { ...sv.sizeStock, ...remoteVar.sizeStock }
              : sv.sizeStock;
          const computedStock = mergedSizeStock
            ? getVariantTotalStock({ ...sv, sizeStock: mergedSizeStock }, effectiveSizes)
            : remoteVar
              ? remoteVar.stock
              : sv.stock;
          return {
            ...sv,
            stock: computedStock,
            ...(mergedSizeStock ? { sizeStock: mergedSizeStock } : {}),
          };
        });

        const seedByColor = new Map(seed.variants.map((sv) => [sv.colorName.toLowerCase(), sv]));
        const usedImages = new Set(mergedVariants.map((mv) => stripAssetQuery(mv.imageUrl)));

        // Only allow extra Firestore variants if they use a curated studio asset whose native color strictly matches & isn't duplicated
        if (sameProductIdentity) {
          for (const rv of remote.variants || []) {
            const cleanUrl = rv.imageUrl ? stripAssetQuery(rv.imageUrl) : '';
            const nativeColor = Object.prototype.hasOwnProperty.call(
              STUDIO_IMAGE_NATIVE_COLOR,
              cleanUrl
            )
              ? STUDIO_IMAGE_NATIVE_COLOR[cleanUrl]
              : undefined;
            if (
              nativeColor &&
              !seedByColor.has(rv.colorName.trim().toLowerCase()) &&
              !rv.imageUrl.includes('?color=') &&
              !usedImages.has(cleanUrl) &&
              nativeColor.toLowerCase() === rv.colorName.trim().toLowerCase()
            ) {
              usedImages.add(cleanUrl);
              mergedVariants.push(normalizeVariantAppearance(rv, seed.defaultImage));
            }
          }
        }

        const orderedVariants = sortVariantsByColor(mergedVariants);
        const defaultIdx = getDefaultVariantIndex({ name: seed.name, variants: orderedVariants });
        byId.set(remote.id, {
          ...seed,
          ...(sameProductIdentity
            ? {
                price: typeof remote.price === 'number' && remote.price > 0 ? remote.price : seed.price,
                featured: typeof remote.featured === 'boolean' ? remote.featured : seed.featured,
                badge: typeof remote.badge === 'string' ? remote.badge : seed.badge,
                sizes: effectiveSizes,
              }
            : {}),
          defaultImage:
            orderedVariants[defaultIdx]?.imageUrl ||
            orderedVariants[0]?.imageUrl ||
            seed.defaultImage,
          variants: orderedVariants,
          totalStock: orderedVariants.reduce((sum, v) => sum + v.stock, 0),
        });
      } else if (!remote.id.startsWith('hk-') || remote.id.startsWith('hk-custom-')) {
        // Deduplicate any custom product variants that point to identical image files or mismatched curated studio assets
        const seenImages = new Set<string>();
        const cleanCustomVariants: ProductVariant[] = [];
        for (const rv of remote.variants || []) {
          const normalized = normalizeVariantAppearance(rv, remote.defaultImage);
          const cleanUrl = normalized.imageUrl;
          const nativeColor = Object.prototype.hasOwnProperty.call(
            STUDIO_IMAGE_NATIVE_COLOR,
            cleanUrl
          )
            ? STUDIO_IMAGE_NATIVE_COLOR[cleanUrl]
            : undefined;
          if (!cleanUrl || seenImages.has(cleanUrl)) continue;
          if (nativeColor && nativeColor.toLowerCase() !== normalized.colorName.toLowerCase()) {
            continue;
          }
          seenImages.add(cleanUrl);
          cleanCustomVariants.push(normalized);
        }
        if (cleanCustomVariants.length === 0) continue;
        const normalizedVariants = sortVariantsByColor(cleanCustomVariants);
        const defaultIdx = getDefaultVariantIndex({
          name: remote.name || '',
          variants: normalizedVariants,
        });
        byId.set(remote.id, {
          ...remote,
          defaultImage:
            normalizedVariants[defaultIdx]?.imageUrl ||
            normalizedVariants[0]?.imageUrl ||
            remote.defaultImage,
          variants: normalizedVariants,
          totalStock: normalizedVariants.reduce((sum, v) => sum + v.stock, 0),
        });
      }
    }
    return Array.from(byId.values());
  }, [firestoreProducts]);

  // Ensure user profile exists in Firestore and merge guest cart items
  const ensureUserProfileAndSyncCart = useCallback(async (firebaseUser: User) => {
    if (!firebaseUser.emailVerified) {
      setProfile({
        uid: firebaseUser.uid,
        displayName: (firebaseUser.displayName || 'Habing Kalye Member').slice(0, 100),
        email: (firebaseUser.email || 'user@example.com').slice(0, 160),
        photoURL: (firebaseUser.photoURL || '').slice(0, 500),
        role: 'customer',
      });
      userProfileReadyRef.current = null;
      return;
    }

    const userPath = `users/${firebaseUser.uid}`;
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userRef);
      const isBootstrappedAdmin =
        firebaseUser.emailVerified &&
        firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: (firebaseUser.displayName || 'HABI Member').slice(0, 100),
          email: (firebaseUser.email || 'user@example.com').slice(0, 160),
          photoURL: (firebaseUser.photoURL || '').slice(0, 500),
          role: isBootstrappedAdmin ? 'admin' : 'customer',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      } else {
        const existingData = snap.data() as UserProfile;
        setProfile(existingData);
      }
      userProfileReadyRef.current = firebaseUser.uid;

      // Merge any guest cart items into Firestore user cart
      const guestItems = loadGuestCart();
      if (guestItems.length > 0) {
        for (const item of guestItems) {
          const seedProduct = INITIAL_CATALOG.find((p) => p.id === item.productId);
          const resolved = resolveSafeVariantImageUrl(seedProduct, item.colorName, item.imageUrl);
          const safeColorName = (resolved.variant?.colorName ?? item.colorName).trim();
          const safeColorHex = resolved.colorHex ?? item.colorHex;
          const safeImageUrl = resolved.imageUrl || item.imageUrl;
          const cartItemId = makeCartItemId(item.productId, safeColorName, item.size);
          const cartDocRef = doc(db, 'users', firebaseUser.uid, 'cart', cartItemId);
          const existingCartSnap = await getDoc(cartDocRef);
          if (existingCartSnap.exists()) {
            const prevQty = Number(existingCartSnap.data().quantity || 1);
            await updateDoc(cartDocRef, {
              quantity: Math.min(99, prevQty + item.quantity),
              colorName: safeColorName.slice(0, 60),
              colorHex: safeColorHex.slice(0, 20),
              imageUrl: safeImageUrl.slice(0, 500),
              size: item.size.slice(0, 30),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(cartDocRef, {
              id: cartItemId,
              userId: firebaseUser.uid,
              productId: item.productId,
              productName: item.productName.slice(0, FIELD_LIMITS.NAME_MAX),
              category: item.category.slice(0, 60),
              colorName: safeColorName.slice(0, 60),
              colorHex: safeColorHex.slice(0, 20),
              imageUrl: safeImageUrl.slice(0, 500),
              size: item.size.slice(0, 30),
              price: item.price,
              quantity: Math.min(99, Math.max(1, item.quantity)),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
        saveGuestCart([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  }, []);

  // 2. Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await ensureUserProfileAndSyncCart(firebaseUser);
      } else {
        setProfile(null);
        userProfileReadyRef.current = null;
        setOrders([]);
        setAllOrders([]);
        setCart(loadGuestCart());
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [ensureUserProfileAndSyncCart]);

  // 3. Authenticated & verified user cart listener
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;
    const cartPath = `users/${user.uid}/cart`;
    const q = query(collection(db, 'users', user.uid, 'cart'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: CartItem[] = snapshot.docs.map((d) => d.data() as CartItem);
        setCart(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, cartPath);
      }
    );
    return () => unsubscribe();
  }, [authReady, user]);

  // 4. Authenticated & verified user Order History listener
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    const ordersPath = 'orders';
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs
          .map((d) => d.data() as Order)
          .sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
        setOrders(list);
        setOrdersLoading(false);
      },
      (error) => {
        setOrdersLoading(false);
        handleFirestoreError(error, OperationType.LIST, ordersPath);
      }
    );
    return () => unsubscribe();
  }, [authReady, user]);

  // 5. Admin all-orders listener (strictly when isAdmin is true)
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setAllOrders([]);
      return;
    }
    setAllOrdersLoading(true);
    const q = collection(db, 'orders');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs
          .map((d) => d.data() as Order)
          .sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
        setAllOrders(list);
        setAllOrdersLoading(false);
      },
      (error) => {
        setAllOrdersLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );
    return () => unsubscribe();
  }, [authReady, isAdmin]);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithPopup(auth, googleProvider);
      showToast(`Welcome back, ${cred.user.displayName || cred.user.email}`);
      return cred.user;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in cancelled';
      showToast(msg);
      return null;
    }
  }, [showToast]);

  const signInWithEmail = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<User> => {
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        showToast(`Welcome back, ${cred.user.displayName || cred.user.email}`);
        return cred.user;
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error, 'Unable to sign in with email and password.'));
      }
    },
    [showToast]
  );

  const registerWithEmail = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      rememberMe: boolean
    ): Promise<User> => {
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const cleanName = fullName.trim().slice(0, FIELD_LIMITS.CUSTOMER_NAME_MAX);
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName });
        }
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Ignore verification dispatch failure if rate-limited
        }
        setUser({ ...cred.user, displayName: cleanName || cred.user.displayName } as User);
        setProfile({
          uid: cred.user.uid,
          displayName: cleanName || 'Habing Kalye Member',
          email: (cred.user.email || email.trim()).slice(0, 160),
          role: 'customer',
        });
        showToast('Account created. Check your inbox for your verification link.');
        return cred.user;
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error, 'Unable to create your account.'));
      }
    },
    [showToast]
  );

  const sendPasswordReset = useCallback(
    async (email: string): Promise<void> => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        showToast(`Password reset link sent to ${email.trim()}`);
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error, 'Unable to send password reset email.'));
      }
    },
    [showToast]
  );

  const resendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error('No signed-in account found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
      showToast(`Verification email resent to ${auth.currentUser.email}`);
    } catch (error) {
      throw new Error(mapFirebaseAuthError(error, 'Unable to resend verification email right now.'));
    }
  }, [showToast]);

  const refreshAuthUser = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const refreshed = auth.currentUser;
    setUser(refreshed);
    if (refreshed.emailVerified) {
      await ensureUserProfileAndSyncCart(refreshed);
      showToast('Email verified! Your Habing Kalye account is fully synced.');
      return true;
    }
    return false;
  }, [ensureUserProfileAndSyncCart, showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    showToast('Signed out');
  }, [showToast]);

  const addToCart = useCallback(
    async (product: Product, variant: ProductVariant, size: string, quantity = 1) => {
      const canonicalVariant = findVariantByColor(product.variants, variant.colorName) || variant;
      const availableForCombo = getVariantSizeStock(canonicalVariant, size);
      if (availableForCombo <= 0) {
        showToast(`${product.name} (${canonicalVariant.colorName}, ${size}) is currently out of stock`);
        return;
      }

      const resolvedImg = resolveSafeVariantImageUrl(
        product,
        canonicalVariant.colorName,
        canonicalVariant.imageUrl
      );
      const safeImageUrl = resolvedImg.imageUrl || stripAssetQuery(canonicalVariant.imageUrl);
      const safeColorHex = resolvedImg.colorHex || canonicalVariant.colorHex;
      const cartItemId = makeCartItemId(product.id, canonicalVariant.colorName, size);
      const qtyToAdd = Math.max(1, Math.min(availableForCombo, 99, quantity));

      if (!user || !user.emailVerified) {
        setCart((prev) => {
          const existing = prev.find((i) => i.id === cartItemId);
          const next = existing
            ? prev.map((i) =>
                i.id === cartItemId
                  ? {
                      ...i,
                      colorName: canonicalVariant.colorName,
                      colorHex: safeColorHex,
                      imageUrl: safeImageUrl,
                      quantity: Math.min(availableForCombo, 99, i.quantity + qtyToAdd),
                    }
                  : i
              )
            : [
                ...prev,
                {
                  id: cartItemId,
                  productId: product.id,
                  productName: product.name,
                  category: product.category,
                  colorName: canonicalVariant.colorName,
                  colorHex: safeColorHex,
                  imageUrl: safeImageUrl,
                  size,
                  price: product.price,
                  quantity: qtyToAdd,
                },
              ];
          saveGuestCart(next);
          return next;
        });
        showToast(`Added ${product.name} (${canonicalVariant.colorName}, ${size}) to bag`);
        return;
      }

      if (userProfileReadyRef.current !== user.uid) {
        await ensureUserProfileAndSyncCart(user);
      }

      const path = `users/${user.uid}/cart/${cartItemId}`;
      const ref = doc(db, 'users', user.uid, 'cart', cartItemId);
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const currentQty = Number(snap.data().quantity || 1);
          await updateDoc(ref, {
            quantity: Math.min(availableForCombo, 99, currentQty + qtyToAdd),
            colorName: canonicalVariant.colorName.slice(0, 60),
            colorHex: safeColorHex.slice(0, 20),
            imageUrl: safeImageUrl.slice(0, 500),
            size: size.slice(0, 30),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            id: cartItemId,
            userId: user.uid,
            productId: product.id,
            productName: product.name.slice(0, FIELD_LIMITS.NAME_MAX),
            category: product.category.slice(0, 60),
            colorName: canonicalVariant.colorName.slice(0, 60),
            colorHex: safeColorHex.slice(0, 20),
            imageUrl: safeImageUrl.slice(0, 500),
            size: size.slice(0, 30),
            price: product.price,
            quantity: qtyToAdd,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast(`Added ${product.name} (${canonicalVariant.colorName}, ${size}) to bag`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    [user, ensureUserProfileAndSyncCart, showToast]
  );

  const updateCartQuantity = useCallback(
    async (cartItemId: string, delta: number) => {
      const target = cart.find((i) => i.id === cartItemId);
      if (!target) return;
      const nextQty = target.quantity + delta;

      if (!user || !user.emailVerified) {
        setCart((prev) => {
          const next =
            nextQty <= 0
              ? prev.filter((i) => i.id !== cartItemId)
              : prev.map((i) =>
                  i.id === cartItemId ? { ...i, quantity: Math.min(99, nextQty) } : i
                );
          saveGuestCart(next);
          return next;
        });
        return;
      }

      const path = `users/${user.uid}/cart/${cartItemId}`;
      const ref = doc(db, 'users', user.uid, 'cart', cartItemId);
      try {
        if (nextQty <= 0) {
          await deleteDoc(ref);
        } else {
          await updateDoc(ref, {
            quantity: Math.min(99, nextQty),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [cart, user]
  );

  const removeFromCart = useCallback(
    async (cartItemId: string) => {
      if (!user || !user.emailVerified) {
        setCart((prev) => {
          const next = prev.filter((i) => i.id !== cartItemId);
          saveGuestCart(next);
          return next;
        });
        return;
      }

      const path = `users/${user.uid}/cart/${cartItemId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'cart', cartItemId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const shippingFee = useMemo(() => {
    if (cart.length === 0) return 0;
    return cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  }, [cart.length, cartSubtotal]);

  const cartTotal = cartSubtotal + shippingFee;

  const placeOrder = useCallback(
    async (payload: CheckoutPayload): Promise<Order> => {
      if (!user) {
        throw new Error('Please sign in to complete checkout.');
      }
      if (!user.emailVerified) {
        throw new Error(
          'Please verify your email address from the link sent to your inbox (or sign in with Google) to place an order.'
        );
      }
      if (cart.length === 0) {
        throw new Error('Your shopping bag is empty.');
      }

      const orderId = sanitizeId(`ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const orderNumber = `HK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderItems = cart.slice(0, 50).map((item) => {
        const matchedProduct = products.find((p) => p.id === item.productId);
        const resolved = resolveSafeVariantImageUrl(matchedProduct, item.colorName, item.imageUrl);
        const finalColorName = resolved.variant?.colorName ?? item.colorName;
        const finalColorHex = resolved.colorHex ?? item.colorHex;
        const finalImageUrl = resolved.imageUrl || stripAssetQuery(item.imageUrl);
        return {
          productId: item.productId,
          productName: item.productName.slice(0, FIELD_LIMITS.NAME_MAX),
          category: (matchedProduct?.category ?? item.category).slice(0, 60),
          colorName: finalColorName.slice(0, 60),
          colorHex: finalColorHex.slice(0, 20),
          size: item.size.slice(0, 30),
          quantity: item.quantity,
          price: item.price,
          imageUrl: finalImageUrl.slice(0, 500),
        };
      });

      const orderDoc: Order = {
        id: orderId,
        orderNumber,
        userId: user.uid,
        customerName: payload.customerName.trim().slice(0, FIELD_LIMITS.CUSTOMER_NAME_MAX),
        customerEmail: payload.customerEmail.trim().slice(0, 160),
        customerPhone: payload.customerPhone.trim().slice(0, FIELD_LIMITS.PHONE_MAX),
        shippingAddress: payload.shippingAddress.trim().slice(0, FIELD_LIMITS.ADDRESS_MAX),
        city: payload.city.trim().slice(0, FIELD_LIMITS.CITY_MAX),
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        ...(payload.paymentChannel
          ? { paymentChannel: payload.paymentChannel.trim().slice(0, 80) }
          : {}),
        ...(payload.paymentReference
          ? { paymentReference: payload.paymentReference.trim().slice(0, 120) }
          : {}),
        ...(payload.gatewaySessionId
          ? { gatewaySessionId: payload.gatewaySessionId.trim().slice(0, 120) }
          : {}),
        items: orderItems,
        subtotal: cartSubtotal,
        shippingFee,
        total: cartTotal,
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const orderPath = `orders/${orderId}`;
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'orders', orderId), orderDoc);
        for (const item of cart) {
          batch.delete(doc(db, 'users', user.uid, 'cart', item.id));
        }
        await batch.commit();
        saveGuestCart([]);
        setCart([]);
        showToast(`Order ${orderNumber} confirmed and saved to Order History`);
        return orderDoc;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, orderPath);
      }
    },
    [user, products, cart, cartSubtotal, shippingFee, cartTotal, showToast]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const path = `orders/${orderId}`;
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'Cancelled',
          updatedAt: serverTimestamp(),
        });
        showToast('Order cancelled');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [showToast]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const path = `orders/${orderId}`;
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status,
          updatedAt: serverTimestamp(),
        });
        showToast(`Order status updated to ${status}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [showToast]
  );

  const updateOrderPaymentStatus = useCallback(
    async (orderId: string, paymentStatus: PaymentStatus) => {
      const path = `orders/${orderId}`;
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          paymentStatus,
          updatedAt: serverTimestamp(),
        });
        showToast(`Payment status updated to ${paymentStatus}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [showToast]
  );

  const saveProduct = useCallback(
    async (product: Product, isEdit: boolean) => {
      const safeId = sanitizeId(product.id);
      const path = `products/${safeId}`;
      const cleanVariants = product.variants.slice(0, 8).map((v) => {
        const normalized = normalizeVariantAppearance(v, product.defaultImage);
        return {
          colorName: normalized.colorName.trim().slice(0, 60),
          colorHex: normalized.colorHex.trim().slice(0, 20),
          imageUrl: normalized.imageUrl.trim().slice(0, 500),
          stock: Math.max(0, Number(normalized.stock) || 0),
          ...(normalized.sizeStock ? { sizeStock: normalized.sizeStock } : {}),
        };
      });
      const totalStock = cleanVariants.reduce((sum, v) => sum + v.stock, 0);

      try {
        if (isEdit) {
          const existingRef = doc(db, 'products', safeId);
          const existingSnap = await getDoc(existingRef);
          if (existingSnap.exists()) {
            await updateDoc(existingRef, {
              name: product.name.trim().slice(0, FIELD_LIMITS.NAME_MAX),
              slug: safeId,
              category: product.category,
              subCategory: product.subCategory.trim().slice(0, 80),
              artisanMaterial: product.artisanMaterial.trim().slice(0, 120),
              price: Number(product.price),
              description: product.description.trim().slice(0, FIELD_LIMITS.DESC_MAX),
              sizes: product.sizes.slice(0, 12),
              variants: cleanVariants,
              defaultImage: cleanVariants[0]?.imageUrl || product.defaultImage.slice(0, 500),
              featured: Boolean(product.featured),
              badge: (product.badge || '').trim().slice(0, 40),
              totalStock,
              updatedAt: serverTimestamp(),
            });
            showToast(`Updated ${product.name}`);
            return;
          }
        }

        await setDoc(doc(db, 'products', safeId), {
          id: safeId,
          name: product.name.trim().slice(0, FIELD_LIMITS.NAME_MAX),
          slug: safeId,
          category: product.category,
          subCategory: product.subCategory.trim().slice(0, 80),
          artisanMaterial: product.artisanMaterial.trim().slice(0, 120),
          price: Number(product.price),
          description: product.description.trim().slice(0, FIELD_LIMITS.DESC_MAX),
          sizes: product.sizes.slice(0, 12),
          variants: cleanVariants,
          defaultImage: cleanVariants[0]?.imageUrl || product.defaultImage.slice(0, 500),
          featured: Boolean(product.featured),
          badge: (product.badge || '').trim().slice(0, 40),
          totalStock,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Saved ${product.name} to catalog`);
      } catch (error) {
        handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [showToast]
  );

  const toggleProductPin = useCallback(
    async (product: Product) => {
      const nextPinned = !product.featured;
      await saveProduct({ ...product, featured: nextPinned }, true);
      showToast(
        nextPinned
          ? `Pinned ${product.name} to Home Featured Releases`
          : `Unpinned ${product.name} from Home Featured Releases`
      );
    },
    [saveProduct, showToast]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const path = `products/${productId}`;
      try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('Product removed from Firestore');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [showToast]
  );

  const outOfSyncCatalogItems = useMemo(() => {
    const existingMap = new Map(firestoreProducts.map((p) => [p.id, p]));
    return INITIAL_CATALOG.filter((p) => {
      const existing = existingMap.get(p.id);
      if (!existing) return true;
      if (existing.name !== p.name) return true;
      if (existing.category !== p.category || existing.subCategory !== p.subCategory) return true;
      if (existing.defaultImage !== p.defaultImage) return true;
      if ((existing.variants || []).length !== p.variants.length) return true;
      return (existing.variants || []).some(
        (ev, i) =>
          ev.colorName !== p.variants[i]?.colorName ||
          ev.imageUrl !== p.variants[i]?.imageUrl ||
          ev.colorHex !== p.variants[i]?.colorHex
      );
    });
  }, [firestoreProducts]);

  const syncCatalogToFirestore = useCallback(async (): Promise<number> => {
    if (!isAdmin) return 0;
    const existingMap = new Map(firestoreProducts.map((p) => [p.id, p]));
    const toSync = outOfSyncCatalogItems;
    if (toSync.length === 0) {
      showToast(`All ${INITIAL_CATALOG.length} catalog products are already synced in Firestore`);
      return 0;
    }

    try {
      const chunkSize = 40;
      for (let i = 0; i < toSync.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = toSync.slice(i, i + chunkSize);
        for (const item of chunk) {
          const existing = existingMap.get(item.id);
          const sameIdentity = existing?.name === item.name;
          const cleanVariants = item.variants.map((v) => {
            const existingVar = sameIdentity
              ? existing?.variants.find(
                  (ev) => ev.colorName.toLowerCase() === v.colorName.toLowerCase()
                )
              : undefined;
            const sizeStock = existingVar?.sizeStock || v.sizeStock;
            return {
              colorName: v.colorName,
              colorHex: v.colorHex,
              imageUrl: v.imageUrl,
              stock: existingVar ? existingVar.stock : v.stock,
              ...(sizeStock ? { sizeStock } : {}),
            };
          });
          const totalStock = cleanVariants.reduce((sum, v) => sum + v.stock, 0);
          if (existing) {
            batch.update(doc(db, 'products', item.id), {
              name: item.name,
              slug: item.slug,
              category: item.category,
              subCategory: item.subCategory,
              artisanMaterial: item.artisanMaterial,
              price: sameIdentity ? existing.price : item.price,
              description: item.description,
              sizes: item.sizes,
              defaultImage: item.defaultImage,
              variants: cleanVariants,
              featured: sameIdentity ? existing.featured : item.featured,
              badge: sameIdentity ? existing.badge : item.badge,
              totalStock,
              updatedAt: serverTimestamp(),
            });
          } else {
            batch.set(doc(db, 'products', item.id), {
              ...item,
              variants: cleanVariants,
              totalStock,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }
      showToast(`Synced ${toSync.length} artisan products & color variants to Firestore`);
      return toSync.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  }, [isAdmin, firestoreProducts, outOfSyncCatalogItems, showToast]);

  const value = useMemo<StoreContextValue>(
    () => ({
      user,
      profile,
      authReady,
      isAdmin,
      products,
      productsLoading,
      firestoreProductCount: firestoreProducts.length,
      outOfSyncCatalogCount: outOfSyncCatalogItems.length,
      cart,
      cartCount,
      cartSubtotal,
      shippingFee,
      cartTotal,
      orders,
      ordersLoading,
      allOrders,
      allOrdersLoading,
      toastMessage,
      showToast,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      sendPasswordReset,
      resendVerificationEmail,
      refreshAuthUser,
      signOutUser,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      placeOrder,
      cancelOrder,
      updateOrderStatus,
      updateOrderPaymentStatus,
      saveProduct,
      toggleProductPin,
      deleteProduct,
      syncCatalogToFirestore,
    }),
    [
      user,
      profile,
      authReady,
      isAdmin,
      products,
      productsLoading,
      firestoreProducts.length,
      outOfSyncCatalogItems.length,
      cart,
      cartCount,
      cartSubtotal,
      shippingFee,
      cartTotal,
      orders,
      ordersLoading,
      allOrders,
      allOrdersLoading,
      toastMessage,
      showToast,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      sendPasswordReset,
      resendVerificationEmail,
      refreshAuthUser,
      signOutUser,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      placeOrder,
      cancelOrder,
      updateOrderStatus,
      updateOrderPaymentStatus,
      saveProduct,
      toggleProductPin,
      deleteProduct,
      syncCatalogToFirestore,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
