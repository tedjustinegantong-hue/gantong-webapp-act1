# Habing Kalye Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Product Catalog Integrity**: Only verified administrators (`tedjustinegantong@gmail.com` with `email_verified == true` or listed in `/admins/{uid}`) may create, update, or delete `/products/{productId}`. Products are publicly readable for storefront browsing.
2. **Cart Isolation**: A `/users/{userId}/cart/{cartItemId}` document may only be read, created, updated, or deleted by `request.auth.uid == userId` with verified email, and `incoming().userId` must match `userId`.
3. **Order Ownership, Payment Verification & State Machine**: An `/orders/{orderId}` document can only be created when `request.auth.uid == incoming().userId`, `email_verified == true`, `status == 'Pending'`, `paymentMethod in ['COD', 'GCash', 'Maya', 'Card', 'Bank Transfer']`, `paymentStatus in ['Pay on Delivery', 'Awaiting Payment', 'Pending Verification', 'Paid']`, `items.size() >= 1 && items.size() <= 50`, and `total > 0`. Customers cannot forge `Paid` status on COD/Bank Transfer or without a server-verified `gatewaySessionId`, and cannot update `paymentStatus` after creation (admin-only reconciliation). Once an order reaches a terminal state (`Delivered` or `Cancelled`), customers cannot modify it.
4. **PII Isolation**: `/users/{userId}` contains `email` and `orders/{orderId}` contains `customerPhone` and `shippingAddress`. Non-owners and non-admins cannot `get` or `list` another user's profile or orders.
5. **Privilege Escalation Prevention**: Users cannot assign `role: 'admin'` on `/users/{userId}` creation or update unless already a verified bootstrapped admin.
6. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` and `userId` are immutable after creation.

## 2. The "Dirty Dozen" Attack Payloads
1. **Identity Spoofing on Order**: Authenticated user `uid_attacker` creates `/orders/ord1` with `userId: "uid_victim"`. Expected: `PERMISSION_DENIED`.
2. **Privilege Escalation on Profile**: Customer creates `/users/uid_attacker` with `role: "admin"`. Expected: `PERMISSION_DENIED`.
3. **Role Mutation on Profile Update**: Customer updates `/users/uid_attacker` changing `role` from `"customer"` to `"admin"`. Expected: `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Customer creates order with extra field `isPaid: true` or `discountOverride: 9999`. Expected: `PERMISSION_DENIED` (blocked by `keys().hasOnly(...)`).
5. **Email Spoofing**: Token has `email: "tedjustinegantong@gmail.com"` but `email_verified: false` attempting product write. Expected: `PERMISSION_DENIED`.
6. **State Shortcutting on Order Create**: Customer creates `/orders/ord2` with `status: "Delivered"` or `paymentMethod: "COD", paymentStatus: "Paid"`. Expected: `PERMISSION_DENIED`.
7. **Terminal State Bypass**: Customer updates their `Cancelled` order back to `Pending` or self-marks `paymentStatus: "Paid"`. Expected: `PERMISSION_DENIED`.
8. **ID Poisoning**: Attacker creates `/orders/invalid$id..with..dots` or 500-char ID. Expected: `PERMISSION_DENIED`.
9. **Denial of Wallet String Bomb**: Customer submits `shippingAddress` with 5,000 characters. Expected: `PERMISSION_DENIED`.
10. **PII Blanket Read**: Customer A calls `get` on `/users/customer_b` or `/orders/order_of_b`. Expected: `PERMISSION_DENIED`.
11. **Unscoped List Query**: Customer A executes `list` on `/orders` without `where('userId', '==', uid)`. Expected: `PERMISSION_DENIED`.
12. **Cart Cross-Tenant Write**: Customer A writes to `/users/customer_b/cart/item1`. Expected: `PERMISSION_DENIED`.
