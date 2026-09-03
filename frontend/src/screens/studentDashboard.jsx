import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { userStore } from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import WelcomeHeading from '../component/welcomeHeading.jsx';
import { courseCover } from '../component/courseCovers.js';
import studentHeroImg from '../assets/student-hero.jpg';

const ASSESSMENT_TIME_LIMIT = 120;

const SECTIONS = [
  { id: 'courses', label: 'My Courses' },
  { id: 'tasks', label: 'Upcoming Tasks' },
  { id: 'results', label: 'Recent Results' },
  { id: 'available', label: 'Available Courses' },
];


function StudentDashboard() {
  const [user] = useState(userStore.get());
  const [courses, setCourses] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [grades, setGrades] = useState([]);
  const [cgpa, setCgpa] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('courses');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState(ASSESSMENT_TIME_LIMIT);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const submitRef = useRef(null);
  submitRef.current = () => {
    const { assessmentId, answers } = wizard;
    if (!assessmentId) return;
    submitAssessment(assessmentId, answers);
  };

  const [wizard, setWizard] = useState({
    open: false,
    course: null,
    phase: 'intro', // intro | questions | result
    assessmentId: null,
    questions: [],
    answers: [],
    result: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/courses/my-courses').catch(() => ({ courses: [] })),
      api.get('/quizzes/my-attempts').catch(() => ({ attempts: [] })),
      api.get('/gradebook/my-grades').catch(() => ({ gradebooks: [] })),
      api.get('/gradebook/cgpa').catch(() => ({ cgpa: null })),
      api.get('/courses').catch(() => ({ courses: [] })),
    ])
      .then(([courseData, attemptData, gradeData, cgpaData, catalogData]) => {
        if (active) {
          setCourses(courseData.courses || []);
          setAttempts(attemptData.attempts || []);
          setGrades(gradeData.gradebooks || []);
          setCgpa(cgpaData.cgpa ?? null);
          setAvailableCourses(catalogData.courses || []);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const refreshEnrolledCourses = async () => {
    const data = await api.get('/courses/my-courses').catch(() => ({ courses: [] }));
    setCourses(data.courses || []);
  };

  const enrolledIds = new Set((courses || []).map((c) => c.id));

  const [moduleCounts, setModuleCounts] = useState({});

  useEffect(() => {
    let active = true;
    availableCourses.forEach((course) => {
      api
        .get(`/modules/course/${course.id}`)
        .catch(() => ({ modules: [] }))
        .then((data) => {
          if (active) {
            setModuleCounts((prev) => ({ ...prev, [course.id]: (data.modules || []).length }));
          }
        });
    });
    return () => { active = false; };
  }, [availableCourses]);

  const passedCount = attempts.filter((a) => a.passed).length;
  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.overallGrade || 0), 0) / grades.length)
    : 0;

  const stats = [
    {
      title: 'CGPA',
      value: cgpa === null ? 'N/A' : cgpa.toFixed(2),
      subtitle: cgpa === null ? 'No graded courses yet' : 'out of 5.0 scale',
      icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5' },
    { title: 'Enrolled Courses', value: courses.length, icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
    { title: 'Quizzes Taken', value: attempts.length, icon: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { title: 'Quizzes Passed', value: passedCount, icon: 'M5 13l4 4L19 7' },
    { title: 'Average Grade', value: `${avgGrade}%`, icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0' },
  ];

  const openWizard = (course) => {
    setWizard({
      open: true,
      course,
      phase: 'intro',
      assessmentId: null,
      questions: [],
      answers: [],
      result: null,
      error: null,
    });
  };

  const startAssessment = async () => {
    const course = wizard.course;
    setWizard((w) => ({
      ...w,
      phase: 'questions',
      error: null,
      assessmentId: null,
      questions: [],
      answers: [],
      result: null,
    }));
    try {
      const data = await api.post('/assessment/start', { course: course.title, courseId: course.id });
      setWizard((w) => ({
        ...w,
        assessmentId: data.assessmentId,
        questions: data.questions || [],
        answers: (data.questions || []).map(() => null),
      }));
    } catch (error) {
      setWizard((w) => ({ ...w, phase: 'intro', error: error.message || 'Failed to start assessment' }));
    }
  };

  const selectAnswer = (questionIndex, option) => {
    setWizard((w) => {
      const answers = [...w.answers];
      answers[questionIndex] = option;
      return { ...w, answers };
    });
  };

  const submitAssessment = async (assessmentId, answers) => {
    if (submitting) return;
    setSubmitting(true);
    setWizard((w) => ({ ...w, error: null }));
    try {
      const data = await api.post('/assessment/submit', {
        assessmentId,
        answers,
      });
      await refreshEnrolledCourses();
      setRedirectCountdown(3);
      setWizard((w) => ({ ...w, phase: 'result', result: data }));
    } catch (error) {
      setWizard((w) => ({ ...w, error: error.message || 'Failed to submit assessment' }));
    } finally {
      setSubmitting(false);
    }
  };

  const goToStudy = () => {
    const courseId = wizard.course?.id;
    const moduleOrder = wizard.result?.recommendedModuleOrder;
    closeWizard();
    if (courseId) navigate(moduleOrder ? `/courses/${courseId}?module=${moduleOrder}` : `/courses/${courseId}`);
  };

  const autoRedirectRef = useRef(null);
  autoRedirectRef.current = goToStudy;

  useEffect(() => {
    if (wizard.phase !== 'questions' || !wizard.assessmentId) return undefined;

    setTimeLeft(ASSESSMENT_TIME_LIMIT);

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [wizard.phase, wizard.assessmentId]);

  useEffect(() => {
    if (wizard.phase === 'questions' && timeLeft === 0) {
      submitRef.current();
    }
  }, [timeLeft, wizard.phase]);

  useEffect(() => {
    if (wizard.phase !== 'result' || wizard.result?.recommendedModuleOrder == null) return undefined;
    if (redirectCountdown === 0) {
      autoRedirectRef.current();
      return undefined;
    }
    if (redirectCountdown === null) return undefined;
    const timer = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [wizard.phase, wizard.result, redirectCountdown]);

  const closeWizard = () => {
    setRedirectCountdown(null);
    setWizard({ open: false, course: null, phase: 'intro', assessmentId: null, questions: [], answers: [], result: null, error: null });
  };

  const answeredCount = wizard.answers.filter((a) => a !== null).length;

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
              src={studentHeroImg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" aria-hidden="true" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Student Dashboard</p>
              <h1 className="tracking-display font-display mt-3 text-3xl font-medium">
                <WelcomeHeading name={user?.name || 'learner'} />
              </h1>
              <p className="mt-3 text-muted">
                Track your enrolled courses, assignments, and learning progress here.
              </p>
            </div>
          </div>

          {/* Stats row */}
          {!loading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className={`rounded-2xl border p-6 backdrop-blur-xl transition hover:bg-card-hover ${
                    stat.title === 'CGPA'
                      ? 'border-orange-400/40 bg-orange-400/10'
                      : 'border-line bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted">{stat.title}</h3>
                    <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d={stat.icon} />
                    </svg>
                  </div>
                  <p className={`font-display mt-3 text-3xl font-semibold ${stat.title === 'CGPA' ? 'text-accent-soft' : ''}`}>
                    {stat.value}
                  </p>
                  {stat.subtitle && <p className="mt-1 text-xs text-muted">{stat.subtitle}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Section tabs */}
          <div className="flex flex-wrap gap-2 rounded-3xl border border-line bg-card p-2 backdrop-blur-xl" role="tablist">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={section === s.id}
                onClick={() => setSection(s.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  section === s.id
                    ? 'bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-400/30'
                    : 'text-muted hover:bg-card-hover hover:text-content'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {section === 'courses' && (
            <div className="rounded-3xl border border-line bg-card p-6 backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Courses</h2>
                <button
                  onClick={() => navigate('/courses')}
                  className="text-sm font-semibold text-accent transition hover:text-accent-soft"
                >
                  Browse all →
                </button>
              </div>
              {loading ? (
                <p className="mt-4 text-sm text-muted">Loading...</p>
              ) : courses.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {courses.map((course) => (
                    <li key={course.id}>
                      <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="group w-full rounded-xl border border-line bg-card-deep px-5 py-4 text-left transition hover:border-orange-400/30 hover:bg-card-hover"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={courseCover(course.title)}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded-lg object-cover"
                            loading="lazy"
                          />
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-secondary">{course.title}</p>
                          <span className="shrink-0 text-xs font-semibold text-accent transition group-hover:translate-x-1">→</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-strong">
                          <div className="h-full w-0 rounded-full bg-orange-400" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  You are not enrolled in any courses yet.{' '}
                  <button onClick={() => navigate('/courses')} className="font-semibold text-accent hover:text-accent-soft">
                    Explore courses
                  </button>
                </p>
              )}
            </div>
          )}

          {section === 'tasks' && (
            <div className="rounded-3xl border border-line bg-card p-6 backdrop-blur-xl sm:p-8">
              <h2 className="text-lg font-semibold">Upcoming Tasks</h2>
              <p className="mt-2 text-sm text-muted">
                Quizzes and assignments will appear here once published.
              </p>
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-muted">
                  No upcoming deadlines
                </div>
                <div className="rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-muted">
                  Check back after your instructor publishes new work
                </div>
              </div>
            </div>
          )}

          {section === 'available' && (
            <div className="rounded-3xl border border-line bg-card p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Available Courses</h2>
                  <p className="mt-1 text-sm text-muted">
                  Take a placement assessment to get a recommended learning level for any course.
                </p>
              </div>
              <button
                onClick={() => navigate('/courses')}
                className="text-sm font-semibold text-accent transition hover:text-accent-soft"
              >
                View catalog →
              </button>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-muted">Loading courses...</p>
            ) : availableCourses.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-col rounded-2xl border border-line bg-card-deep p-6 transition hover:border-orange-400/30 hover:bg-card-hover"
                  >
                    <img
                      src={courseCover(course.title)}
                      alt={`${course.title} cover`}
                      className="aspect-[16/9] w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold `}
                      >
                        {course.difficulty}
                      </span>
                      <span className="text-xs text-muted">
                        {moduleCounts[course.id] ?? '—'} modules
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-lg font-semibold leading-snug text-content">
                      {course.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
                      {course.description}
                    </p>
                    {enrolledIds.has(course.id) ? (
                      <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="mt-5 w-full rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent-soft transition hover:bg-accent/20"
                      >
                        Enrolled · View course →
                      </button>
                    ) : (
                      <button
                        onClick={() => openWizard(course)}
                        className="mt-5 w-full rounded-xl border border-orange-400/40 bg-orange-400/10 px-4 py-2.5 text-sm font-semibold text-accent-soft transition hover:bg-orange-400/20"
                      >
                        Take Assessment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">No courses available yet.</p>
            )}
            </div>
          )}

          {section === 'results' && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Quiz Results */}
              <div className="rounded-3xl border border-line bg-card p-6 backdrop-blur-xl sm:p-8">
                <h2 className="text-lg font-semibold">Recent Quiz Results</h2>
                {loading ? (
                  <p className="mt-4 text-sm text-muted">Loading...</p>
                ) : attempts.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {attempts.slice(0, 5).map((attempt) => (
                      <li key={attempt.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-card-deep px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-secondary">{attempt.quiz?.title || 'Quiz'}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {attempt.percentage}% · {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            attempt.passed
                              ? 'border border-orange-400/30 bg-orange-400/10 text-accent-soft'
                              : 'border border-red-400/30 bg-red-400/10 text-danger'
                          }`}
                        >
                          {attempt.passed ? 'Passed' : 'Retry'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">No quiz attempts yet.</p>
                )}
              </div>

              {/* My Grades */}
              <div className="rounded-3xl border border-line bg-card p-6 backdrop-blur-xl sm:p-8">
                <h2 className="text-lg font-semibold">My Grades</h2>
                {loading ? (
                  <p className="mt-4 text-sm text-muted">Loading...</p>
                ) : grades.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {grades.slice(0, 5).map((grade) => (
                      <li key={grade.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-card-deep px-4 py-3">
                        <p className="min-w-0 truncate text-sm font-medium text-secondary">{grade.course?.title || 'Course'}</p>
                        <span className="shrink-0 text-sm font-semibold text-accent">{Math.round(grade.overallGrade || 0)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">No grades published yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assessment wizard */}
      {wizard.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeWizard} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-page-solid p-8 text-content shadow-2xl sm:p-10">
            <button
              onClick={closeWizard}
              className="absolute right-5 top-5 rounded-lg border border-line bg-card p-2 text-muted transition hover:text-content"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {wizard.error && (
              <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-danger">
                {wizard.error}
              </div>
            )}

            {wizard.phase === 'intro' && (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Placement Assessment</p>
                <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight">{wizard.course?.title}</h2>
                <p className="mt-3 text-sm text-muted">
                  You will answer {wizard.course ? '10' : ''} questions generated for this course.
                  Based on your answers, we will recommend a starting level and a module.  
                </p>
                <button
                  onClick={startAssessment}
                  className="mt-8 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                >
                  Start Assessment
                </button>
              </div>
            )}

            {wizard.phase === 'questions' && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Placement Assessment</p>
                    <h2 className="font-display mt-2 text-xl font-semibold tracking-tight">{wizard.course?.title}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        timeLeft <= 30
                          ? 'border-red-400/40 bg-red-400/10 text-danger'
                          : 'border-line bg-card text-secondary'
                      }`}
                    >
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </span>
                    <span className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-secondary">
                      {answeredCount}/{wizard.questions.length}
                    </span>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  {wizard.questions.length === 0 ? (
                    <p className="text-sm text-muted">Loading questions...</p>
                  ) : (
                    wizard.questions.map((question, qIndex) => (
                      <div key={qIndex} className="rounded-2xl border border-line bg-card-deep p-5">
                        <p className="font-medium text-content">
                          {qIndex + 1}. {question.question}
                        </p>
                        <div className="mt-4 space-y-2">
                          {(question.options || []).map((option) => {
                            const selected = wizard.answers[qIndex] === option;
                            return (
                              <label
                                key={option}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                                  selected
                                    ? 'border-orange-400/50 bg-orange-400/10 text-accent-soft'
                                    : 'border-line bg-card text-secondary hover:border-line-strong'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${qIndex}`}
                                  className="accent-orange-400"
                                  checked={selected}
                                  onChange={() => selectAnswer(qIndex, option)}
                                />
                                {option}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => submitAssessment(wizard.assessmentId, wizard.answers)}
                  disabled={submitting || answeredCount < wizard.questions.length || wizard.questions.length === 0}
                  className="mt-8 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"
                >
                  {submitting
                    ? 'Submitting…'
                    : answeredCount < wizard.questions.length
                      ? `Answer all questions to continue (${answeredCount}/${wizard.questions.length})`
                      : 'Submit Assessment'}
                </button>
              </div>
            )}

            {wizard.phase === 'result' && wizard.result && (
              <div className="text-center">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${
                    wizard.result.percentage >= 50
                      ? 'border-orange-400/40 bg-orange-400/10'
                      : 'border-amber-400/40 bg-amber-400/10'
                  }`}
                >
                  <span className="font-display text-2xl font-semibold text-accent-soft">
                    {wizard.result.percentage}%
                  </span>
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Assessment Complete</p>
                <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight">
                  Recommended Level: {wizard.result.level}
                </h2>
                <p className="mt-3 text-sm text-muted">
                  You scored {wizard.result.score} out of {wizard.result.total}. Start with{' '}
                  <span className="font-semibold text-secondary">
                    {wizard.result.recommendedModule || wizard.result.nextLesson}
                  </span>
                  .
                </p>
                {wizard.result.recommendedModuleOrder != null && (
                  <p className="mt-4 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm font-medium text-accent-soft">
                    Taking you to {wizard.result.recommendedModule} in {redirectCountdown ?? 0}s…
                  </p>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => startAssessment()}
                    className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-card-hover"
                  >
                    Retake
                  </button>
                  <button
                    onClick={goToStudy}
                    className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                  >
                    Start studying →
                  </button>
                </div>
                <button
                  onClick={closeWizard}
                  className="mt-4 text-sm font-semibold text-muted transition hover:text-content"
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
