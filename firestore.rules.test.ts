/**
 * Phase 0 Dirty Dozen Security Test Matrix for Habing Kalye Firestore Rules.
 * Validates invariants and expected PERMISSION_DENIED outcomes for adversarial payloads.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const dirtyDozenPayloads: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Order',
    targetPath: '/orders/ord_spoof_1',
    operation: 'create',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'ord_spoof_1',
      orderNumber: 'HK-2026-9001',
      userId: 'uid_victim',
      status: 'Pending',
      total: 2450,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Privilege Escalation on Profile Creation',
    targetPath: '/users/uid_attacker',
    operation: 'create',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'uid_attacker',
      displayName: 'Attacker',
      email: 'attacker@example.com',
      role: 'admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Role Mutation on Profile Update',
    targetPath: '/users/uid_attacker',
    operation: 'update',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: { role: 'admin' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Order',
    targetPath: '/orders/ord_shadow_1',
    operation: 'create',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'ord_shadow_1',
      userId: 'uid_attacker',
      status: 'Pending',
      isPaid: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Email Spoofing with Unverified Admin Email',
    targetPath: '/products/prod_spoof',
    operation: 'create',
    auth: { uid: 'uid_spoof', email: 'tedjustinegantong@gmail.com', email_verified: false },
    payload: { id: 'prod_spoof', name: 'Spoofed Hoodie', price: 1 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'State Shortcutting on Order Create',
    targetPath: '/orders/ord_shortcut_1',
    operation: 'create',
    auth: { uid: 'uid_customer', email: 'buyer@example.com', email_verified: true },
    payload: {
      id: 'ord_shortcut_1',
      userId: 'uid_customer',
      status: 'Delivered',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Bypass',
    targetPath: '/orders/ord_cancelled',
    operation: 'update',
    auth: { uid: 'uid_customer', email: 'buyer@example.com', email_verified: true },
    payload: { status: 'Pending' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning with Illegal Characters',
    targetPath: '/orders/bad..id$99',
    operation: 'create',
    auth: { uid: 'uid_customer', email: 'buyer@example.com', email_verified: true },
    payload: { id: 'bad..id$99', userId: 'uid_customer', status: 'Pending' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Denial of Wallet String Bomb',
    targetPath: '/orders/ord_bomb_1',
    operation: 'create',
    auth: { uid: 'uid_customer', email: 'buyer@example.com', email_verified: true },
    payload: {
      id: 'ord_bomb_1',
      userId: 'uid_customer',
      shippingAddress: 'X'.repeat(5000),
      status: 'Pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'PII Blanket Read on Another User',
    targetPath: '/users/uid_victim',
    operation: 'get',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unscoped List Query on Orders',
    targetPath: '/orders',
    operation: 'list',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-Tenant Cart Write',
    targetPath: '/users/uid_victim/cart/item_1',
    operation: 'create',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: { id: 'item_1', userId: 'uid_victim', quantity: 1 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'Forged Paid Status on COD Order Create',
    targetPath: '/orders/ord_forged_cod',
    operation: 'create',
    auth: { uid: 'uid_customer', email: 'buyer@example.com', email_verified: true },
    payload: {
      id: 'ord_forged_cod',
      userId: 'uid_customer',
      paymentMethod: 'COD',
      paymentStatus: 'Paid',
      status: 'Pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 14,
    name: 'Customer Self-Marking Digital Payment as Paid Without Admin',
    targetPath: '/orders/ord_pending_bt',
    operation: 'update',
    auth: { uid: 'uid_customer', email: 'buyer@example.com', email_verified: true },
    payload: { paymentStatus: 'Paid' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
