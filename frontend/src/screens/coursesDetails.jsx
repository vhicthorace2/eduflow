import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from "../component/navigation.jsx";
import BackButton from '../component/backButton.jsx';
import api from '../api/client.js';

function parseLesson(content) {
  const blocks = [];
  const lines = String(content).split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') {
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', text: line.slice(3) });
      i += 1;
      continue;
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('## ') &&
      !lines[i].trim().startsWith('- ')
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function CourseDetails() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openModule, setOpenModule] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/courses/${id}`)
      .then((data) => {
        if (active) setCourse(data.course);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load course');
      });
    api.get(`/modules/course/${id}`)
      .then((data) => {
        if (active) setModules(data.modules || []);
      })
      .catch(() => {
        if (active) setModules([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -left-40 top-10 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[130px]" />
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 sm:px-8 lg:px-16">
        <BackButton className="mb-6" />
        {loading && <p className="text-muted">Loading course...</p>}

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && course && (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-line bg-hero-dark px-8 py-12 text-white shadow-2xl backdrop-blur-xl sm:px-10 lg:px-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-[90px]" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 flex flex-wrap gap-3">
                    {course.category && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                        {course.category}
                      </span>
                    )}
                    {course.difficulty && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
                        {course.difficulty}
                      </span>
                    )}
                  </div>
                  <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                    {course.title}
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                    {course.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-md">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                    Instructor
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {course.instructor?.name || 'TBA'}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                <div className="rounded-3xl border border-line bg-card p-8 shadow-sm backdrop-blur-xl">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">About this course</h2>
                  <p className="mt-4 leading-7 text-muted">{course.description}</p>
                </div>

                <div className="rounded-3xl border border-line bg-card p-8 shadow-sm backdrop-blur-xl">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">Course Content</h2>
                  {modules.length > 0 ? (
                    <ol className="mt-6 space-y-3">
                      {modules.map((module) => {
                        const isOpen = openModule === module.id;
                        return (
                          <li
                            key={module.id}
                            className="overflow-hidden rounded-2xl border border-line bg-card-deep"
                          >
                            <button
                              onClick={() => setOpenModule(isOpen ? null : module.id)}
                              className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-card-hover"
                              aria-expanded={isOpen}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 font-semibold text-accent ring-1 ring-inset ring-emerald-400/30">
                                {module.order}
                              </span>
                              <span className="flex-1">
                                <span className="font-semibold text-content">{module.title}</span>
                                <span className="mt-1 block text-sm leading-6 text-muted">{module.description}</span>
                              </span>
                              <svg
                                className={`mt-1 h-5 w-5 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              >
                                <path d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isOpen && (
                              <div className="border-t border-line bg-card px-5 py-6 sm:px-8">
                                {module.content ? (
                                  parseLesson(module.content).map((block, bIndex) => {
                                    if (block.type === 'heading') {
                                      return (
                                        <h3 key={bIndex} className="font-display mb-3 mt-6 text-lg font-semibold text-content first:mt-0">
                                          {block.text}
                                        </h3>
                                      );
                                    }
                                    if (block.type === 'list') {
                                      return (
                                        <ul key={bIndex} className="mb-4 space-y-2 last:mb-0">
                                          {block.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="flex gap-3 text-secondary">
                                              <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                              <span className="leading-7">{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      );
                                    }
                                    return (
                                      <p key={bIndex} className="mb-4 leading-7 text-secondary last:mb-0">
                                        {block.text}
                                      </p>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-muted">Lesson content is being prepared.</p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card-deep p-8 text-sm text-muted">
                      Modules and materials are managed by the instructor.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-card p-8 shadow-sm backdrop-blur-xl">
                <h2 className="font-display text-2xl font-semibold tracking-tight">Instructor</h2>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 font-semibold text-accent-soft ring-1 ring-inset ring-emerald-400/30">
                    {(course.instructor?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-content">
                      {course.instructor?.name || 'TBA'}
                    </h4>
                    <p className="text-sm text-muted">
                      {course.instructor?.email || 'Instructor'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default CourseDetails;
