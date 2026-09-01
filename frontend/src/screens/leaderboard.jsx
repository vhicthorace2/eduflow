import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { TrophyIcon } from '@heroicons/react/24/outline';

const avatarFor = (user) => {
  const src = user?.avatar;
  if (src) return <img src={src} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-inset ring-orange-400/30" />;
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20 font-semibold text-accent-soft ring-1 ring-inset ring-orange-400/30">
      {initials || '?'}
    </div>
  );
};

const formatTime = (seconds) => {
  const s = Number(seconds) || 0;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const rankStyle = (rank) => {
  if (rank === 1) return 'bg-amber-400/20 text-amber-300 ring-amber-400/40';
  if (rank === 2) return 'bg-slate-400/20 text-slate-200 ring-slate-400/40';
  if (rank === 3) return 'bg-orange-700/20 text-orange-400 ring-orange-600/40';
  return 'bg-page text-muted ring-line';
};

function LeaderboardView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/leaderboard')
      .then((data) => { if (active) setRows(data.leaderboard || []); })
      .catch((err) => { if (active) setError(err.message || 'Failed to load leaderboard'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const maxComposite = rows.reduce((m, r) => Math.max(m, r.composite || 0), 0);

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <Sidebar />
      <div className="relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 md:ml-72">
        <div className="mx-auto max-w-6xl space-y-6">
          <div><BackButton /></div>

          <header className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20 ring-1 ring-inset ring-orange-400/30">
                <TrophyIcon className="h-7 w-7 text-accent-mid" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Leaderboard</p>
                <h1 className="tracking-display font-display mt-2 text-3xl font-medium">Top Students</h1>
                <p className="mt-2 text-muted">Ranked by engagement (time on content) and academic performance.</p>
              </div>
            </div>
          </header>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>}

          <section className="rounded-3xl border border-line bg-card p-6 backdrop-blur-xl">
            {loading ? (
              <p className="py-10 text-center text-muted">Loading leaderboard...</p>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-muted">No students ranked yet. Data appears as students engage and take assessments.</p>
            ) : (
              <ol className="space-y-4">
                {rows.map((row) => (
                  <li key={row.student.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-page p-4 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-4">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ring-1 ring-inset ${rankStyle(row.rank)}`}>
                        {row.rank}
                      </span>
                      {avatarFor(row.student)}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{row.student.name}</p>
                        <p className="truncate text-xs text-muted">{row.student.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted">Time on content</p>
                        <p className="text-sm font-semibold">{formatTime(row.totalTimeSpent)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">Academics</p>
                        <p className="text-sm font-semibold">{row.academicScore}/100</p>
                      </div>
                      <div className="w-32">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line-strong">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                            style={{ width: `${maxComposite > 0 ? (row.composite / maxComposite) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-accent-mid">Score {row.composite}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardView;
