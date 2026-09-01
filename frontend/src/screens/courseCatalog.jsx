import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import BackButton from '../component/backButton.jsx';
import Reveal from '../component/reveal.jsx';
import { courseCover } from '../component/courseCovers.js';
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
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-32 sm:px-8 lg:px-16">
        <BackButton className="mb-8" />

        <Reveal>
          <div className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Course Catalog</p>
              <h1 className="tracking-display font-display mt-4 text-4xl font-medium leading-[1.05] sm:text-5xl">
                Explore available courses.
              </h1>
              <p className="mt-5 max-w-2xl leading-8 text-muted">
                Browse a growing library of courses designed for students and professionals.
              </p>
            </div>
            {!loading && !error && (
              <p className="shrink-0 text-sm font-medium text-faint">
                {courses.length} course{courses.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </Reveal>

        {loading && <p className="mt-10 text-muted">Loading courses...</p>}

        {error && (
          <p className="mt-10 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && courses.length === 0 && (
          <p className="mt-10 text-muted">No courses available yet.</p>
        )}

        {!loading && !error && courses.length > 0 && (
          <Reveal className="shadow-panel border border-line bg-page-solid">
            <div className="divide-y divide-line">
              {courses.map((course, i) => (
                <button
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="group grid min-w-0 w-full items-center gap-x-8 gap-y-2 px-7 py-7 text-left transition hover:bg-[var(--card-hover)] sm:grid-cols-12"
                >
                  <span className="font-display hidden text-sm font-semibold text-faint transition-colors group-hover:text-accent sm:col-span-1 sm:block">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="hidden sm:col-span-2 sm:block">
                    <img
                      src={courseCover(course.title)}
                      alt={`${course.title} cover`}
                      className="aspect-[16/10] w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                      loading="lazy"
                    />
                  </span>
                  <span className="min-w-0 sm:col-span-6">
                    <span className="tracking-display font-display block text-xl font-medium leading-snug text-content transition-colors group-hover:text-accent sm:text-2xl">
                      {course.title}
                    </span>
                    <span className="mt-1.5 hidden leading-6 text-muted sm:block">{course.description}</span>
                  </span>
                  <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:col-span-2 lg:justify-end">
                    {course.category && (
                      <span className="rounded-full border border-line bg-card-deep px-3 py-1 text-xs font-medium text-accent-soft">
                        {course.category}
                      </span>
                    )}
                    {course.difficulty && (
                      <span className="rounded-full border border-line px-3 py-1 text-xs font-medium capitalize text-secondary">
                        {course.difficulty}
                      </span>
                    )}
                  </span>
                  <span className="hidden text-lg text-faint transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-accent sm:col-span-1 sm:block sm:text-right">
                    &rarr;
                  </span>
                </button>
              ))}
            </div>
          </Reveal>
        )}
      </main>
    </div>
  );
}

export default CourseCatalog;