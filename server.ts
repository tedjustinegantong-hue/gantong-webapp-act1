import 'dotenv/config';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FREE_SHIPPING_THRESHOLD = 1999;
const STANDARD_SHIPPING_FEE = 85;
const GOOGLE_X509_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

type PaymentMethod = 'COD' | 'GCash' | 'Maya' | 'Card' | 'Bank Transfer';
type PaymentStatus = 'Pay on Delivery' | 'Awaiting Payment' | 'Pending Verification' | 'Paid';
type PaymentMode = 'cod' | 'gateway' | 'qr_reference' | 'bank_transfer' | 'gateway_unconfigured';

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

interface AuthedRequest extends Request {
  auth?: VerifiedFirebaseUser;
}

interface StoredPaymentSession {
  sessionId: string;
  uid: string;
  paymentMethod: PaymentMethod;
  mode: PaymentMode;
  subtotalPhp: number;
  shippingFeePhp: number;
  amountPhp: number;
  referenceCode: string;
  gatewayProvider: 'paymongo' | 'stripe' | null;
  gatewaySessionId: string;
  gatewayCheckoutUrl: string | null;
  qrDataUrl: string | null;
  paymentChannel: string;
  expiresAt: number;
  signature: string;
}

interface CatalogPricingItem {
  name: string;
  price: number;
}

const CATALOG_PRICES: Record<string, CatalogPricingItem> = {
  'hk-tee-04': { name: 'Escolta White Inabel-Trim Polo Shirt', price: 750 },
  'hk-tee-01': { name: 'Kalinga Geometric Boxy Tee', price: 590 },
  'hk-tee-02': { name: 'Baybayin Heritage Heavy Tee', price: 550 },
  'hk-tee-03': { name: 'Vigan Inabel Placket Polo Shirt', price: 790 },
  'hk-tee-05': { name: 'Taal Embroidered Sun Boxy Tee', price: 490 },
  'hk-tee-06': { name: 'Cordillera Binakul Pocket Tee', price: 620 },
  'hk-tee-07': { name: 'Maranao Okir Wave Heavy Tee', price: 580 },
  'hk-shoe-06': { name: 'Manila Gum-Sole Heritage Runner', price: 2150 },
  'hk-shoe-01': { name: 'Marikina Abaca Court Low', price: 1890 },
  'hk-shoe-02': { name: 'Bayanihan Suede High-Top', price: 2190 },
  'hk-shoe-03': { name: 'Tadeco Indigo Loom Runner', price: 2050 },
  'hk-shoe-04': { name: 'Leyte Banig Slip-On Mule', price: 1490 },
  'hk-shoe-05': { name: 'Pampanga Brass-Eyelet Derby Hybrid', price: 1990 },
  'hk-pg-02': { name: 'Escolta Black Pleat Straight Pants', price: 1150 },
  'hk-pg-03': { name: 'Tondo Brown Carpenter Twill Pants', price: 1250 },
  'hk-pg-01': { name: 'Banaue Pleated Ripstop Cargo Pants', price: 1290 },
  'hk-pg-04': { name: 'Handwoven Inabel Loom Craft Set', price: 690 },
  'hk-bag-01': { name: "T'nalak Tech Crossbody Sling", price: 950 },
  'hk-bag-02': { name: 'Solihiya Rattan Utility Tote', price: 1150 },
  'hk-bag-03': { name: 'Cordillera Waxed Inabel Messenger', price: 1390 },
  'hk-cap-01': { name: 'Solihiya Side-Panel 6-Panel Cap', price: 550 },
  'hk-cap-02': { name: 'Tres Estrellas Washed Dad Cap', price: 450 },
  'hk-cap-03': { name: 'Ilocos Loom-Band Sand Bucket Hat', price: 590 },
  'hk-hoodie-01': { name: 'Vigan Inabel Cuff Oversized Hoodie', price: 1390 },
  'hk-hoodie-02': { name: 'Binakul Pocket Heavyweight Pullover', price: 1450 },
  'hk-hoodie-03': { name: 'Kalayaan Baybayin Sun Hoodie', price: 1290 },
};

function loadFirebaseConfig(): FirebaseAppletConfig {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as FirebaseAppletConfig;
    return {
      projectId: parsed.projectId || process.env.GOOGLE_CLOUD_PROJECT || '',
      firestoreDatabaseId: parsed.firestoreDatabaseId || '(default)',
    };
  } catch {
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
      firestoreDatabaseId: '(default)',
    };
  }
}

const FIREBASE_CONFIG = loadFirebaseConfig();
const EPHEMERAL_HMAC_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.PAYMENT_SESSION_SECRET || EPHEMERAL_HMAC_SECRET;
}

const paymentSessions = new Map<string, StoredPaymentSession>();
let cachedCerts: Record<string, string> = {};
let cachedCertsExpiresAt = 0;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of paymentSessions.entries()) {
    if (session.expiresAt <= now) {
      paymentSessions.delete(id);
    }
  }
}

function signSession(session: Omit<StoredPaymentSession, 'signature'>): string {
  const payload = [
    session.sessionId,
    session.uid,
    session.paymentMethod,
    session.mode,
    String(session.amountPhp),
    session.referenceCode,
    session.gatewaySessionId,
    String(session.expiresAt),
  ].join('|');
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
}

function verifySignature(session: StoredPaymentSession, providedSignature: string): boolean {
  if (!providedSignature || typeof providedSignature !== 'string') return false;
  const expected = signSession(session);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(providedSignature, 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function decodeBase64Url(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
}

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedCertsExpiresAt > Date.now() && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const res = await fetch(GOOGLE_X509_CERTS_URL);
  if (!res.ok) {
    throw new Error('Unable to fetch Firebase token verification certificates.');
  }
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = certs;
  cachedCertsExpiresAt = Date.now() + Math.max(60, maxAgeSeconds) * 1000;
  return certs;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed authentication token.');
  }

  const [encodedHeader, encodedPayload, encodedSig] = parts;
  const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    uid?: string;
    email?: string;
    email_verified?: boolean;
    exp?: number;
    iat?: number;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported authentication token algorithm.');
  }

  const certs = await getGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Authentication certificate key not recognized.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  const signatureOk = verifier.verify(certPem, decodeBase64Url(encodedSig));
  if (!signatureOk) {
    throw new Error('Authentication token signature verification failed.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Authentication session expired. Please sign in again.');
  }
  if (!payload.iat || payload.iat > nowSec + 300) {
    throw new Error('Authentication token issued timestamp invalid.');
  }
  if (!FIREBASE_CONFIG.projectId || payload.aud !== FIREBASE_CONFIG.projectId) {
    throw new Error('Authentication token project mismatch.');
  }
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_CONFIG.projectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error('Authentication token issuer mismatch.');
  }
  const uid = payload.sub || payload.uid || '';
  if (!uid || uid.length > 128) {
    throw new Error('Authentication token missing valid user ID.');
  }
  if (payload.email_verified !== true) {
    throw new Error('Verified email required to initiate checkout payment.');
  }

  return {
    uid,
    email: payload.email || '',
    emailVerified: true,
  };
}

async function requireFirebaseAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Empty Bearer token.' });
    return;
  }
  try {
    req.auth = await verifyFirebaseIdToken(token);
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Authentication verification failed.',
    });
  }
}

async function lookupFirestoreProductPrice(productId: string): Promise<CatalogPricingItem | null> {
  if (!FIREBASE_CONFIG.projectId || !/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
    return null;
  }
  const dbId = encodeURIComponent(FIREBASE_CONFIG.firestoreDatabaseId || '(default)');
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    FIREBASE_CONFIG.projectId
  )}/databases/${dbId}/documents/products/${encodeURIComponent(productId)}`;
  try {
    const resp = await fetch(docUrl);
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      fields?: {
        name?: { stringValue?: string };
        price?: { integerValue?: string; doubleValue?: number };
      };
    };
    const rawPrice =
      data.fields?.price?.doubleValue ??
      (data.fields?.price?.integerValue ? Number(data.fields.price.integerValue) : NaN);
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;
    return {
      name: data.fields?.name?.stringValue || productId,
      price: rawPrice,
    };
  } catch {
    return null;
  }
}

function buildQrPhPayload(params: {
  merchantName: string;
  city: string;
  amountPhp: number;
  referenceCode: string;
  walletLabel: 'GCash' | 'Maya';
}): string {
  const tlv = (tag: string, value: string): string => {
    const len = String(value.length).padStart(2, '0');
    return `${tag}${len}${value}`;
  };
  const cleanName = params.merchantName.slice(0, 25);
  const cleanCity = params.city.slice(0, 15);
  const merchantAccount = tlv('00', 'ph.ppmi.p2m') + tlv('01', params.walletLabel.toUpperCase());
  const additionalData = tlv('05', params.referenceCode.slice(0, 25));
  const bodyWithoutCrc =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('28', merchantAccount) +
    tlv('52', '5691') +
    tlv('53', '608') +
    tlv('54', params.amountPhp.toFixed(2)) +
    tlv('58', 'PH') +
    tlv('59', cleanName) +
    tlv('60', cleanCity) +
    tlv('62', additionalData) +
    '6304';

  // CRC-16/CCITT-FALSE checksum for EMVCo QRPH format
  let crc = 0xffff;
  for (let i = 0; i < bodyWithoutCrc.length; i++) {
    crc ^= bodyWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return `${bodyWithoutCrc}${crc.toString(16).toUpperCase().padStart(4, '0')}`;
}

function resolveSafeRedirectBase(req: Request, requestedOrigin?: unknown): string {
  const fallback =
    process.env.APP_URL && /^https?:\/\//i.test(process.env.APP_URL)
      ? process.env.APP_URL.replace(/\/+$/, '')
      : `${req.protocol}://${req.get('host') || `localhost:${PORT}`}`;
  if (typeof requestedOrigin !== 'string') return fallback;
  try {
    const parsed = new URL(requestedOrigin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    // Ignore malformed origin
  }
  return fallback;
}

async function createPayMongoCheckoutSession(params: {
  secretKey: string;
  paymentMethodType: 'gcash' | 'paymaya' | 'card';
  lineItems: Array<{ name: string; amountCentavos: number; quantity: number }>;
  referenceCode: string;
  customerName: string;
  customerEmail: string;
  redirectBase: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const basicToken = Buffer.from(`${params.secretKey}:`).toString('base64');
  const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: {
            name: params.customerName.slice(0, 100),
            email: params.customerEmail.slice(0, 160),
          },
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `Habing Kalye Order ${params.referenceCode}`,
          reference_number: params.referenceCode,
          payment_method_types: [params.paymentMethodType],
          line_items: params.lineItems.map((item) => ({
            currency: 'PHP',
            amount: item.amountCentavos,
            name: item.name.slice(0, 120),
            quantity: item.quantity,
          })),
          success_url: `${params.redirectBase}/?payment_status=returned&ref=${encodeURIComponent(
            params.referenceCode
          )}`,
          cancel_url: `${params.redirectBase}/?payment_status=cancelled&ref=${encodeURIComponent(
            params.referenceCode
          )}`,
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
    errors?: Array<{ detail?: string }>;
  };

  if (!response.ok || !payload.data?.id || !payload.data.attributes?.checkout_url) {
    const detail = payload.errors?.[0]?.detail || 'Unable to initialize PayMongo checkout session.';
    throw new Error(detail);
  }

  return {
    sessionId: payload.data.id,
    checkoutUrl: payload.data.attributes.checkout_url,
  };
}

async function checkPayMongoSessionPaid(
  secretKey: string,
  gatewaySessionId: string
): Promise<{ paid: boolean; channel: string; paymentId?: string }> {
  const basicToken = Buffer.from(`${secretKey}:`).toString('base64');
  const response = await fetch(
    `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(gatewaySessionId)}`,
    {
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new Error('Unable to query PayMongo checkout session status.');
  }
  const payload = (await response.json()) as {
    data?: {
      attributes?: {
        payment_intent?: { attributes?: { status?: string } };
        payments?: Array<{
          id?: string;
          attributes?: {
            status?: string;
            source?: { type?: string };
          };
        }>;
      };
    };
  };
  const payments = payload.data?.attributes?.payments || [];
  const settledPayment = payments.find((p) => p.attributes?.status === 'paid');
  const intentStatus = payload.data?.attributes?.payment_intent?.attributes?.status;
  const paid = Boolean(settledPayment) || intentStatus === 'succeeded';
  const sourceType = settledPayment?.attributes?.source?.type || 'paymongo';
  return {
    paid,
    channel: `PayMongo (${sourceType})`,
    paymentId: settledPayment?.id,
  };
}

async function createStripeCheckoutSession(params: {
  secretKey: string;
  lineItems: Array<{ name: string; amountCentavos: number; quantity: number }>;
  referenceCode: string;
  customerEmail: string;
  redirectBase: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('payment_method_types[0]', 'card');
  form.set('client_reference_id', params.referenceCode);
  if (params.customerEmail) {
    form.set('customer_email', params.customerEmail.slice(0, 160));
  }
  form.set(
    'success_url',
    `${params.redirectBase}/?payment_status=returned&ref=${encodeURIComponent(params.referenceCode)}`
  );
  form.set(
    'cancel_url',
    `${params.redirectBase}/?payment_status=cancelled&ref=${encodeURIComponent(params.referenceCode)}`
  );
  params.lineItems.forEach((item, idx) => {
    form.set(`line_items[${idx}][price_data][currency]`, 'php');
    form.set(`line_items[${idx}][price_data][unit_amount]`, String(item.amountCentavos));
    form.set(`line_items[${idx}][price_data][product_data][name]`, item.name.slice(0, 120));
    form.set(`line_items[${idx}][quantity]`, String(item.quantity));
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(payload.error?.message || 'Unable to initialize Stripe card checkout session.');
  }
  return {
    sessionId: payload.id,
    checkoutUrl: payload.url,
  };
}

async function checkStripeSessionPaid(
  secretKey: string,
  gatewaySessionId: string
): Promise<{ paid: boolean; channel: string; paymentId?: string }> {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(gatewaySessionId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error('Unable to query Stripe checkout session status.');
  }
  const payload = (await response.json()) as {
    payment_status?: string;
    payment_intent?: string;
  };
  return {
    paid: payload.payment_status === 'paid',
    channel: 'Stripe Card (Visa / Mastercard)',
    paymentId: payload.payment_intent,
  };
}

function isValidMethod(value: unknown): value is PaymentMethod {
  return (
    value === 'COD' ||
    value === 'GCash' ||
    value === 'Maya' ||
    value === 'Card' ||
    value === 'Bank Transfer'
  );
}

export function getPublicPaymentConfig() {
  const paymongoConfigured = Boolean(process.env.PAYMONGO_SECRET_KEY?.trim());
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  return {
    paymongoConfigured,
    stripeConfigured,
    availableWalletGateway: paymongoConfigured ? ('paymongo' as const) : null,
    availableCardGateway: paymongoConfigured
      ? ('paymongo' as const)
      : stripeConfigured
      ? ('stripe' as const)
      : null,
    merchant: {
      name: 'Habing Kalye Streetwear PH',
      gcashNumber: process.env.MERCHANT_GCASH_NUMBER?.trim() || '0917 842 4224',
      mayaNumber: process.env.MERCHANT_MAYA_NUMBER?.trim() || '0918 764 4224',
      bankAccounts: [
        {
          bankCode: 'BPI',
          bankName: 'Bank of the Philippine Islands (BPI)',
          accountName: 'Habing Kalye Artisanal Streetwear',
          accountNumber: process.env.MERCHANT_BANK_ACCOUNT?.trim() || '0049-8120-7741',
          channels: ['InstaPay', 'PESONet'],
        },
        {
          bankCode: 'UnionBank',
          bankName: 'UnionBank of the Philippines',
          accountName: 'Habing Kalye Artisanal Streetwear',
          accountNumber: '1094-2285-6014',
          channels: ['InstaPay', 'PESONet'],
        },
      ],
    },
  };
}

export function createPaymentRouter() {
  const router = express.Router();

  router.get('/config', (_req: Request, res: Response) => {
    res.json(getPublicPaymentConfig());
  });

  router.post(
    '/session',
    requireFirebaseAuth,
    async (req: AuthedRequest, res: Response): Promise<void> => {
      cleanupExpiredSessions();
      const authUser = req.auth!;
      const body = (req.body || {}) as {
        paymentMethod?: unknown;
        items?: Array<{ productId?: unknown; quantity?: unknown }>;
        customerName?: unknown;
        customerEmail?: unknown;
        origin?: unknown;
      };

      if (!isValidMethod(body.paymentMethod)) {
        res.status(400).json({ error: 'Invalid payment method selected.' });
        return;
      }
      if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
        res.status(400).json({ error: 'Checkout cart must contain between 1 and 50 line items.' });
        return;
      }

      let subtotalPhp = 0;
      const gatewayLineItems: Array<{ name: string; amountCentavos: number; quantity: number }> = [];

      for (const rawItem of body.items) {
        const productId = typeof rawItem?.productId === 'string' ? rawItem.productId.trim() : '';
        const qty = Number(rawItem?.quantity);
        if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 99) {
          res.status(400).json({ error: 'Invalid product or quantity in cart.' });
          return;
        }
        let catalogItem: CatalogPricingItem | null = CATALOG_PRICES[productId] || null;
        if (!catalogItem) {
          catalogItem = await lookupFirestoreProductPrice(productId);
        }
        if (!catalogItem) {
          res.status(400).json({ error: `Unrecognized catalog product (${productId}).` });
          return;
        }
        subtotalPhp += catalogItem.price * qty;
        gatewayLineItems.push({
          name: catalogItem.name,
          amountCentavos: Math.round(catalogItem.price * 100),
          quantity: qty,
        });
      }

      const shippingFeePhp = subtotalPhp >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
      const amountPhp = subtotalPhp + shippingFeePhp;
      if (shippingFeePhp > 0) {
        gatewayLineItems.push({
          name: 'Nationwide Courier Shipping',
          amountCentavos: shippingFeePhp * 100,
          quantity: 1,
        });
      }

      const prefixMap: Record<PaymentMethod, string> = {
        COD: 'HK-COD',
        GCash: 'HK-GC',
        Maya: 'HK-MY',
        Card: 'HK-CRD',
        'Bank Transfer': 'HK-BT',
      };
      const randomToken = crypto.randomBytes(4).toString('hex').toUpperCase();
      const referenceCode = `${prefixMap[body.paymentMethod]}-${randomToken}`;
      const sessionId = `ps_${crypto.randomBytes(12).toString('hex')}`;
      const expiresAt = Date.now() + 30 * 60 * 1000;
      const redirectBase = resolveSafeRedirectBase(req, body.origin);
      const customerName =
        typeof body.customerName === 'string' && body.customerName.trim()
          ? body.customerName.trim()
          : 'Habing Kalye Customer';
      const customerEmail =
        typeof body.customerEmail === 'string' && body.customerEmail.trim()
          ? body.customerEmail.trim()
          : authUser.email;

      const paymongoKey = process.env.PAYMONGO_SECRET_KEY?.trim();
      const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

      let mode: PaymentMode = 'cod';
      let gatewayProvider: 'paymongo' | 'stripe' | null = null;
      let gatewaySessionId = sessionId;
      let gatewayCheckoutUrl: string | null = null;
      let qrDataUrl: string | null = null;
      let paymentStatus: PaymentStatus = 'Pay on Delivery';
      let paymentChannel = 'Cash on Delivery Courier';
      let message =
        'Your order is prepared for Cash on Delivery. Settle directly with the Habing Kalye courier upon parcel arrival.';

      try {
        if (body.paymentMethod === 'COD') {
          mode = 'cod';
          paymentStatus = 'Pay on Delivery';
          paymentChannel = 'Cash on Delivery Courier';
        } else if (body.paymentMethod === 'GCash' || body.paymentMethod === 'Maya') {
          if (paymongoKey) {
            const pmType = body.paymentMethod === 'GCash' ? 'gcash' : 'paymaya';
            const gatewaySession = await createPayMongoCheckoutSession({
              secretKey: paymongoKey,
              paymentMethodType: pmType,
              lineItems: gatewayLineItems,
              referenceCode,
              customerName,
              customerEmail,
              redirectBase,
            });
            mode = 'gateway';
            gatewayProvider = 'paymongo';
            gatewaySessionId = gatewaySession.sessionId;
            gatewayCheckoutUrl = gatewaySession.checkoutUrl;
            qrDataUrl = await QRCode.toDataURL(gatewaySession.checkoutUrl, {
              width: 240,
              margin: 2,
              color: { dark: '#141413', light: '#FFFFFF' },
            });
            paymentStatus = 'Awaiting Payment';
            paymentChannel = `PayMongo ${body.paymentMethod}`;
            message = `Scan the QR code or open the secure ${body.paymentMethod} PayMongo checkout link, then verify settlement before completing your order.`;
          } else {
            const qrPayload = buildQrPhPayload({
              merchantName: 'HABING KALYE',
              city: 'MANILA',
              amountPhp,
              referenceCode,
              walletLabel: body.paymentMethod,
            });
            qrDataUrl = await QRCode.toDataURL(qrPayload, {
              width: 240,
              margin: 2,
              color: { dark: '#141413', light: '#FFFFFF' },
            });
            mode = 'qr_reference';
            paymentStatus = 'Pending Verification';
            paymentChannel = `${body.paymentMethod} QRPH`;
            message = `Scan this ${body.paymentMethod} QRPH code in your app, complete the transfer of ₱${amountPhp.toLocaleString(
              'en-PH'
            )}, and enter your transaction reference number for treasury verification.`;
          }
        } else if (body.paymentMethod === 'Card') {
          if (paymongoKey) {
            const gatewaySession = await createPayMongoCheckoutSession({
              secretKey: paymongoKey,
              paymentMethodType: 'card',
              lineItems: gatewayLineItems,
              referenceCode,
              customerName,
              customerEmail,
              redirectBase,
            });
            mode = 'gateway';
            gatewayProvider = 'paymongo';
            gatewaySessionId = gatewaySession.sessionId;
            gatewayCheckoutUrl = gatewaySession.checkoutUrl;
            paymentStatus = 'Awaiting Payment';
            paymentChannel = 'PayMongo Card (Visa / Mastercard)';
            message =
              'Complete your Visa or Mastercard payment on the encrypted PayMongo checkout gateway, then verify settlement.';
          } else if (stripeKey) {
            const gatewaySession = await createStripeCheckoutSession({
              secretKey: stripeKey,
              lineItems: gatewayLineItems,
              referenceCode,
              customerEmail,
              redirectBase,
            });
            mode = 'gateway';
            gatewayProvider = 'stripe';
            gatewaySessionId = gatewaySession.sessionId;
            gatewayCheckoutUrl = gatewaySession.checkoutUrl;
            paymentStatus = 'Awaiting Payment';
            paymentChannel = 'Stripe Card (Visa / Mastercard)';
            message =
              'Complete your Visa or Mastercard payment on the encrypted Stripe checkout gateway, then verify settlement.';
          } else {
            mode = 'gateway_unconfigured';
            paymentStatus = 'Awaiting Payment';
            paymentChannel = 'Card Gateway Required';
            message =
              'Hosted Visa & Mastercard processing requires PAYMONGO_SECRET_KEY or STRIPE_SECRET_KEY in the server environment. Raw card inputs and simulated approvals are disabled for your security.';
          }
        } else if (body.paymentMethod === 'Bank Transfer') {
          mode = 'bank_transfer';
          paymentStatus = 'Pending Verification';
          paymentChannel = 'BPI InstaPay';
          message =
            'Transfer the exact total via InstaPay or PESONet to our BPI or UnionBank settlement account, then submit your bank reference number for verification.';
        }
      } catch (err) {
        res.status(502).json({
          error:
            err instanceof Error
              ? err.message
              : 'Payment gateway could not initialize checkout session.',
        });
        return;
      }

      const baseSession = {
        sessionId,
        uid: authUser.uid,
        paymentMethod: body.paymentMethod,
        mode,
        subtotalPhp,
        shippingFeePhp,
        amountPhp,
        referenceCode,
        gatewayProvider,
        gatewaySessionId,
        gatewayCheckoutUrl,
        qrDataUrl,
        paymentChannel,
        expiresAt,
      };
      const signature = signSession(baseSession);
      const fullSession: StoredPaymentSession = { ...baseSession, signature };
      paymentSessions.set(sessionId, fullSession);

      res.json({
        sessionId,
        signature,
        paymentMethod: body.paymentMethod,
        mode,
        paymentStatus,
        paymentChannel,
        subtotalPhp,
        shippingFeePhp,
        amountPhp,
        referenceCode,
        gatewayProvider,
        gatewayConfigured: mode !== 'gateway_unconfigured',
        gatewaySessionId,
        gatewayCheckoutUrl,
        qrDataUrl,
        expiresAt,
        message,
      });
    }
  );

  router.post(
    '/verify',
    requireFirebaseAuth,
    async (req: AuthedRequest, res: Response): Promise<void> => {
      cleanupExpiredSessions();
      const authUser = req.auth!;
      const body = (req.body || {}) as {
        sessionId?: unknown;
        signature?: unknown;
        codConfirmed?: unknown;
        paymentReference?: unknown;
        paymentChannel?: unknown;
      };

      const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
      const providedSignature = typeof body.signature === 'string' ? body.signature.trim() : '';
      if (!sessionId || !providedSignature) {
        res.status(400).json({ error: 'Missing payment session identifier or signature.' });
        return;
      }

      const session = paymentSessions.get(sessionId);
      if (!session || session.expiresAt <= Date.now()) {
        res.status(404).json({
          error: 'Payment session expired or not found. Please refresh the payment section.',
        });
        return;
      }
      if (session.uid !== authUser.uid) {
        res.status(403).json({ error: 'Payment session does not belong to the signed-in account.' });
        return;
      }
      if (!verifySignature(session, providedSignature)) {
        res.status(403).json({ error: 'Payment session integrity check failed.' });
        return;
      }

      if (session.mode === 'gateway_unconfigured') {
        res.status(400).json({
          error:
            'Card gateway secret key is not configured on the server. Choose COD, GCash, Maya, or Bank Transfer, or configure PAYMONGO_SECRET_KEY / STRIPE_SECRET_KEY.',
        });
        return;
      }

      if (session.mode === 'cod') {
        if (body.codConfirmed !== true) {
          res.status(400).json({
            error: 'Please confirm Cash on Delivery payment commitment before placing your order.',
          });
          return;
        }
        res.json({
          verified: true,
          paymentMethod: session.paymentMethod,
          paymentStatus: 'Pay on Delivery' as PaymentStatus,
          paymentChannel: 'Cash on Delivery Courier',
          paymentReference: session.referenceCode,
          gatewaySessionId: session.sessionId,
          amountPhp: session.amountPhp,
          subtotalPhp: session.subtotalPhp,
          shippingFeePhp: session.shippingFeePhp,
        });
        return;
      }

      if (session.mode === 'gateway') {
        try {
          if (session.gatewayProvider === 'paymongo') {
            const paymongoKey = process.env.PAYMONGO_SECRET_KEY?.trim();
            if (!paymongoKey) {
              res.status(500).json({ error: 'PayMongo configuration missing during verification.' });
              return;
            }
            const status = await checkPayMongoSessionPaid(paymongoKey, session.gatewaySessionId);
            if (!status.paid) {
              res.status(402).json({
                verified: false,
                paymentStatus: 'Awaiting Payment' as PaymentStatus,
                error:
                  'PayMongo has not recorded a completed payment for this session yet. Complete the payment in the gateway window, then click Verify again.',
              });
              return;
            }
            res.json({
              verified: true,
              paymentMethod: session.paymentMethod,
              paymentStatus: 'Paid' as PaymentStatus,
              paymentChannel: status.channel,
              paymentReference: status.paymentId || session.referenceCode,
              gatewaySessionId: session.gatewaySessionId,
              amountPhp: session.amountPhp,
              subtotalPhp: session.subtotalPhp,
              shippingFeePhp: session.shippingFeePhp,
            });
            return;
          }

          if (session.gatewayProvider === 'stripe') {
            const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
            if (!stripeKey) {
              res.status(500).json({ error: 'Stripe configuration missing during verification.' });
              return;
            }
            const status = await checkStripeSessionPaid(stripeKey, session.gatewaySessionId);
            if (!status.paid) {
              res.status(402).json({
                verified: false,
                paymentStatus: 'Awaiting Payment' as PaymentStatus,
                error:
                  'Stripe has not recorded a completed card payment for this session yet. Complete checkout in the Stripe window, then verify again.',
              });
              return;
            }
            res.json({
              verified: true,
              paymentMethod: session.paymentMethod,
              paymentStatus: 'Paid' as PaymentStatus,
              paymentChannel: status.channel,
              paymentReference: status.paymentId || session.referenceCode,
              gatewaySessionId: session.gatewaySessionId,
              amountPhp: session.amountPhp,
              subtotalPhp: session.subtotalPhp,
              shippingFeePhp: session.shippingFeePhp,
            });
            return;
          }
        } catch (err) {
          res.status(502).json({
            error:
              err instanceof Error
                ? err.message
                : 'Unable to verify payment settlement with upstream gateway.',
          });
          return;
        }
      }

      // Manual QR (GCash / Maya QRPH) or Bank Transfer -> Pending Verification (never Paid)
      const rawRef =
        typeof body.paymentReference === 'string' ? body.paymentReference.trim() : '';
      if (!/^[A-Za-z0-9-]{6,40}$/.test(rawRef)) {
        res.status(400).json({
          error:
            'Enter a valid transaction reference number (6–40 letters, numbers, or dashes) from your wallet or bank receipt.',
        });
        return;
      }

      const rawChannel =
        typeof body.paymentChannel === 'string' && body.paymentChannel.trim()
          ? body.paymentChannel.trim().slice(0, 80)
          : session.paymentChannel;

      res.json({
        verified: true,
        paymentMethod: session.paymentMethod,
        paymentStatus: 'Pending Verification' as PaymentStatus,
        paymentChannel: rawChannel,
        paymentReference: rawRef.toUpperCase(),
        gatewaySessionId: session.sessionId,
        amountPhp: session.amountPhp,
        subtotalPhp: session.subtotalPhp,
        shippingFeePhp: session.shippingFeePhp,
      });
    }
  );

  return router;
}

export async function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use('/api/payments', createPaymentRouter());

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const shouldServeStatic =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distDir, 'index.html')));

  if (shouldServeStatic) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

const isEntrypoint =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isEntrypoint) {
  createApp()
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Habing Kalye server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start Habing Kalye server:', err);
      process.exit(1);
    });
}
