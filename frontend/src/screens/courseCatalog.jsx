import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import BackButton from '../component/backButton.jsx';
import api from '../api/client.js';

function CourseCatalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/courses')
      .then((data) => {
        if (active) setCourses(data.courses || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load courses');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -right-40 top-20 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[130px]" />
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 sm:px-8 lg:px-16">
        <BackButton className="mb-6" />
        <div className="rounded-3xl border border-line bg-card p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Course Catalog</p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Explore available courses</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Browse a growing library of courses designed for students and professionals.
          </p>

          {loading && <p className="mt-8 text-muted">Loading courses...</p>}

          {error && (
            <p className="mt-8 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}

          {!loading && !error && courses.length === 0 && (
            <p className="mt-8 text-muted">No courses available yet.</p>
          )}

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="group rounded-2xl border border-line bg-card-deep p-6 text-left backdrop-blur-md transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-card-hover"
              >
                <h2 className="text-lg font-semibold text-content">{course.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{course.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.category && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-accent-soft">{course.category}</span>
                  )}
                  {course.difficulty && (
                    <span className="rounded-full border border-slate-400/30 bg-slate-400/10 px-3 py-1 text-xs font-medium capitalize text-secondary">{course.difficulty}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CourseCatalog;
