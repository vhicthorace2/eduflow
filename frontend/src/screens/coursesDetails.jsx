import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Navbar from "../component/navigation.jsx";
import BackButton from '../component/backButton.jsx';
import { courseCover } from '../component/courseCovers.js';
import api, { tokenStore } from '../api/client.js';

const nowMs = () => Date.now();

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

function videoEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (parsed.hostname.includes('vimeo.com')) {
      return `https://player.vimeo.com/video${parsed.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

function ModuleMaterials({ materials }) {
  if (!materials || materials.length === 0) return null;
  return (
    <div className="mt-6 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Materials</h4>
      {materials.filter((m) => m.type === 'video').map((material) => {
        const embed = videoEmbedUrl(material.videoUrl);
        return (
          <div key={material.id} className="rounded-2xl border border-line bg-card-deep p-4">
            <p className="text-sm font-semibold text-content">{material.title}</p>
            {material.description && <p className="mt-1 text-sm text-muted">{material.description}</p>}
            {embed ? (
              <iframe
                className="mt-3 aspect-video w-full rounded-xl border border-line"
                src={embed}
                title={material.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video className="mt-3 aspect-video w-full rounded-xl border border-line" controls src={material.videoUrl}>
                Your browser does not support video playback.
              </video>
            )}
          </div>
        );
      })}
      {materials.filter((m) => m.type === 'link').map((material) => (
        <a
          key={material.id}
          href={material.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-line bg-card-deep px-4 py-3 text-sm font-medium text-accent transition hover:bg-card-hover"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          {material.title}
        </a>
      ))}
    </div>
  );
}

const PACE_META = {
  accelerated: { label: 'Accelerated pace', color: 'border-orange-400/50 bg-orange-400/10 text-accent-soft', dot: 'bg-orange-400' },
  steady: { label: 'Steady pace', color: 'border-sky-400/50 bg-sky-400/10 text-sky-300', dot: 'bg-sky-400' },
  review: { label: 'Review pace', color: 'border-amber-400/50 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
};

function ModuleStatusBadge({ status }) {
  if (status === 'completed') {
    return <span className="shrink-0 rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-accent">Completed</span>;
  }
  if (status === 'review') {
    return <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">Review</span>;
  }
  if (status === 'current') {
    return <span className="shrink-0 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">Up next</span>;
  }
  return null;
}

function PaceBanner({ path, onContinue }) {
  if (!path) return null;
  const meta = PACE_META[path.pace] || PACE_META.steady;
  return (
    <div className="shadow-panel mt-10 overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Your learning path</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${meta.color}`}>
              {meta.label}
            </span>
            {path.performanceScore != null && (
              <span className="rounded-full border border-line bg-card-deep px-4 py-2 text-sm font-medium text-secondary">
                Performance {Math.round(path.performanceScore)}%
              </span>
            )}
          </div>
          <p className="mt-4 max-w-2xl leading-7 text-muted">{path.feedback}</p>
        </div>
        {path.nextModuleTitle && (
          <button
            onClick={onContinue}
            className="shrink-0 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Continue: {path.nextModuleTitle} →
          </button>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>{path.completedCount} of {path.totalModules} modules completed</span>
          <span>{path.progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line-strong">
          <div className="h-full rounded-full bg-orange-400" style={{ width: `${path.progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
}

function CourseDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openModule, setOpenModule] = useState(null);
  const [recommendedId, setRecommendedId] = useState(null);
  const [path, setPath] = useState(null);
  const loggedModuleViews = useRef(new Set());
  const moduleSession = useRef({});
  const recommendedOrder = Number(searchParams.get('module')) || null;

  const endModuleSession = (moduleId) => {
    const start = moduleSession.current[moduleId];
    if (start == null) return;
    const elapsed = Math.max(0, Math.round((nowMs() - start) / 1000));
    delete moduleSession.current[moduleId];
    if (tokenStore.get() && elapsed > 0 && !loggedModuleViews.current.has(moduleId)) {
      loggedModuleViews.current.add(moduleId);
      api.post('/activity', { courseId: id, moduleId, activityType: 'module_view', timeSpent: elapsed }).catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      Object.keys(moduleSession.current).forEach((moduleId) => endModuleSession(Number(moduleId)));
      moduleSession.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!tokenStore.get()) return () => { active = false; };
    api.get(`/courses/${id}/learning-path`)
      .then((data) => {
        if (active) setPath(data.path);
      })
      .catch(() => {
        if (active) setPath(null);
      });
    return () => { active = false; };
  }, [id]);

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
        const moduleList = data.modules || [];
        if (active) setModules(moduleList);
        if (recommendedOrder) {
          const target = moduleList.find((m) => Number(m.order) === recommendedOrder);
          if (target) {
            setRecommendedId(target.id);
            moduleSession.current[target.id] = nowMs();
            setOpenModule(target.id);
            setTimeout(() => {
              const el = document.getElementById(`module-${target.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
            return;
          }
        }
        setRecommendedId(null);
        setOpenModule(null);
      })
      .catch(() => {
        if (active) setModules([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, recommendedOrder]);

  const toggleModule = (moduleId) => {
    const isClosing = openModule === moduleId;
    if (isClosing) {
      endModuleSession(moduleId);
      setOpenModule(null);
      return;
    }
    if (openModule != null && openModule !== moduleId) {
      endModuleSession(openModule);
    }
    moduleSession.current[moduleId] = nowMs();
    setOpenModule(moduleId);
  };

  const continueToRecommended = () => {
    if (path?.recommendedModuleId) {
      const nextId = path.recommendedModuleId;
      if (openModule != null && openModule !== nextId) {
        endModuleSession(openModule);
      }
      moduleSession.current[nextId] = nowMs();
      setOpenModule(nextId);
      setRecommendedId(nextId);
      setTimeout(() => {
        const el = document.getElementById(`module-${nextId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  };

  const statusForModule = (moduleId) => {
    if (!path) return null;
    if (path.recommendedModuleId === moduleId) return 'current';
    const module = path.modules?.find((m) => m.id === moduleId);
    return module?.status || null;
  };

  return (
    <div className="relative min-h-screen bg-page text-content">
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 sm:px-8 lg:px-16">
        <BackButton className="mb-6" />
        {loading && <p className="text-muted">Loading course...</p>}

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && course && (
          <>
            <section className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-hero-dark px-8 py-12 text-white sm:px-10 lg:px-12">
              <img
                src={courseCover(course.title)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" aria-hidden="true" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 flex flex-wrap gap-3">
                    {course.category && (
                      <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-200">
                        {course.category}
                      </span>
                    )}
                    {course.difficulty && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
                        {course.difficulty}
                      </span>
                    )}
                  </div>
                  <h1 className="tracking-display font-display text-3xl font-medium leading-[1.08] sm:text-4xl lg:text-5xl">
                    {course.title}
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                    {course.description}
                  </p>
                </div>

                <div className="shadow-panel rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                    Instructor
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {course.instructor?.name || 'TBA'}
                  </p>
                </div>
              </div>
            </section>

            <PaceBanner path={path} onContinue={continueToRecommended} />

            <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                <div className="shadow-panel rounded-3xl border border-line bg-card p-8">
                  <h2 className="font-display text-2xl font-medium tracking-tight">About this course</h2>
                  <p className="mt-4 leading-7 text-muted">{course.description}</p>
                </div>

                <div className="shadow-panel rounded-3xl border border-line bg-card p-8">
                  <h2 className="font-display text-2xl font-medium tracking-tight">Course Content</h2>
                  {modules.length > 0 ? (
                    <ol className="mt-6 space-y-3">
                      {modules.map((module) => {
                        const isOpen = openModule === module.id;
                        const status = statusForModule(module.id);
                        const isHighlighted = module.id === recommendedId || (path && path.recommendedModuleId === module.id && status === 'current');
                        return (
                          <li
                            key={module.id}
                            id={`module-${module.id}`}
                            className={`overflow-hidden rounded-2xl border bg-card-deep ${
                              isHighlighted
                                ? 'border-orange-400/60 ring-1 ring-inset ring-orange-400/30'
                                : 'border-line'
                            }`}
                          >
                            <button
                              onClick={() => toggleModule(module.id)}
                              className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-card-hover"
                              aria-expanded={isOpen}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-400/15 font-semibold text-accent ring-1 ring-inset ring-orange-400/30">
                                {module.order}
                              </span>
                              <span className="flex-1">
                                <span className="font-semibold text-content">{module.title}</span>
                                <span className="mt-1 block text-sm leading-6 text-muted">{module.description}</span>
                              </span>
                              <ModuleStatusBadge status={status} />
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
                                <ModuleMaterials materials={module.materials} />
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

              <div className="shadow-panel rounded-3xl border border-line bg-card p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight">Instructor</h2>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-400/20 font-semibold text-accent-soft ring-1 ring-inset ring-orange-400/30">
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
