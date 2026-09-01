import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './theme.jsx';
import { userStore } from '../api/client.js';

const ICONS = {
  dashboard: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  courses: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  content: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z',
  profile: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  messages: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  leaderboard: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
};

const ROLE_LINKS = {
  admin: [
    { name: 'Dashboard', to: '/adminDashboard', icon: ICONS.dashboard },
    { name: 'Manage Users', to: '/adminUsers', icon: ICONS.users },
    { name: 'Manage Courses', to: '/adminCourses', icon: ICONS.courses },
    { name: 'Messages', to: '/messages', icon: ICONS.messages },
    { name: 'Leaderboard', to: '/leaderboard', icon: ICONS.leaderboard },
    { name: 'Settings', to: '/settings', icon: ICONS.settings },
  ],
  instructor: [
    { name: 'Dashboard', to: '/instructorDashboard', icon: ICONS.dashboard },
    { name: 'My Courses', to: '/courses', icon: ICONS.courses },
    { name: 'Course Content', to: '/instructorContent', icon: ICONS.content },
    { name: 'Consistency', to: '/instructorConsistency', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
    { name: 'Messages', to: '/messages', icon: ICONS.messages },
    { name: 'Leaderboard', to: '/leaderboard', icon: ICONS.leaderboard },
    { name: 'Profile', to: '/profile', icon: ICONS.profile },
    { name: 'Settings', to: '/settings', icon: ICONS.settings },
  ],
  student: [
    { name: 'Dashboard', to: '/studentDashboard', icon: ICONS.dashboard },
    { name: 'Courses', to: '/courses', icon: ICONS.courses },
    { name: 'Messages', to: '/messages', icon: ICONS.messages },
    { name: 'Leaderboard', to: '/leaderboard', icon: ICONS.leaderboard },
    { name: 'Profile', to: '/profile', icon: ICONS.profile },
    { name: 'Settings', to: '/settings', icon: ICONS.settings },
  ],
};

const PORTAL_NAME = {
  admin: 'Admin Console',
  instructor: 'Instructor Portal',
  student: 'Student Learning Portal',
};

function Sidebar() {
  const user = userStore.get();
  const rawRole = user?.role || 'student';
  const role = rawRole === 'lecturer' ? 'instructor' : rawRole;
  const links = ROLE_LINKS[role] || ROLE_LINKS.student;
  const initials = (user?.name || 'Learner').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        className={`fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-page-solid text-content shadow-md transition hover:bg-card-hover md:hidden ${open ? 'pointer-events-none opacity-0' : ''}`}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {open && (
        <div aria-hidden="true" onClick={close} className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-line bg-page-solid text-content shadow-xl backdrop-blur-xl transition-transform duration-200 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className='flex items-center justify-between border-b border-line px-6 py-6'>
          <div>
            <h2 className='font-display text-xl font-semibold tracking-tight'>EduFlow</h2>
            <p className='mt-2 text-sm text-muted'>{PORTAL_NAME[role] || PORTAL_NAME.student}</p>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-card-hover hover:text-content md:hidden"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className='mt-6 flex-1 px-4'>
          <ul className='space-y-2'>
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-orange-500/15 text-accent shadow-md ring-1 ring-inset ring-orange-400/30'
                        : 'text-muted hover:bg-card-hover hover:text-content'
                    }`
                  }
                >
                  <svg className='mr-3 h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'>
                    <path d={link.icon} />
                  </svg>
                  {link.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className='border-t border-line p-4'>
          <div className='flex items-center rounded-xl border border-line bg-card p-3 backdrop-blur-md'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 font-semibold text-accent-soft ring-1 ring-inset ring-orange-400/30'>
              {initials || '?'}
            </div>
            <div className='ml-3 flex-1 min-w-0'>
              <p className='truncate text-sm font-semibold'>{user?.name || 'Learner'}</p>
              <p className='text-xs text-muted capitalize'>{user?.role || 'student'}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;