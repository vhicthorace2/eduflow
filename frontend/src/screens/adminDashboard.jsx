import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { userStore } from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import WelcomeHeading from '../component/welcomeHeading.jsx';
import adminHeroImg from '../assets/admin-hero.jpg';

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = userStore.get();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/reports/admin/dashboard')
      .then((data) => {
        if (active) setDashboard(data.dashboard);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const summary = dashboard?.summary || {};
  const distribution = dashboard?.userDistribution || {};
  const totalDist = (distribution.students || 0) + (distribution.instructors || 0) + (distribution.admins || 0);
  const studentPct = totalDist > 0 ? Math.round(((distribution.students || 0) / totalDist) * 100) : 0;
  const instructorPct = totalDist > 0 ? Math.round(((distribution.instructors || 0) / totalDist) * 100) : 0;
  const adminPct = totalDist > 0 ? 100 - studentPct - instructorPct : 0;

  const stats = [
    { title: 'Total Users', value: summary.totalUsers ?? 0, icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { title: 'Courses', value: summary.totalCourses ?? 0, icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
    { title: 'Students', value: summary.totalStudents ?? 0, icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { title: 'Instructors', value: summary.totalInstructors ?? 0, icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5' },
  ];

  const actions = [
    { title: 'Manage Users', desc: 'Add, edit, and remove student and instructor accounts.', to: '/adminUsers' },
    { title: 'Manage Courses', desc: 'Create courses, assign instructors, and control availability.', to: '/adminCourses' },
    { title: 'View Reports', desc: 'Platform analytics and activity reports.', to: '/adminDashboard' },
  ];

  return (
    <div className='relative min-h-screen bg-page text-content'>
      <div className='pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]' />
      <Sidebar />
      <div className='relative p-6 pt-20 lg:p-8 md:pt-6 md:ml-72'>
        <div className='mx-auto max-w-7xl space-y-6'>
          <div className='flex justify-start'>
            <BackButton />
          </div>
          {/* Header */}
          <header className='shadow-panel relative overflow-hidden rounded-2xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:justify-between'>
            <img
              src={adminHeroImg}
              alt=""
              aria-hidden="true"
              className='absolute inset-0 h-full w-full object-cover opacity-20'
              loading='lazy'
            />
            <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40' aria-hidden='true' />
            <div className='relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm font-medium text-accent-mid'>Admin Dashboard</p>
                <h1 className='tracking-display font-display mt-2 text-2xl font-medium'>
                  <WelcomeHeading name={user?.name || 'Admin'} />
                </h1>
                <p className='mt-1 text-sm text-muted'>
                  Manage students, courses, and platform activity in one place.
                </p>
              </div>
              <button
                onClick={() => navigate('/adminCourses')}
                className='w-fit rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--page)] shadow-xl transition hover:-translate-y-0.5 hover:opacity-90'
              >
                Manage courses
              </button>
            </div>
          </header>

          {error && (
            <p className='rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger'>
              {error}
            </p>
          )}

          {loading && <p className='text-muted'>Loading dashboard...</p>}

          {!loading && !error && dashboard && (
            <>
              {/* Stats row */}
              <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                {stats.map((stat) => (
                  <div
                    key={stat.title}
                    className='rounded-2xl border border-line bg-card p-6 shadow-sm backdrop-blur-xl transition hover:bg-card-hover'
                  >
                    <div className='flex items-center justify-between'>
                      <h3 className='text-sm font-medium text-muted'>{stat.title}</h3>
                      <svg className='h-5 w-5 text-accent' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'>
                        <path d={stat.icon} />
                      </svg>
                    </div>
                    <p className='font-display mt-3 text-3xl font-semibold'>{stat.value}</p>
                  </div>
                ))}
              </section>

              <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
                {/* User distribution */}
                <section className='rounded-2xl border border-line bg-card p-6 shadow-sm backdrop-blur-xl'>
                  <h2 className='text-lg font-semibold'>User Distribution</h2>
                  <div className='mt-6 space-y-5'>
                    {[
                      { label: 'Students', value: distribution.students || 0, pct: studentPct, bar: 'bg-orange-400' },
                      { label: 'Instructors', value: distribution.instructors || 0, pct: instructorPct, bar: 'bg-teal-400' },
                      { label: 'Admins', value: distribution.admins || 0, pct: adminPct, bar: 'bg-slate-300' },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className='flex items-center justify-between text-sm'>
                          <span className='font-medium text-secondary'>{row.label}</span>
                          <span className='text-muted'>{row.value} · {row.pct}%</span>
                        </div>
                        <div className='mt-2 h-2 overflow-hidden rounded-full bg-line-strong'>
                          <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className='mt-6 flex flex-wrap gap-4 border-t border-line pt-5'>
                    <span className='rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm font-medium text-accent-soft'>
                      Students: {distribution.students || 0}
                    </span>
                    <span className='rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-medium text-info'>
                      Instructors: {distribution.instructors || 0}
                    </span>
                    <span className='rounded-full border border-slate-400/30 bg-slate-400/10 px-4 py-2 text-sm font-medium text-secondary'>
                      Admins: {distribution.admins || 0}
                    </span>
                  </div>
                </section>

                {/* Platform snapshot */}
                <section className='rounded-2xl border border-line bg-card p-6 shadow-sm backdrop-blur-xl'>
                  <h2 className='text-lg font-semibold'>Platform Snapshot</h2>
                  <div className='mt-6 space-y-4'>
                    <div className='flex items-center justify-between rounded-xl border border-line bg-card-deep px-5 py-4'>
                      <span className='text-sm text-secondary'>Total Accounts</span>
                      <span className='font-display text-2xl font-semibold'>{summary.totalUsers ?? 0}</span>
                    </div>
                    <div className='flex items-center justify-between rounded-xl border border-line bg-card-deep px-5 py-4'>
                      <span className='text-sm text-secondary'>Active Courses</span>
                      <span className='font-display text-2xl font-semibold'>{summary.totalCourses ?? 0}</span>
                    </div>
                    <div className='flex items-center justify-between rounded-xl border border-line bg-card-deep px-5 py-4'>
                      <span className='text-sm text-secondary'>Student / Instructor Ratio</span>
                      <span className='font-display text-2xl font-semibold'>
                        {summary.totalInstructors > 0
                          ? ((summary.totalStudents || 0) / summary.totalInstructors).toFixed(1)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Admin actions */}
              <section className='grid gap-4 md:grid-cols-3'>
                {actions.map((action) => (
                  <button
                    key={action.title}
                    onClick={() => navigate(action.to)}
                    className='group rounded-2xl border border-line bg-card p-6 text-left backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-400/30 hover:bg-card-hover'
                  >
                    <h3 className='font-semibold text-content'>{action.title}</h3>
                    <p className='mt-2 text-sm leading-6 text-muted'>{action.desc}</p>
                    <p className='mt-4 text-sm font-semibold text-accent transition group-hover:translate-x-1'>Open →</p>
                  </button>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
