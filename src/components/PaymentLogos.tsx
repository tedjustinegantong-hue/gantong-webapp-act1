import React from 'react';
import { Banknote, Landmark } from 'lucide-react';
import type { PaymentMethod } from '../types/store';

export const CashOnDeliveryLogo: React.FC<{ className?: string }> = ({
  className = 'w-8 h-6',
}) => (
  <span
    className={`inline-flex items-center justify-center rounded border border-stone-300 bg-[#F5F1E8] text-[#141413] ${className}`}
    aria-hidden="true"
  >
    <Banknote className="w-4 h-4 stroke-[1.75]" />
  </span>
);

export const GCashLogo: React.FC<{ className?: string }> = ({ className = 'w-14 h-6' }) => (
  <svg
    viewBox="0 0 88 30"
    className={className}
    aria-label="GCash"
    role="img"
  >
    <rect width="88" height="30" rx="5" fill="#007DFE" />
    <circle cx="15" cy="15" r="7" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
    <path d="M15 15h5.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
    <text
      x="27"
      y="19.5"
      fill="#FFFFFF"
      fontSize="12.5"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="-0.2"
    >
      GCash
    </text>
  </svg>
);

export const MayaLogo: React.FC<{ className?: string }> = ({ className = 'w-14 h-6' }) => (
  <svg
    viewBox="0 0 84 30"
    className={className}
    aria-label="Maya"
    role="img"
  >
    <rect width="84" height="30" rx="5" fill="#141413" />
    <circle cx="13" cy="15" r="4.5" fill="#1AD378" />
    <text
      x="23"
      y="19.5"
      fill="#FFFFFF"
      fontSize="13.5"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="0.2"
    >
      maya
    </text>
  </svg>
);

export const VisaMastercardLogos: React.FC<{ className?: string }> = ({
  className = 'inline-flex items-center gap-1.5',
}) => (
  <span className={className} aria-label="Visa and Mastercard">
    {/* Visa mark */}
    <svg viewBox="0 0 46 26" className="w-10 h-6" role="img" aria-label="Visa">
      <rect width="46" height="26" rx="4" fill="#FFFFFF" stroke="#D6D3D1" strokeWidth="1" />
      <text
        x="23"
        y="17.5"
        textAnchor="middle"
        fill="#1A1F71"
        fontSize="11.5"
        fontWeight="800"
        fontStyle="italic"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        VISA
      </text>
    </svg>
    {/* Mastercard mark */}
    <svg viewBox="0 0 42 26" className="w-9 h-6" role="img" aria-label="Mastercard">
      <rect width="42" height="26" rx="4" fill="#141413" />
      <circle cx="16.5" cy="13" r="6.5" fill="#EB001B" />
      <circle cx="25.5" cy="13" r="6.5" fill="#F79E1B" fillOpacity="0.92" />
    </svg>
  </span>
);

export const BankTransferLogo: React.FC<{ className?: string }> = ({
  className = 'w-8 h-6',
}) => (
  <span
    className={`inline-flex items-center justify-center rounded border border-stone-300 bg-white text-[#141413] ${className}`}
    aria-hidden="true"
  >
    <Landmark className="w-4 h-4 stroke-[1.75]" />
  </span>
);

export const PaymentMethodBadge: React.FC<{ method: PaymentMethod }> = ({ method }) => {
  switch (method) {
    case 'COD':
      return <CashOnDeliveryLogo />;
    case 'GCash':
      return <GCashLogo className="w-12 h-5" />;
    case 'Maya':
      return <MayaLogo className="w-12 h-5" />;
    case 'Card':
      return <VisaMastercardLogos />;
    case 'Bank Transfer':
      return <BankTransferLogo />;
  }
};
