import { useEffect, useState } from 'react';
import { ThemeContext, useTheme } from './themeContext.js';

const THEME_KEY = 'eduflow_theme';

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle({ light }) {
  const { theme, toggleTheme } = useTheme();

  const base = theme === 'light'
    ? `rounded-full border border-slate-300 bg-slate-900 p-2.5 text-white shadow-lg transition hover:bg-slate-800${light ? ' backdrop-blur-md' : ''}`
    : light
      ? 'rounded-full border border-white/15 bg-white/10 p-2.5 text-white backdrop-blur-md transition hover:bg-white/20'
      : 'rounded-full border border-line-strong bg-card-strong p-2.5 text-secondary transition hover:bg-card-hover';

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={base}
    >
      {theme === 'light' ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
