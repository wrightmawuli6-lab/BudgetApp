import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Moon, Sun, Wallet } from 'lucide-react';
import { login } from '../auth';

const THEME_KEY = 'budgeting_theme';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setLoading(true);
    const result = await login(email, password);
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
          isLight
            ? 'border-gray-200 bg-white text-gray-800 shadow-gray-200/70 hover:bg-gray-50'
            : 'border-white/10 bg-white/8 text-white/70 shadow-black/30 hover:bg-white/12 hover:text-white'
        }`}
        title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {isLight ? <Moon size={21} /> : <Sun size={21} />}
      </button>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center lg:grid lg:grid-cols-[1fr_480px] lg:gap-16">
        <section className="hidden lg:block">
          <p className={`mb-4 text-sm font-black uppercase tracking-[0.25em] ${isLight ? 'text-gray-500' : 'text-white/35'}`}>BudgeApp</p>
          <h1 className="max-w-xl text-6xl font-[900] leading-[0.96] tracking-tight">
            Manage your money with a cleaner view.
          </h1>
          <p className={`mt-6 max-w-md text-base font-semibold leading-7 ${isLight ? 'text-gray-600' : 'text-white/50'}`}>
            Track income, spending, goals, strategy history, and AI insights from one responsive dashboard.
          </p>
        </section>

        <div className="w-full max-w-lg">
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex rounded-[1.5rem] bg-gradient-to-br from-[#7c2dff] to-[#ca32ff] p-4 text-white shadow-xl shadow-violet-950/40">
              <Wallet size={40} />
            </div>
            <h1 className="text-4xl font-[900] tracking-tight">BudgeApp</h1>
            <p className={`mt-2 text-base font-bold ${isLight ? 'text-gray-500' : 'text-white/45'}`}>
              Sign in to your account
            </p>
          </div>

          <div className={`rounded-[2.5rem] border p-7 shadow-[0_28px_70px_rgba(0,0,0,0.22)] sm:p-10 ${
            isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#171719]'
          }`}>
            <form onSubmit={handleSubmit} className="space-y-7">
              {error && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/15 p-4 text-sm font-bold text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className={`mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-gray-500' : 'text-white/35'}`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-5 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-400' : 'text-white/35'}`} size={22} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className={`min-h-16 w-full rounded-2xl border py-5 pl-14 pr-5 text-lg font-bold outline-none transition placeholder:text-gray-400 focus:border-violet-400 ${
                      isLight ? 'border-gray-200 bg-gray-50 text-gray-950' : 'border-white/10 bg-black/25 text-white placeholder:text-white/25'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className={`mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-gray-500' : 'text-white/35'}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-400' : 'text-white/35'}`} size={22} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className={`min-h-16 w-full rounded-2xl border py-5 pl-14 pr-5 text-lg font-bold outline-none transition placeholder:text-gray-400 focus:border-violet-400 ${
                      isLight ? 'border-gray-200 bg-gray-50 text-gray-950' : 'border-white/10 bg-black/25 text-white placeholder:text-white/25'
                    }`}
                    placeholder="Password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-16 w-full rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] px-5 py-5 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all hover:brightness-110 disabled:opacity-60 active:scale-[0.98]"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className={`mt-7 text-center text-sm font-bold ${isLight ? 'text-gray-500' : 'text-white/45'}`}>
              Don't have an account?{' '}
              <Link to="/register" className="text-violet-500 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
