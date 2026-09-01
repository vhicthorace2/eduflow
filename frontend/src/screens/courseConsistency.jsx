import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { courseCover } from '../component/courseCovers.js';
import analyticsImg from '../assets/analytics.jpg';

function ActivitySpark({ recent14 }) {
  const days = recent14 || [];
  if (days.length === 0) {
    return <p className="text-xs text-muted">No activity recorded yet.</p>;
  }
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1">
      {days.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-1" title={`${day.date} — ${day.count} activities`}>
          <div
            className={`w-2.5 rounded-sm ${day.count > 0 ? 'bg-orange-400' : 'bg-line-strong'}`}
            style={{ height: day.count > 0 ? `${Math.max(4, Math.round((day.count / max) * 28))}px` : '4px' }}
          />
        </div>
      ))}
    </div>
  );
}

function ScorePill({ score }) {
  const tone = score >= 60 ? 'border-orange-400/40 bg-orange-400/10 text-accent' : score >= 30 ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-red-400/40 bg-red-400/10 text-danger';
  return <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{score}/100</span>;
}

function ConsistencyView() {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/courses/instructor-courses')
      .then((data) => {
        if (active) setCourses(data.courses || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load courses');
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;
    api.get(`/reports/courses/${selectedId}/consistency`)
      .then((data) => {
        if (active) setReport(data.report);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load consistency report');
      })
      .finally(() => {
        if (active) setLoadingReport(false);
      });
    return () => { active = false; };
  }, [selectedId]);

  const summary = report?.summary || {};
  const students = report?.students || [];

  const stats = [
    { title: 'Students', value: summary.totalStudents ?? 0 },
    { title: 'Active (ever)', value: summary.activeStudents ?? 0 },
    { title: 'Active (7 days)', value: summary.engagedStudents ?? 0 },
    { title: 'Avg consistency', value: summary.averageScore ?? 0 },
  ];

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <Sidebar />
      <div className="relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 md:ml-72">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <BackButton />
          </div>

          <header className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
            <img
              src={analyticsImg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" aria-hidden="true" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Instructor</p>
              <h1 className="tracking-display font-display mt-3 text-3xl font-medium">Learning Consistency</h1>
              <p className="mt-3 text-muted">See how regularly each student studies your course — streaks, active days, and recent activity.</p>
            </div>
          </header>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>}

          <section className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
            <h2 className="text-lg font-semibold">Select a course</h2>
            {loadingCourses ? (
              <p className="mt-4 text-sm text-muted">Loading courses...</p>
            ) : courses.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedId(String(course.id));
                      setLoadingReport(true);
                      setError('');
                      setReport(null);
                    }}
                    className={`rounded-2xl border p-5 text-left transition ${
                      selectedId === String(course.id)
                        ? 'border-orange-400/60 bg-orange-400/10 ring-1 ring-inset ring-orange-400/30'
                        : 'border-line bg-card-deep hover:border-orange-400/30 hover:bg-card-hover'
                    }`}
                  >
                    <img
                      src={courseCover(course.title)}
                      alt={`${course.title} cover`}
                      className="aspect-[16/9] w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                    <p className="mt-4 text-sm font-semibold text-secondary">{course.title}</p>
                    <p className="mt-1 text-xs text-muted">{course.category} · {course.difficulty}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">You have not been assigned any courses yet.</p>
            )}
          </section>

          {selectedId && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.title} className="rounded-2xl border border-line bg-card p-6 backdrop-blur-xl">
                    <h3 className="text-sm font-medium text-muted">{stat.title}</h3>
                    <p className="font-display mt-3 text-3xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Students</h2>
                {loadingReport ? (
                  <p className="mt-4 text-sm text-muted">Loading consistency data...</p>
                ) : students.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {students.map((entry) => (
                      <div key={entry.student.id} className="rounded-2xl border border-line bg-card-deep p-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-secondary">{entry.student.name}</p>
                            <p className="mt-0.5 text-xs text-muted">{entry.student.email}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-medium text-muted">
                              Streak <span className="font-semibold text-content">{entry.currentStreak} day{entry.currentStreak === 1 ? '' : 's'}</span>
                            </span>
                            <span className="text-xs font-medium text-muted">
                              Active <span className="font-semibold text-content">{entry.daysActive}</span>
                            </span>
                            <span className="text-xs font-medium text-muted">
                              Modules <span className="font-semibold text-content">{entry.modulesViewed}/{entry.modulesTotal}</span>
                            </span>
                            <ScorePill score={entry.score} />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-6">
                          <div className="min-w-0 flex-1">
                            <ActivitySpark recent14={entry.recent14} />
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-medium text-muted">Last 14 days</p>
                            <p className="mt-1 text-xs text-muted">
                              {entry.lastActive ? `Last active ${entry.lastActive}` : 'No activity yet'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">No students enrolled in this course yet.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConsistencyView;