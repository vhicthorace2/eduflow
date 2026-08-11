import ThemeToggle from './theme.jsx';

const links = [
  { name: 'Dashboard', href: '#', active: true, icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' },
  { name: 'Courses', href: 'courses', active: false, icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { name: 'Assignments', href: 'assignments', active: false, icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { name: 'Calendar', href: 'calendar', active: false, icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
  { name: 'Messages', href: 'messages', active: false, icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
  { name: 'Settings', href: '/settings', active: false, icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z' },
]
;

function Sidebar() {
  return (
    <aside className='fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-page-solid text-content shadow-xl backdrop-blur-xl'>
      <div className='border-b border-line px-6 py-6'>
        <h2 className='font-display text-xl font-semibold tracking-tight'>EduFlow</h2>
        <p className='mt-2 text-sm text-muted'>Student Learning Portal</p>
      </div>

      <nav className='mt-6 flex-1 px-4'>
        <ul className='space-y-2'>
          {links.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                  link.active
                    ? 'bg-emerald-500/15 text-accent shadow-md ring-1 ring-inset ring-emerald-400/30'
                    : 'text-muted hover:bg-card-hover hover:text-content'
                }`}
              >
                <svg className='mr-3 h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'>
                  <path d={link.icon} />
                </svg>
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className='border-t border-line p-4'>
        <div className='flex items-center rounded-xl border border-line bg-card p-3 backdrop-blur-md'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 font-semibold text-accent-soft ring-1 ring-inset ring-emerald-400/30'>
            V
          </div>
          <div className='ml-3 flex-1'>
            <p className='text-sm font-semibold'>Victor</p>
            <p className='text-xs text-muted'>Student</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
