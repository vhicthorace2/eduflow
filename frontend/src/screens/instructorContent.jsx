import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { courseCover } from '../component/courseCovers.js';
import lectureImg from '../assets/lecture.jpg';

const emptyModuleForm = { title: '', description: '', order: 1, content: '' };
const emptyVideoForm = { title: '', videoUrl: '', description: '', moduleId: '', type: 'video' };
const emptyAssignmentForm = { title: '', description: '', instructions: '', dueDate: '', maxPoints: 100 };
const emptyQuizForm = { title: '', description: '', type: 'quiz', timeLimit: 30, maxAttempts: 1, passingScore: 70, questions: [] };

const TABS = [
  { id: 'lessons', label: 'Lessons' },
  { id: 'videos', label: 'Videos' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'assessments', label: 'Quizzes, Tests & Exams' },
];

function QuestionBuilder({ questions, onChange }) {
  const updateQuestion = (index, patch) => {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };
  const removeQuestion = (index) => {
    onChange(questions.filter((_, i) => i !== index));
  };
  const addQuestion = () => {
    onChange([...questions, { question: '', options: ['', '', '', ''], correctAnswer: '0', points: 1 }]);
  };

  const optionInput = 'w-full rounded-lg border border-line bg-card-deep px-3 py-2 text-sm text-content placeholder:text-muted focus:border-orange-400/50 focus:outline-none';

  return (
    <div className='space-y-4'>
      {questions.map((question, qIndex) => (
        <div key={qIndex} className='rounded-2xl border border-line bg-card-deep p-4'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-sm font-semibold text-secondary'>Question {qIndex + 1}</p>
            <button
              type='button'
              onClick={() => removeQuestion(qIndex)}
              className='rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-red-400/20'
            >
              Remove
            </button>
          </div>
          <input
            className={`${optionInput} mt-3`}
            placeholder='Question text'
            value={question.question}
            onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
            required
          />
          <div className='mt-3 grid gap-2 sm:grid-cols-2'>
            {question.options.map((option, oIndex) => (
              <input
                key={oIndex}
                className={optionInput}
                placeholder={`Option ${oIndex + 1}`}
                value={option}
                onChange={(e) => {
                  const options = [...question.options];
                  options[oIndex] = e.target.value;
                  updateQuestion(qIndex, { options });
                }}
                required
              />
            ))}
          </div>
          <div className='mt-3 grid gap-2 sm:grid-cols-2'>
            <label className='text-xs font-semibold text-muted'>
              Correct answer
              <select
                className='mt-1 w-full rounded-lg border border-line bg-card-deep px-3 py-2 text-sm text-content focus:border-orange-400/50 focus:outline-none'
                value={question.correctAnswer}
                onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
              >
                {question.options.map((option, oIndex) => (
                  <option key={oIndex} value={String(oIndex)}>
                    Option {oIndex + 1}{option ? `: ${option}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-xs font-semibold text-muted'>
              Points
              <input
                type='number'
                min='1'
                className='mt-1 w-full rounded-lg border border-line bg-card-deep px-3 py-2 text-sm text-content focus:border-orange-400/50 focus:outline-none'
                value={question.points}
                onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type='button'
        onClick={addQuestion}
        className='rounded-xl border border-orange-400/40 bg-orange-400/10 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-orange-400/20'
      >
        + Add question
      </button>
    </div>
  );
}

function InstructorContent() {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('lessons');
  const [modules, setModules] = useState([]);
  const [materials, setMaterials] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [moduleForm, setModuleForm] = useState(emptyModuleForm);
  const [editingId, setEditingId] = useState(null);
  const [videoForm, setVideoForm] = useState(emptyVideoForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);

  const inputCls = 'w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content placeholder:text-muted focus:border-orange-400/50 focus:outline-none';

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

    api.get(`/modules/course/${selectedId}`)
      .then((data) => {
        if (!active) return;
        const materialMap = {};
        (data.modules || []).forEach((module) => {
          materialMap[module.id] = module.materials || [];
        });
        setMaterials(materialMap);
      })
      .catch(() => {
        if (active) setMaterials({});
      });

    Promise.all([
      api.get(`/modules/course/${selectedId}`).catch(() => ({ modules: [] })),
      api.get(`/quizzes/course/${selectedId}`).catch(() => ({ quizzes: [] })),
      api.get(`/assignments/course/${selectedId}`).catch(() => ({ assignments: [] }))
    ]).then(([mods, quizes, assns]) => {
      if (!active) return;
      setModules(mods.modules || []);
      setQuizzes(quizes.quizzes || []);
      setAssignments(assns.assignments || []);
      setLoadingModules(false);
    });

    return () => { active = false; };
  }, [selectedId]);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg);
    else setNotice(msg);
  };

  const startModuleEdit = (module) => {
    setEditingId(module.id);
    setModuleForm({ title: module.title, description: module.description || '', order: module.order, content: module.content || '' });
  };

  const resetModuleForm = () => {
    setEditingId(null);
    setModuleForm(emptyModuleForm);
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      if (editingId) {
        await api.put(`/modules/${editingId}`, { ...moduleForm, order: Number(moduleForm.order) });
        flash('Module updated');
      } else {
        await api.post(`/modules/course/${selectedId}`, { ...moduleForm, order: Number(moduleForm.order) });
        flash('Module added');
      }
      resetModuleForm();
      const data = await api.get(`/modules/course/${selectedId}`);
      setModules(data.modules || []);
    } catch (err) {
      flash(err.message || 'Failed to save module', true);
    }
  };

  const handleModuleDelete = async (module) => {
    if (!window.confirm(`Delete module "${module.title}"?`)) return;
    try {
      await api.delete(`/modules/${module.id}`);
      setModules((prev) => prev.filter((m) => m.id !== module.id));
      flash('Module deleted');
    } catch (err) {
      flash(err.message || 'Failed to delete module', true);
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!videoForm.moduleId) {
      flash('Select the module the video belongs to', true);
      return;
    }
    try {
      const module = modules.find((m) => String(m.id) === String(videoForm.moduleId));
      if (!module) throw new Error('Module not found');
      await api.post(`/materials/module/${module.id}`, {
        title: videoForm.title,
        type: 'video',
        videoUrl: videoForm.videoUrl,
        description: videoForm.description,
        order: 0
      });
      flash('Video added');
      setVideoForm(emptyVideoForm);
      const data = await api.get(`/modules/course/${selectedId}`);
      setModules(data.modules || []);
      const materialMap = {};
      (data.modules || []).forEach((mod) => {
        materialMap[mod.id] = mod.materials || [];
      });
      setMaterials(materialMap);
    } catch (err) {
      flash(err.message || 'Failed to add video', true);
    }
  };

  const handleMaterialDelete = async (moduleId, material) => {
    if (!window.confirm(`Delete "${material.title}"?`)) return;
    try {
      await api.delete(`/materials/${material.id}`);
      setMaterials((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter((m) => m.id !== material.id)
      }));
      setModules((prev) => prev.map((m) => (m.id === moduleId
        ? { ...m, materials: (m.materials || []).filter((mat) => mat.id !== material.id) }
        : m)));
      flash('Material deleted');
    } catch (err) {
      flash(err.message || 'Failed to delete material', true);
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.post(`/assignments/course/${selectedId}`, {
        title: assignmentForm.title,
        description: assignmentForm.description,
        instructions: assignmentForm.instructions,
        dueDate: assignmentForm.dueDate ? new Date(assignmentForm.dueDate).toISOString() : new Date().toISOString(),
        maxPoints: Number(assignmentForm.maxPoints) || 100
      });
      flash('Assignment created');
      setAssignmentForm(emptyAssignmentForm);
      const data = await api.get(`/assignments/course/${selectedId}`);
      setAssignments(data.assignments || []);
    } catch (err) {
      flash(err.message || 'Failed to create assignment', true);
    }
  };

  const handleAssignmentDelete = async (assignment) => {
    if (!window.confirm(`Delete assignment "${assignment.title}"?`)) return;
    try {
      await api.delete(`/assignments/${assignment.id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
      flash('Assignment deleted');
    } catch (err) {
      flash(err.message || 'Failed to delete assignment', true);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const validQuestions = quizForm.questions.filter(
      (q) => q.question.trim() && q.options.every((o) => o.trim())
    );
    const serialized = validQuestions.map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.options[Number(q.correctAnswer)],
      points: Number(q.points) || 1
    }));
    if (serialized.length === 0) {
      flash('Add at least one fully-filled question', true);
      return;
    }
    try {
      await api.post(`/quizzes/course/${selectedId}`, {
        title: quizForm.title,
        description: quizForm.description,
        type: quizForm.type,
        timeLimit: Number(quizForm.timeLimit) || 0,
        maxAttempts: Number(quizForm.maxAttempts) || 1,
        passingScore: Number(quizForm.passingScore) || 70,
        questions: serialized
      });
      flash(`${quizForm.type.charAt(0).toUpperCase() + quizForm.type.slice(1)} created`);
      setQuizForm(emptyQuizForm);
      const data = await api.get(`/quizzes/course/${selectedId}`);
      setQuizzes(data.quizzes || []);
    } catch (err) {
      flash(err.message || 'Failed to create assessment', true);
    }
  };

  const handleQuizDelete = async (quiz) => {
    if (!window.confirm(`Delete "${quiz.title}"?`)) return;
    try {
      await api.delete(`/quizzes/${quiz.id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      flash('Assessment deleted');
    } catch (err) {
      flash(err.message || 'Failed to delete assessment', true);
    }
  };

  const selectCourse = (courseId) => {
    setSelectedId(String(courseId));
    setTab('lessons');
    setEditingId(null);
    setLoadingModules(true);
    setError('');
    setNotice('');
  };

  return (
    <div className='relative min-h-screen bg-page text-content'>
      <div className='pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]' />
      <Sidebar />
      <div className='relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 md:ml-72'>
        <div className='mx-auto max-w-6xl space-y-6'>
          <div>
            <BackButton />
          </div>

          <header className='shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10'>
            <img
              src={lectureImg}
              alt=''
              aria-hidden='true'
              className='absolute inset-0 h-full w-full object-cover opacity-20'
              loading='lazy'
            />
            <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40' aria-hidden='true' />
            <div className='relative'>
              <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Instructor</p>
              <h1 className='tracking-display font-display mt-3 text-3xl font-medium'>Course Content</h1>
              <p className='mt-3 text-muted'>Manage lessons, videos, assignments, and quizzes for your courses.</p>
            </div>
          </header>

          {error && <p className='rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger'>{error}</p>}
          {notice && <p className='rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-accent-soft'>{notice}</p>}

          <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
            <h2 className='text-lg font-semibold'>Select a course</h2>
            {loadingCourses ? (
              <p className='mt-4 text-sm text-muted'>Loading courses...</p>
            ) : courses.length > 0 ? (
              <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => selectCourse(course.id)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      selectedId === String(course.id)
                        ? 'border-orange-400/60 bg-orange-400/10 ring-1 ring-inset ring-orange-400/30'
                        : 'border-line bg-card-deep hover:border-orange-400/30 hover:bg-card-hover'
                    }`}
                  >
                    <img
                      src={courseCover(course.title)}
                      alt={`${course.title} cover`}
                      className='aspect-[16/9] w-full rounded-xl object-cover'
                      loading='lazy'
                    />
                    <p className='mt-4 text-sm font-semibold text-secondary'>{course.title}</p>
                    <p className='mt-1 text-xs text-muted'>{course.category} · {course.difficulty}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className='mt-4 text-sm text-muted'>
                You have not been assigned any courses yet. Ask an admin to assign one.
              </p>
            )}
          </section>

          {selectedId && (
            <>
              <div className='flex flex-wrap gap-2 rounded-3xl border border-line bg-card p-2 backdrop-blur-xl'>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      tab === t.id
                        ? 'bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-400/30'
                        : 'text-muted hover:bg-card-hover hover:text-content'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'lessons' && (
                <>
                  <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
                    <div className='flex items-center justify-between gap-4'>
                      <div>
                        <h2 className='text-lg font-semibold'>{editingId ? 'Edit module' : 'Add module'}</h2>
                        <p className='mt-1 text-sm text-muted'>
                          {editingId ? 'Update the lesson and its content.' : 'Create a new lesson. Content supports ## headings and - bullet points.'}
                        </p>
                      </div>
                      {editingId && (
                        <button onClick={resetModuleForm} className='text-sm font-semibold text-accent transition hover:text-accent-soft'>
                          Cancel edit
                        </button>
                      )}
                    </div>
                    <form onSubmit={handleModuleSubmit} className='mt-5 space-y-4'>
                      <div className='grid gap-4 md:grid-cols-[1fr_120px]'>
                        <input className={inputCls} placeholder='Module title' value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} required />
                        <input className={inputCls} type='number' min='1' placeholder='Order' value={moduleForm.order} onChange={(e) => setModuleForm({ ...moduleForm, order: e.target.value })} required />
                      </div>
                      <input className={inputCls} placeholder='Short description' value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} />
                      <textarea
                        className={`${inputCls} h-40 resize-y leading-6`}
                        placeholder={'Lesson content…\n## Heading\n- bullet point\nPlain paragraph text.'}
                        value={moduleForm.content}
                        onChange={(e) => setModuleForm({ ...moduleForm, content: e.target.value })}
                      />
                      <button className='rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400'>
                        {editingId ? 'Save changes' : 'Add module'}
                      </button>
                    </form>
                  </section>

                  <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
                    <h2 className='text-lg font-semibold'>Modules ({modules.length})</h2>
                    {loadingModules ? (
                      <p className='mt-4 text-sm text-muted'>Loading modules...</p>
                    ) : modules.length > 0 ? (
                      <ul className='mt-5 space-y-3'>
                        {modules.map((module) => (
                          <li key={module.id} className='rounded-2xl border border-line bg-card-deep px-5 py-4'>
                            <div className='flex flex-wrap items-center gap-4'>
                              <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-sm font-semibold text-accent'>
                                {module.order}
                              </span>
                              <div className='min-w-0 flex-1'>
                                <p className='text-sm font-semibold text-secondary'>{module.title}</p>
                                <p className='mt-0.5 line-clamp-2 text-xs text-muted'>{module.description}</p>
                              </div>
                              <div className='flex gap-2'>
                                <button
                                  onClick={() => startModuleEdit(module)}
                                  className='rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-card-hover'
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleModuleDelete(module)}
                                  className='rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-red-400/20'
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            {module.content && (
                              <p className='mt-3 line-clamp-3 rounded-xl border border-line bg-card px-4 py-3 text-xs leading-6 text-muted'>
                                {module.content}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='mt-4 text-sm text-muted'>No modules yet. Add the first lesson above.</p>
                    )}
                  </section>
                </>
              )}

              {tab === 'videos' && (
                <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
                  <h2 className='text-lg font-semibold'>Add a video</h2>
                  <p className='mt-1 text-sm text-muted'>Attach a YouTube / Vimeo / direct video link to one of the course modules.</p>
                  <form onSubmit={handleVideoSubmit} className='mt-5 space-y-4'>
                    <select
                      className={inputCls}
                      value={videoForm.moduleId}
                      onChange={(e) => setVideoForm({ ...videoForm, moduleId: e.target.value })}
                      required
                    >
                      <option value=''>Select module…</option>
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.order}. {module.title}
                        </option>
                      ))}
                    </select>
                    <input className={inputCls} placeholder='Video title' value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} required />
                    <input
                      className={inputCls}
                      type='url'
                      placeholder='https://www.youtube.com/watch?v=…'
                      value={videoForm.videoUrl}
                      onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                      required
                    />
                    <input className={inputCls} placeholder='Short description (optional)' value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} />
                    <button className='rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400'>
                      Add video
                    </button>
                  </form>

                  <div className='mt-8'>
                    <h3 className='text-base font-semibold'>Videos & materials</h3>
                    {loadingModules ? (
                      <p className='mt-3 text-sm text-muted'>Loading…</p>
                    ) : modules.length > 0 ? (
                      <div className='mt-4 space-y-6'>
                        {modules.map((module) => {
                          const moduleMaterials = materials[module.id] || [];
                          return (
                            <div key={module.id} className='rounded-2xl border border-line bg-card-deep p-4'>
                              <p className='text-sm font-semibold text-secondary'>
                                {module.order}. {module.title}
                              </p>
                              {moduleMaterials.length > 0 ? (
                                <ul className='mt-3 space-y-2'>
                                  {moduleMaterials.map((material) => (
                                    <li key={material.id} className='flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3'>
                                      <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-xs font-semibold text-accent'>
                                        {material.type === 'video' ? 'V' : material.type === 'link' ? 'L' : 'F'}
                                      </span>
                                      <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-medium text-content'>{material.title}</p>
                                        <p className='truncate text-xs text-muted'>{material.videoUrl || material.linkUrl || material.fileUrl || material.description}</p>
                                      </div>
                                      <button
                                        onClick={() => handleMaterialDelete(module.id, material)}
                                        className='rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-1.5 text-xs font-semibold text-danger transition hover:bg-red-400/20'
                                      >
                                        Delete
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className='mt-2 text-xs text-muted'>No materials yet.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className='mt-3 text-sm text-muted'>Add modules first so you can attach videos to them.</p>
                    )}
                  </div>
                </section>
              )}

              {tab === 'assignments' && (
                <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
                  <h2 className='text-lg font-semibold'>Create assignment</h2>
                  <p className='mt-1 text-sm text-muted'>Add a task students hand in by a due date.</p>
                  <form onSubmit={handleAssignmentSubmit} className='mt-5 space-y-4'>
                    <input className={inputCls} placeholder='Assignment title' value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} required />
                    <textarea
                      className={`${inputCls} h-28 resize-y leading-6`}
                      placeholder='Description'
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                      required
                    />
                    <textarea
                      className={`${inputCls} h-28 resize-y leading-6`}
                      placeholder='Instructions'
                      value={assignmentForm.instructions}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                    />
                    <div className='grid gap-4 md:grid-cols-2'>
                      <label className='text-sm font-medium text-secondary'>
                        Due date
                        <input
                          type='datetime-local'
                          className='mt-1.5 block w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content focus:border-orange-400/50 focus:outline-none'
                          value={assignmentForm.dueDate}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                          required
                        />
                      </label>
                      <label className='text-sm font-medium text-secondary'>
                        Max points
                        <input
                          type='number'
                          min='1'
                          className='mt-1.5 block w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content focus:border-orange-400/50 focus:outline-none'
                          value={assignmentForm.maxPoints}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, maxPoints: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                    <button className='rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400'>
                      Create assignment
                    </button>
                  </form>

                  <div className='mt-8'>
                    <h3 className='text-base font-semibold'>Assignments ({assignments.length})</h3>
                    {assignments.length > 0 ? (
                      <ul className='mt-4 space-y-3'>
                        {assignments.map((assignment) => (
                          <li key={assignment.id} className='flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card-deep px-5 py-4'>
                            <div className='min-w-0 flex-1'>
                              <p className='text-sm font-semibold text-secondary'>{assignment.title}</p>
                              <p className='mt-0.5 line-clamp-1 text-xs text-muted'>
                                Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : '—'} · {assignment.maxPoints} pts
                              </p>
                            </div>
                            <button
                              onClick={() => handleAssignmentDelete(assignment)}
                              className='rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-red-400/20'
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='mt-3 text-sm text-muted'>No assignments yet.</p>
                    )}
                  </div>
                </section>
              )}

              {tab === 'assessments' && (
                <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
                  <h2 className='text-lg font-semibold'>Create quiz / test / exam</h2>
                  <p className='mt-1 text-sm text-muted'>Build a multiple-choice assessment and set grading rules.</p>
                  <form onSubmit={handleQuizSubmit} className='mt-5 space-y-4'>
                    <div className='grid gap-4 md:grid-cols-[1fr_180px]'>
                      <input className={inputCls} placeholder='Title (e.g. Mid-term Test)' value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} required />
                      <select
                        className={inputCls}
                        value={quizForm.type}
                        onChange={(e) => setQuizForm({ ...quizForm, type: e.target.value })}
                      >
                        <option value='quiz'>Quiz</option>
                        <option value='test'>Test</option>
                        <option value='exam'>Exam</option>
                      </select>
                    </div>
                    <textarea
                      className={`${inputCls} h-24 resize-y leading-6`}
                      placeholder='Description'
                      value={quizForm.description}
                      onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    />
                    <div className='grid gap-4 md:grid-cols-3'>
                      <label className='text-sm font-medium text-secondary'>
                        Time limit (min)
                        <input type='number' min='0' className='mt-1.5 block w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content focus:border-orange-400/50 focus:outline-none' value={quizForm.timeLimit} onChange={(e) => setQuizForm({ ...quizForm, timeLimit: e.target.value })} />
                      </label>
                      <label className='text-sm font-medium text-secondary'>
                        Max attempts
                        <input type='number' min='1' className='mt-1.5 block w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content focus:border-orange-400/50 focus:outline-none' value={quizForm.maxAttempts} onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: e.target.value })} />
                      </label>
                      <label className='text-sm font-medium text-secondary'>
                        Passing score (%)
                        <input type='number' min='0' max='100' className='mt-1.5 block w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content focus:border-orange-400/50 focus:outline-none' value={quizForm.passingScore} onChange={(e) => setQuizForm({ ...quizForm, passingScore: e.target.value })} />
                      </label>
                    </div>
                    <QuestionBuilder questions={quizForm.questions} onChange={(questions) => setQuizForm({ ...quizForm, questions })} />
                    <button className='rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400'>
                      Create assessment
                    </button>
                  </form>

                  <div className='mt-8'>
                    <h3 className='text-base font-semibold'>Assessments ({quizzes.length})</h3>
                    {quizzes.length > 0 ? (
                      <ul className='mt-4 space-y-3'>
                        {quizzes.map((quiz) => (
                          <li key={quiz.id} className='flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card-deep px-5 py-4'>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                              quiz.type === 'exam'
                                ? 'border-red-400/40 bg-red-400/10 text-danger'
                                : quiz.type === 'test'
                                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                                  : 'border-orange-400/40 bg-orange-400/10 text-accent'
                            }`}>
                              {quiz.type}
                            </span>
                            <div className='min-w-0 flex-1'>
                              <p className='text-sm font-semibold text-secondary'>{quiz.title}</p>
                              <p className='mt-0.5 text-xs text-muted'>
                                {quiz.questions ? quiz.questions.length : 0} questions · {quiz.timeLimit || '—'} min · pass {quiz.passingScore}%
                              </p>
                            </div>
                            <button
                              onClick={() => handleQuizDelete(quiz)}
                              className='rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-red-400/20'
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='mt-3 text-sm text-muted'>No assessments yet.</p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstructorContent;