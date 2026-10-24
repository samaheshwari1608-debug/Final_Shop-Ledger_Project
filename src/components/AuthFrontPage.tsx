import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  MapPin,
  MessageSquareQuote,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { ShopkeeperProfile } from '../types';

const API_BASE_URL = '';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  let payload: any = null;
  if (rawText) {
    try {
      payload = contentType.includes('application/json')
        ? JSON.parse(rawText)
        : { error: `The server returned an unexpected response (${response.status}).` };
    } catch {
      payload = { error: 'The server returned an invalid JSON response.' };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}.`);
  }

  return payload as T;
}

interface AuthFrontPageProps {
  onLogin: (profile: ShopkeeperProfile, auth?: { token: string; shopId: string }) => void;
  mode?: 'login' | 'signup';
  onModeChange?: (mode: 'login' | 'signup') => void;
}

type AuthMode = 'login' | 'signup';

export const AuthFrontPage: React.FC<AuthFrontPageProps> = ({ onLogin, mode: controlledMode, onModeChange }) => {
  const [internalMode, setInternalMode] = useState<AuthMode>('login');
  const mode = controlledMode ?? internalMode;
  const setMode = (next: AuthMode) => {
    if (onModeChange) {
      onModeChange(next);
      return;
    }
    setInternalMode(next);
  };
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successHint, setSuccessHint] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    phone: '',
    location: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  const passwordChecks = useMemo(() => {
    const value = formData.password;
    return [
      { label: '8+ characters', valid: value.length >= 8 },
      { label: 'Uppercase letter', valid: /[A-Z]/.test(value) },
      { label: 'Number', valid: /\d/.test(value) },
      { label: 'Special character', valid: /[^A-Za-z0-9]/.test(value) },
    ];
  }, [formData.password]);

  const validate = () => {
    const errors: Record<string, string> = {};
    const normalizedEmail = formData.email.trim();

    if (!normalizedEmail) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (mode === 'signup') {
      if (!formData.name.trim()) {
        errors.name = 'Full name is required.';
      } else if (formData.name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters.';
      }

      if (!formData.shopName.trim()) {
        errors.shopName = 'Business name is required.';
      }

      if (!formData.phone.trim()) {
        errors.phone = 'Phone number is required.';
      }

      if (!formData.location.trim()) {
        errors.location = 'Business location is required.';
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password.';
      } else if (formData.confirmPassword !== formData.password) {
        errors.confirmPassword = 'Passwords do not match.';
      }

      if (!formData.agreeToTerms) {
        errors.agreeToTerms = 'Please accept the terms to continue.';
      }
    }

    return errors;
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccessHint('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      setFormError(firstError);
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'signup'
        ? {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            shopName: formData.shopName,
            phone: formData.phone,
            location: formData.location,
          }
        : { email: formData.email, password: formData.password };

      const data = await apiRequest<{ success: boolean; token?: string; shopId?: string; user?: any; error?: string; shop?: any }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!data?.success) {
        throw new Error(data?.error || 'Authentication failed.');
      }

      const token = data.token || '';
      const shopId = data.shopId || '';
      if (!token || !shopId) {
        throw new Error('Authentication succeeded but the session details were missing.');
      }

      const nextProfile: ShopkeeperProfile = {
        name: data.user?.name || formData.name.trim() || 'Shopkeeper',
        shopName: data.shop?.name || formData.shopName.trim() || 'My Shop',
        phone: formData.phone.trim() || '9876543210',
        location: formData.location.trim() || 'Gurugram, Haryana',
      };

      const auth = { token, shopId };
      if (rememberMe) {
        localStorage.setItem('shopledger-token', token);
        localStorage.setItem('shopledger-shop-id', shopId);
      }

      setSuccessHint(mode === 'signup' ? 'Account created successfully. Redirecting…' : 'Welcome back. Redirecting…');
      onLogin(nextProfile, auth);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError('');
    setSuccessHint('');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col font-sans antialiased">
      <header className="border-b border-[#E2E8F0] bg-white/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#059669] flex items-center justify-center text-white shadow-md shadow-[#059669]/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-black tracking-tight text-[#0F172A]">VyapaarIQ</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-[#047857] px-2 py-1">
                Smart Business. Smarter Decisions.
              </span>
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <section className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-gradient-to-br from-emerald-50 via-white to-[#F8FAFC] p-6 sm:p-8 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.38)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_40%)]" />
              <div className="relative space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#047857]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Powered by ShopLedger
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl xl:text-[4rem] font-black tracking-[-0.06em] text-[#0F172A] leading-[1.02] max-w-xl">
                    Your Business, One Step Ahead.
                  </h1>
                  <p className="max-w-xl text-base text-slate-600 leading-7">
                    Manage your shop, understand your profits, and make smarter decisions — all in one place.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 pt-2">
                  {[
                    { icon: ShoppingBag, title: 'Smart Billing & Inventory', text: 'Fast billing, stock tracking, and repeat sales visibility.' },
                    { icon: TrendingUp, title: 'Real-Time Insights', text: 'Profit trends, repeat customers, and margin intelligence.' },
                    { icon: MessageSquareQuote, title: 'AI Recommendations', text: 'Actionable next steps for pricing and inventory planning.' },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Today</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">Business Snapshot</h3>
                    </div>
                    <div className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-bold">+18.4%</div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Sales</p>
                      <p className="mt-2 text-xl font-black text-slate-900">₹84.2K</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Profit</p>
                      <p className="mt-2 text-xl font-black text-slate-900">₹21.7K</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Stock</p>
                      <p className="mt-2 text-xl font-black text-slate-900">94%</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end gap-2 h-24">
                    {[36, 52, 42, 66, 58, 74, 90].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-emerald-500 to-emerald-300" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5 w-full">
            <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.42)]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {mode === 'login' ? 'Welcome Back' : "Let's Build Your Business"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {mode === 'login'
                      ? 'Your business is ready when you are.'
                      : 'Create your account and take control of your shop.'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
                {['login', 'signup'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value as AuthMode);
                      setFormError('');
                      setSuccessHint('');
                    }}
                    className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                      mode === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {value === 'login' ? 'Login' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <form onSubmit={submitForm} className="mt-6 space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Full name
                      </label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(event) => updateField('name', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Shop / business name
                      </label>
                      <input
                        type="text"
                        value={formData.shopName}
                        onChange={(event) => updateField('shopName', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        placeholder="Your shop name"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                    placeholder="shopowner@example.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                      placeholder="Enter your password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {mode === 'signup' && (
                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-700">Password must include:</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {passwordChecks.map((item) => (
                          <div key={item.label} className="flex items-center gap-2 text-[11px] text-slate-600">
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${item.valid ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                              <Check className="h-2.5 w-2.5" />
                            </span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(event) => updateField('confirmPassword', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Mobile number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-sm text-slate-400">+91</span>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        placeholder="9876543210"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Shop location
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(event) => updateField('location', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        placeholder="Shop #12, Main Market, Sector 14, Gurugram"
                      />
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe((prev) => !prev)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Remember me
                    </label>
                    <button type="button" className="font-semibold text-emerald-700 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                {mode === 'signup' && (
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={() => updateField('agreeToTerms', !formData.agreeToTerms)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      I agree to the <span className="font-semibold text-slate-700">Terms of Service</span> and <span className="font-semibold text-slate-700">Privacy Policy</span>.
                    </span>
                  </label>
                )}

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                {successHint && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successHint}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      {mode === 'login' ? 'Sign In' : 'Create My Account'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Your business data stays protected.
                </div>

                <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
                  {mode === 'login' ? 'New to VyapaarIQ?' : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login');
                      setFormError('');
                      setSuccessHint('');
                    }}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    {mode === 'login' ? 'Create an account' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
