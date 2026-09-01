import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { courseCover } from '../component/courseCovers.js';
import lectureImg from '../assets/lecture.jpg';

function InstructorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/reports/instructor/dashboard')
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
  const courses = dashboard?.courses || [];
  const submissions = dashboard?.recentActivity?.submissions || [];
  const quizAttempts = dashboard?.recentActivity?.quizAttempts || [];

  const stats = [
    { title: 'Courses', value: summary.totalCourses ?? 0, icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
    { title: 'Assignments', value: summary.totalAssignments ?? 0, icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
    { title: 'Quizzes', value: summary.totalQuizzes ?? 0, icon: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { title: 'Students', value: summary.totalStudents ?? 0, icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
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

          {/* Header */}
          <div className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
            <img
              src={lectureImg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" aria-hidden="true" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Instructor Dashboard</p>
              <h1 className="tracking-display font-display mt-3 text-3xl font-medium">Teach with impact</h1>
              <p className="mt-3 text-muted">
                Manage classes, monitor student progress, and publish new content.
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          {loading && <p className="text-muted">Loading dashboard...</p>}

          {!loading && !error && dashboard && (
            <>
              {/* Stats row */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.title}
                    className="rounded-2xl border border-line bg-card p-6 backdrop-blur-xl transition hover:bg-card-hover"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted">{stat.title}</h3>
                      <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={stat.icon} />
                      </svg>
                    </div>
                    <p className="font-display mt-3 text-3xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                {/* My Courses */}
                <div className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">My Courses</h2>
                  {courses.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {courses.map((course) => (
                        <li
                          key={course.id}
                          className="flex items-center gap-4 rounded-xl border border-line bg-card-deep px-5 py-4"
                        >
                          <img
                            src={courseCover(course.title)}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded-lg object-cover"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-secondary">{course.title}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {course.enrolledStudents ?? 0} students
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                              course.isActive
                                ? 'border border-orange-400/30 bg-orange-400/10 text-accent-soft'
                                : 'border border-slate-400/30 bg-slate-400/10 text-secondary'
                            }`}
                          >
                            {course.isActive ? 'Active' : 'Draft'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted">You have not created any courses yet.</p>
                  )}
                </div>

                {/* Publish CTA */}
                <div className="flex flex-col rounded-3xl border border-orange-400/20 bg-hero-band p-8 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Publish new content</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    Create a new course, assignment, or quiz and share it with your students.
                  </p>
                  <button
                    onClick={() => navigate('/instructorContent')}
                    className="mt-6 w-fit rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--page)] shadow-xl transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    Manage course content
                  </button>
                </div>
              </div>

              {/* Recent activity grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent submissions */}
                <div className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Recent Submissions</h2>
                  {submissions.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {submissions.slice(0, 5).map((sub) => (
                        <li key={sub.id} className="rounded-xl border border-line bg-card-deep px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium text-secondary">{sub.student?.name || 'Student'}</p>
                            <span className="shrink-0 text-xs text-muted">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">{sub.assignment?.title || 'Assignment'}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted">No submissions yet.</p>
                  )}
                </div>

                {/* Recent quiz attempts */}
                <div className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Recent Quiz Attempts</h2>
                  {quizAttempts.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {quizAttempts.slice(0, 5).map((attempt) => (
                        <li key={attempt.id} className="rounded-xl border border-line bg-card-deep px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium text-secondary">{attempt.student?.name || 'Student'}</p>
                            <span className="shrink-0 text-xs text-muted">
                              {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">{attempt.quiz?.title || 'Quiz'}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted">No quiz attempts yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstructorDashboard;
