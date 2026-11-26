import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LogOut,
  MailCheck,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import type { ProductCategory } from '../types/store';
import { STUDIO_IMAGES } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { ResilientImage } from './ResilientImage';
import type { AppView } from './Navbar';

interface LoginViewProps {
  onNavigate: (view: AppView, category?: 'All' | ProductCategory) => void;
  onBackToStore: () => void;
}

type AuthMode = 'signin' | 'register' | 'forgot';

const REMEMBERED_EMAIL_KEY = 'hk_remembered_email_v1';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Custom Habing Kalye woven shuttle-diamond monogram emblem.
 */
const HabingKalyeLogo: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <div className="inline-flex items-center gap-3">
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="1.5"
        y="1.5"
        width="33"
        height="33"
        rx="8"
        fill={dark ? '#FFFFFF' : '#141413'}
        stroke={dark ? '#D6C7B2' : '#141413'}
        strokeWidth="1.5"
      />
      {/* Concentric Ilocano Binakul diamond weave */}
      <path
        d="M18 6L30 18L18 30L6 18L18 6Z"
        stroke={dark ? '#141413' : '#F5F1E8'}
        strokeWidth="1.5"
      />
      <path
        d="M18 11.5L24.5 18L18 24.5L11.5 18L18 11.5Z"
        stroke="#B89B72"
        strokeWidth="1.4"
      />
      {/* Central T'nalak shuttle knot */}
      <rect
        x="16"
        y="16"
        width="4"
        height="4"
        transform="rotate(45 18 16)"
        fill="#8C2D25"
      />
    </svg>
    <div className="leading-none">
      <span
        className={`font-display text-lg font-bold tracking-tight block ${
          dark ? 'text-white' : 'text-[#141413]'
        }`}
      >
        Habing Kalye
      </span>
      <span
        className={`text-[11px] font-medium tracking-wide block mt-1 ${
          dark ? 'text-[#D6C7B2]' : 'text-[#6E5A44]'
        }`}
      >
        Filipino Artisan Streetwear
      </span>
    </div>
  </div>
);

/**
 * Repeating traditional Inabel / T'nalak geometric border strip.
 */
const WovenTextileBorder: React.FC<{ idPrefix: string; variant?: 'light' | 'dark' }> = ({
  idPrefix,
  variant = 'light',
}) => {
  const strokeA = variant === 'dark' ? '#C2A67D' : '#8D6B4A';
  const strokeB = variant === 'dark' ? '#8C2D25' : '#A68A64';
  const strokeC = variant === 'dark' ? '#F5F1E8' : '#141413';

  return (
    <div className="w-full h-4 overflow-hidden select-none" aria-hidden="true">
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern
            id={`habi-border-${idPrefix}`}
            width="32"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 8L8 1L16 8L8 15Z" fill="none" stroke={strokeA} strokeWidth="1.2" />
            <path d="M16 8L24 1L32 8L24 15Z" fill="none" stroke={strokeA} strokeWidth="1.2" />
            <path d="M8 5L11 8L8 11L5 8Z" fill={strokeB} />
            <path d="M24 5L27 8L24 11L21 8Z" fill={strokeC} opacity="0.65" />
            <line x1="0" y1="0.75" x2="32" y2="0.75" stroke={strokeA} strokeWidth="0.75" opacity="0.5" />
            <line x1="0" y1="15.25" x2="32" y2="15.25" stroke={strokeA} strokeWidth="0.75" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="16" fill={`url(#habi-border-${idPrefix})`} />
      </svg>
    </div>
  );
};

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate, onBackToStore }) => {
  const {
    user,
    profile,
    isAdmin,
    orders,
    cartCount,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshAuthUser,
    signOutUser,
  } = useStore();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifyingAction, setVerifyingAction] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
    setFormNotice(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const persistRememberedEmail = (cleanEmail: string) => {
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const cleanEmail = email.trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(cleanEmail, password, rememberMe);
      persistRememberedEmail(cleanEmail);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Please choose a password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail(cleanName, cleanEmail, password, rememberMe);
      persistRememberedEmail(cleanEmail);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const cleanEmail = email.trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFormError('Please enter the email address linked to your account.');
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordReset(cleanEmail);
      setFormNotice(
        `A password reset link has been sent to ${cleanEmail}. Check your inbox and spam folder.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setFormNotice(null);
    setGoogleLoading(true);
    try {
      const signedInUser = await signInWithGoogle();
      if (!signedInUser) {
        setFormError('Google sign-in was cancelled or blocked by your browser popup settings.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to complete Google sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setFormError(null);
    setFormNotice(null);
    setVerifyingAction(true);
    try {
      await resendVerificationEmail();
      setFormNotice('Verification link sent. Please check your inbox and click the link.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to resend verification email.');
    } finally {
      setVerifyingAction(false);
    }
  };

  const handleRefreshVerification = async () => {
    setFormError(null);
    setFormNotice(null);
    setVerifyingAction(true);
    try {
      const verified = await refreshAuthUser();
      if (!verified) {
        setFormError(
          'Your email is not verified yet. Open the verification email in your inbox, click the link, then check again.'
        );
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to refresh verification status.');
    } finally {
      setVerifyingAction(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#F5F1E8] py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center">
      {/* Subtle Filipino Binakul / Inabel woven textile canvas pattern */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.06]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="habing-kalye-weave-bg"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M32 0L64 32L32 64L0 32Z"
              fill="none"
              stroke="#4A3222"
              strokeWidth="1.1"
            />
            <path
              d="M32 10L54 32L32 54L10 32Z"
              fill="none"
              stroke="#6B4C35"
              strokeWidth="0.9"
            />
            <path
              d="M32 20L44 32L32 44L20 32Z"
              fill="none"
              stroke="#8C2D25"
              strokeWidth="0.8"
            />
            <line x1="0" y1="32" x2="64" y2="32" stroke="#8D6B4A" strokeWidth="0.45" />
            <line x1="32" y1="0" x2="32" y2="64" stroke="#8D6B4A" strokeWidth="0.45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#habing-kalye-weave-bg)" />
      </svg>

      <div className="relative z-10 max-w-5xl w-full mx-auto">
        <div className="bg-white border border-[#DDD4C4] rounded-2xl overflow-hidden shadow-[0_24px_60px_-28px_rgba(20,20,19,0.22)] grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* LEFT COLUMN: Clean Habing Kalye Authentication Form */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
            <div className="space-y-7 max-w-md w-full mx-auto">
              {/* Habing Kalye Logo */}
              <div className="flex items-center justify-between gap-4">
                <HabingKalyeLogo />
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="text-xs font-medium text-[#6E5A44] hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Back to Shop
                </button>
              </div>

              {user ? (
                /* SIGNED-IN MEMBER VIEW */
                <div className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#8C2D25] tracking-wide">
                      Habing Kalye Member
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#141413] text-balance">
                      Mabuhay, {profile?.displayName || user.displayName || 'Kabayan'}
                    </h1>
                    <p className="text-sm text-stone-600 break-all">{user.email}</p>
                  </div>

                  {!user.emailVerified && (
                    <div className="p-4 rounded-xl bg-[#F5F1E8] border border-[#D8CEBC] space-y-3">
                      <div className="flex items-start gap-2.5">
                        <MailCheck className="w-4 h-4 text-[#8C2D25] shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-[#141413]">
                            Verify your email to sync bag &amp; checkout
                          </p>
                          <p className="text-stone-600 leading-relaxed">
                            Click the verification link sent to your inbox, then tap Refresh Status below.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={verifyingAction}
                          onClick={() => void handleRefreshVerification()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#141413] hover:bg-[#292524] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Refresh Status</span>
                        </button>
                        <button
                          type="button"
                          disabled={verifyingAction}
                          onClick={() => void handleResendVerification()}
                          className="px-3.5 py-2 bg-white border border-[#D8CEBC] hover:border-[#141413] text-[#141413] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Resend Link
                        </button>
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#8C2D25]">
                      {formError}
                    </div>
                  )}
                  {formNotice && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      {formNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#ECE6DA] text-xs">
                    <div>
                      <span className="text-stone-500 block">Order Archive</span>
                      <span className="font-display text-2xl font-bold text-[#141413] tabular-nums">
                        {orders.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Items in Bag</span>
                      <span className="font-display text-2xl font-bold text-[#141413] tabular-nums">
                        {cartCount}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => onNavigate('shop', 'All')}
                      className="w-full py-3 px-5 bg-[#141413] hover:bg-[#2A2825] text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Browse Streetwear Collection</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('orders')}
                      className="w-full py-3 px-5 bg-[#F5F1E8] hover:bg-[#EAE3D5] border border-[#DDD4C4] text-[#141413] text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4" />
                      <span>View Order History</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onNavigate('admin')}
                        className="w-full py-3 px-5 bg-white border border-[#8C2D25]/40 hover:border-[#8C2D25] text-[#8C2D25] text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Open Studio Admin Dashboard</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => void signOutUser()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#8C2D25] transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                    <button
                      type="button"
                      onClick={onBackToStore}
                      className="text-xs font-medium text-[#6E5A44] hover:text-[#141413] cursor-pointer"
                    >
                      Continue browsing
                    </button>
                  </div>
                </div>
              ) : mode === 'forgot' ? (
                /* FORGOT PASSWORD VIEW */
                <form onSubmit={(e) => void handleForgotSubmit(e)} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E5A44] hover:text-[#141413] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
                      Reset Password
                    </h1>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Enter your email address and we will send instructions to restore access to your Habing Kalye account.
                    </p>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#8C2D25]"
                    >
                      {formError}
                    </div>
                  )}

                  {formNotice && (
                    <div
                      role="status"
                      className="p-3.5 rounded-lg bg-[#F5F1E8] border border-[#C2A67D] text-xs text-[#141413] flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#6B4C35] shrink-0 mt-0.5" />
                      <span>{formNotice}</span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-semibold text-[#141413] mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@habingkalye.ph"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-5 bg-[#141413] hover:bg-[#2A2825] disabled:bg-stone-400 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {submitting ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </button>
                </form>
              ) : mode === 'register' ? (
                /* CREATE ACCOUNT / REGISTER VIEW */
                <form onSubmit={(e) => void handleRegisterSubmit(e)} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
                      Create Account
                    </h1>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Celebrate Filipino craftsmanship, culture, and creativity. Welcome to Habing Kalye.
                    </p>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#8C2D25]"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="register-name"
                        className="block text-xs font-semibold text-[#141413] mb-1.5"
                      >
                        Full Name
                      </label>
                      <input
                        id="register-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Mateo Reyes"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="register-email"
                        className="block text-xs font-semibold text-[#141413] mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="register-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="register-password"
                        className="block text-xs font-semibold text-[#141413] mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-3.5 pr-11 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-[#141413] cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="register-confirm-password"
                        className="block text-xs font-semibold text-[#141413] mb-1.5"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="register-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className="w-full pl-3.5 pr-11 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={
                            showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-[#141413] cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || googleLoading}
                    className="w-full py-3 px-5 bg-[#141413] hover:bg-[#2A2825] disabled:bg-stone-400 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {submitting ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <p className="text-xs text-center text-stone-600 pt-1">
                    Already part of Habing Kalye?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-semibold text-[#141413] underline underline-offset-4 hover:text-[#8C2D25] cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              ) : (
                /* PRIMARY SIGN IN VIEW */
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
                      Welcome Back
                    </h1>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Celebrate Filipino craftsmanship, culture, and creativity. Welcome to Habing Kalye.
                    </p>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#8C2D25] leading-relaxed"
                    >
                      {formError}
                    </div>
                  )}

                  <form onSubmit={(e) => void handleSignInSubmit(e)} className="space-y-4" noValidate>
                    <div>
                      <label
                        htmlFor="login-email"
                        className="block text-xs font-semibold text-[#141413] mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-semibold text-[#141413] mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-3.5 pr-11 py-2.5 text-sm bg-[#FAF8F4] border border-[#D8CEBC] rounded-lg text-[#141413] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#141413] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-[#141413] cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs pt-0.5">
                      <label className="inline-flex items-center gap-2 text-stone-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-[#C2A67D] accent-[#141413] cursor-pointer"
                        />
                        <span>Remember Me</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="font-semibold text-[#6B4C35] hover:text-[#141413] underline underline-offset-4 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || googleLoading}
                      className="w-full py-3 px-5 bg-[#141413] hover:bg-[#292524] disabled:bg-stone-400 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {submitting ? 'Signing In...' : 'Sign In'}
                    </button>
                  </form>

                  {/* Hairline Divider */}
                  <div className="relative flex items-center py-0.5" aria-hidden="true">
                    <div className="flex-grow border-t border-[#E6DEC8]" />
                    <span className="mx-3 text-[11px] font-medium text-[#7A6852]">or</span>
                    <div className="flex-grow border-t border-[#E6DEC8]" />
                  </div>

                  {/* Secondary Google Sign-In */}
                  <button
                    type="button"
                    disabled={submitting || googleLoading}
                    onClick={() => void handleGoogleSignIn()}
                    className="w-full py-2.5 px-4 bg-[#FAF8F4] hover:bg-[#EFE9DC] border border-[#D8CEBC] hover:border-[#8D6B4A] disabled:opacity-60 text-[#141413] text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#141413"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                      />
                    </svg>
                    <span>
                      {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                    </span>
                  </button>

                  <p className="text-xs text-center text-stone-600 pt-1">
                    New to Habing Kalye?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-semibold text-[#141413] underline underline-offset-4 hover:text-[#8C2D25] cursor-pointer"
                    >
                      Create Account / Register
                    </button>
                  </p>
                </div>
              )}
            </div>

            <div className="pt-8 mt-6 border-t border-[#EFE9DC] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A6852]">
              <span>Ilocano Inabel · Mindanao T&apos;nalak</span>
              <span>Marikina Shoe Guild</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Filipino Textile Heritage Decorative Panel */}
          <div className="lg:col-span-6 relative bg-[#1C1917] text-[#F5F1E8] flex flex-col justify-between min-h-[340px] lg:min-h-[620px] overflow-hidden">
            <ResilientImage
              src={STUDIO_IMAGES.loginCulture}
              alt="Handloom Inabel and T'nalak weaving shuttle craftsmanship in warm natural light"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#141413] via-[#141413]/55 to-[#141413]/30"
              aria-hidden="true"
            />

            {/* Top traditional woven border & quiet provenance header */}
            <div className="relative z-10">
              <WovenTextileBorder idPrefix="top" variant="dark" />
              <div className="px-6 sm:px-8 pt-5 pb-4 flex items-center justify-between gap-4 border-b border-white/15">
                <span className="text-xs font-semibold text-[#E8DFCE] tracking-wide">
                  Pamana ng Pilipinas
                </span>
                <span className="text-xs text-[#C2A67D] font-medium">
                  Ilocos · Marikina · Cotabato
                </span>
              </div>
            </div>

            {/* Center subtle decorative Baybayin-inspired & Binakul geometric crest */}
            <div className="relative z-10 px-6 sm:px-8 py-6 hidden lg:flex items-center justify-start">
              <div className="border border-[#C2A67D]/35 bg-[#141413]/45 backdrop-blur-[2px] rounded-xl p-4 inline-flex items-center gap-4">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path
                    d="M22 3L41 22L22 41L3 22L22 3Z"
                    stroke="#C2A67D"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M22 10L34 22L22 34L10 22L22 10Z"
                    stroke="#F5F1E8"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M22 16.5L27.5 22L22 27.5L16.5 22L22 16.5Z"
                    fill="#8C2D25"
                    stroke="#C2A67D"
                    strokeWidth="1"
                  />
                </svg>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[#F5F1E8]">Handloom Textile Lineage</p>
                  <p className="text-[#D6C7B2]">
                    Pedal-loomed abaca, combed cotton &amp; hand-lasted soles
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Tagline & Cultural Heritage Footer */}
            <div className="relative z-10">
              <div className="px-6 sm:px-8 pb-6 space-y-4">
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-[#C2A67D] tracking-wide">
                    Habing Kalye Heritage Studio
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl lg:text-[2rem] font-bold leading-tight text-white text-balance">
                    Tradition Woven Into Modern Streetwear.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#E8DFCE]/90 leading-relaxed max-w-md">
                    Every silhouette bridges generational Filipino weaving guilds—from Ilocano Binakul and T&apos;boli T&apos;nalak to Bicol Solihiya—into everyday Manila utility.
                  </p>
                </div>

                {/* Earth-toned woven palette bar */}
                <div className="grid grid-cols-5 h-[3px] rounded-full overflow-hidden" aria-hidden="true">
                  <div className="bg-[#141413]" />
                  <div className="bg-[#6B4C35]" />
                  <div className="bg-[#C2A67D]" />
                  <div className="bg-[#8C2D25]" />
                  <div className="bg-[#F5F1E8]" />
                </div>
              </div>
              <WovenTextileBorder idPrefix="bottom" variant="dark" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
