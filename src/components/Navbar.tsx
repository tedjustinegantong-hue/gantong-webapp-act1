import React, { useState } from 'react';
import { LogOut, Menu, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import type { ProductCategory } from '../types/store';
import { useStore } from '../context/StoreContext';

export type AppView = 'home' | 'shop' | 'craft' | 'orders' | 'admin' | 'login';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView, category?: 'All' | ProductCategory) => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onOpenCart,
}) => {
  const { user, isAdmin, cartCount, signOutUser } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: AppView, category?: 'All' | ProductCategory) => {
    setMobileMenuOpen(false);
    onNavigate(view, category);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E9E0D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl font-bold tracking-tight text-[#171717] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717]"
        >
          HABI
        </button>

        {/* Zone 2: Clean single-line page navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#171717] py-1 border-b-2 ${
              activeView === 'home'
                ? 'text-[#171717] border-[#171717]'
                : 'border-transparent'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav('shop', 'All')}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#171717] py-1 border-b-2 ${
              activeView === 'shop'
                ? 'text-[#171717] border-[#171717]'
                : 'border-transparent'
            }`}
          >
            Shop
          </button>
          <button
            type="button"
            onClick={() => handleNav('craft')}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#171717] py-1 border-b-2 ${
              activeView === 'craft'
                ? 'text-[#171717] border-[#171717]'
                : 'border-transparent'
            }`}
          >
            Craft
          </button>
          <button
            type="button"
            onClick={() => handleNav('orders')}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#171717] py-1 border-b-2 ${
              activeView === 'orders'
                ? 'text-[#171717] border-[#171717]'
                : 'border-transparent'
            }`}
          >
            Orders
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNav('admin')}
              className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#171717] py-1 border-b-2 ${
                activeView === 'admin'
                  ? 'text-[#171717] border-[#171717]'
                  : 'text-neutral-700 border-transparent'
              }`}
            >
              Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Primary bag & account action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav('login')}
                className="text-xs font-medium text-neutral-700 hover:text-[#171717] max-w-[140px] truncate px-2 py-1.5 rounded-lg hover:bg-[#E9E0D2]/50 transition-colors cursor-pointer"
                title="View HABI Account"
              >
                {user.displayName || user.email}
              </button>
              <button
                type="button"
                onClick={() => void signOutUser()}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 text-neutral-500 hover:text-[#171717] rounded-lg hover:bg-[#E9E0D2]/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('login')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'login'
                  ? 'bg-[#E9E0D2]/70 text-[#171717]'
                  : 'text-neutral-700 hover:text-[#171717] hover:bg-[#E9E0D2]/50'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-xs font-medium rounded-lg hover:bg-[#596653] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag</span>
            <span className="tabular-nums font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/15">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-neutral-700 hover:text-[#171717] rounded-lg hover:bg-[#E9E0D2]/50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-neutral-100 cursor-pointer ${
              activeView === 'home' ? 'text-[#141413] bg-neutral-100' : 'text-neutral-700'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav('shop', 'All')}
            className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-neutral-100 cursor-pointer ${
              activeView === 'shop' ? 'text-[#141413] bg-neutral-100' : 'text-neutral-700'
            }`}
          >
            Shop
          </button>
          <button
            type="button"
            onClick={() => handleNav('craft')}
            className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-neutral-100 cursor-pointer ${
              activeView === 'craft' ? 'text-[#141413] bg-neutral-100' : 'text-neutral-700'
            }`}
          >
            Craft
          </button>
          <button
            type="button"
            onClick={() => handleNav('orders')}
            className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-neutral-100 cursor-pointer ${
              activeView === 'orders' ? 'text-[#141413] bg-neutral-100' : 'text-neutral-700'
            }`}
          >
            Orders
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNav('admin')}
              className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-[#141413] rounded-lg hover:bg-neutral-100 cursor-pointer"
            >
              Admin Dashboard
            </button>
          )}
          <div className="pt-2 border-t border-neutral-200">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleNav('login')}
                  className="text-xs font-medium text-neutral-700 hover:text-[#141413] truncate cursor-pointer"
                >
                  {user.email}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signOutUser();
                  }}
                  className="text-xs font-medium text-[#141413] underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('login')}
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-[#141413] rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                Sign In · Habing Kalye
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
