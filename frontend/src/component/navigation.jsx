import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { tokenStore, userStore } from '../api/client.js';
import ThemeToggle from './theme.jsx';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/profile', label: 'Profile' },
];

function Navbar({ landing }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = () => {
    tokenStore.clear();
    userStore.clear();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-card-strong text-content shadow-sm backdrop-blur-md'
        : 'text-muted hover:bg-card-hover hover:text-content'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `block rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive ? 'bg-card-strong text-content' : 'text-muted hover:bg-card-hover hover:text-content'
    }`;

  return (
    <header className='fixed inset-x-0 top-0 z-50 border-b border-line bg-page-soft backdrop-blur-xl'>
      <nav
        className='mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8'
        aria-label='Primary'
      >
        <NavLink to='/' end className='font-display text-2xl font-semibold tracking-tight text-content'>
          EduFlow
        </NavLink>

        <div className='hidden items-center gap-2 md:flex'>
          {!landing && navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
              {item.label}
            </NavLink>
          ))}

          <ThemeToggle light />

          {landing ? (
            <>
              <NavLink
                to='/login'
                className='rounded-full border border-line-strong bg-card-strong px-4 py-2 text-sm font-medium text-content backdrop-blur-md transition hover:bg-card-hover'
              >
                Sign in
              </NavLink>
              <NavLink
                to='/signup'
                className='rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-emerald-100'
              >
                Get Started
              </NavLink>
            </>
          ) : tokenStore.get() ? (
            <button
              onClick={handleSignOut}
              className='rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-secondary transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-danger'
            >
              Sign out
            </button>
          ) : (
            <NavLink
              to='/login'
              className='rounded-full border border-line-strong bg-card-strong px-4 py-2 text-sm font-medium text-content backdrop-blur-md transition hover:bg-card-hover'
            >
              Sign in
            </NavLink>
          )}

          {!landing && !tokenStore.get() && (
            <NavLink
              to='/signup'
              className='rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-emerald-100'
            >
              Get Started
            </NavLink>
          )}
        </div>

        <div className='flex items-center gap-2 md:hidden'>
          <ThemeToggle light />
          <button
            onClick={() => setIsOpen((open) => !open)}
            aria-label='Toggle menu'
            aria-expanded={isOpen}
            className='rounded-xl border border-line-strong bg-card-strong p-2 text-content backdrop-blur-md transition hover:bg-card-hover'
          >
            <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              {isOpen ? (
                <path d='M6 6l12 12M18 6L6 18' />
              ) : (
                <path d='M4 7h16M4 12h16M4 17h16' />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className='border-t border-line px-4 py-4 md:hidden'>
          <div className='flex flex-col gap-1'>
            {!landing && navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={mobileLinkClass}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            {landing ? (
              <>
                <NavLink
                  to='/login'
                  onClick={() => setIsOpen(false)}
                  className='mt-1 rounded-xl border border-line-strong px-4 py-3 text-center text-sm font-medium text-secondary transition hover:bg-card-hover'
                >
                  Sign in
                </NavLink>
                <NavLink
                  to='/signup'
                  onClick={() => setIsOpen(false)}
                  className='mt-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-emerald-100'
                >
                  Get Started
                </NavLink>
              </>
            ) : tokenStore.get() ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleSignOut();
                }}
                className='mt-1 rounded-xl border border-line-strong px-4 py-3 text-sm font-medium text-secondary transition hover:bg-red-500/10 hover:text-danger'
              >
                Sign out
              </button>
            ) : (
              <NavLink
                to={!tokenStore.get() ? '/signup' : '/login'}
                onClick={() => setIsOpen(false)}
                className='mt-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-emerald-100'
              >
                Get Started
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
