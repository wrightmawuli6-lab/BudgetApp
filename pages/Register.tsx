import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Mail, Lock, Moon, Sun, User } from 'lucide-react';
import { register } from '../auth';

const THEME_KEY = 'budgeting_theme';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (
    localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  ));
  const isLight = theme === 'light';

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (result.ok) {
      navigate('/app', { replace: true });
    } else {
      setError(result.error ?? 'Something went wrong.');
    }
  };

  return (
    <div className={`min-h-screen px-5 py-8 transition-colors sm:px-6 ${isLight ? 'bg-[#f6f7fb] text-gray-950' : 'bg-[#070708] text-white'}`}>
      <div className={`pointer-events-none fixed inset-x-0 top-0 h-80 ${isLight ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(139,61,255,0.18),transparent_58%)]' : 'bg-[radial-gradient(circle_at_50%_0%,rgba(139,61,255,0.36),transparent_58%)]'}`} />
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed right-5 top-5 z-20 grid h-12 w-12 place-items-center rounded-full border shadow-lg transition ${
          isLight ? 'border-gray-200 bg-white text-gray-800 shadow-gray-200/70 hover:bg-gray-50' : 'border-white/10 bg-white/8 text-white/70 shadow-black/30 hover:bg-white/12 hover:text-white'
        }`}
        title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {isLight ? <Moon size={21} /> : <Sun size={21} />}
      </button>
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center lg:grid lg:grid-cols-[1fr_440px] lg:gap-14">
        <section className="hidden lg:block">
          <p className={`mb-4 text-sm font-black uppercase tracking-[0.25em] ${isLight ? 'text-gray-500' : 'text-white/35'}`}>Start with BudgeApp</p>
          <h1 className="max-w-xl text-6xl font-[900] leading-[0.96] tracking-tight">Build a budget that fits your screen and your month.</h1>
          <p className={`mt-6 max-w-md text-base font-semibold leading-7 ${isLight ? 'text-gray-600' : 'text-white/50'}`}>Create your account, then track spending, savings goals, and strategy history in the redesigned dashboard.</p>
        </section>
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-gradient-to-br from-[#7c2dff] to-[#ca32ff] text-white rounded-[1.5rem] shadow-xl shadow-violet-950/40 mb-6">
            <Wallet size={40} />
          </div>
          <h1 className="text-4xl font-[900] tracking-tight">BudgeApp</h1>
          <p className={`mt-2 text-base font-bold ${isLight ? 'text-gray-500' : 'text-white/45'}`}>Create your account</p>
        </div>

        <div className={`rounded-[2.5rem] border p-7 shadow-[0_28px_70px_rgba(0,0,0,0.22)] sm:p-10 ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#171719]'}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-400/20 text-rose-200 text-sm font-bold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-white/35 uppercase tracking-[0.2em] mb-2 px-1">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/25 py-4 pl-12 pr-5 font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/35 uppercase tracking-[0.2em] mb-2 px-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/25 py-4 pl-12 pr-5 font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/35 uppercase tracking-[0.2em] mb-2 px-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 py-4 pl-12 pr-5 font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/35 uppercase tracking-[0.2em] mb-2 px-1">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/25 py-4 pl-12 pr-5 font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="min-h-14 w-full rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] px-5 py-4 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all hover:brightness-110 disabled:opacity-60 active:scale-[0.98]"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-white/45 font-bold text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-300 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
