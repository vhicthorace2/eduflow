import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { courseCover } from '../component/courseCovers.js';
import adminHeroImg from '../assets/admin-hero.jpg';

const emptyForm = { title: '', description: '', category: 'Engineering', difficulty: 'beginner', instructorId: '' };

function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/admin/courses').catch(() => ({ courses: [] })),
      api.get('/admin/users?role=instructor').catch(() => ({ users: [] })),
      api.get('/admin/users?role=lecturer').catch(() => ({ users: [] })),
    ])
      .then(([courseData, instructorData, lecturerData]) => {
        if (active) {
          setCourses(courseData.courses || []);
          setInstructors([...(instructorData.users || []), ...(lecturerData.users || [])]);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg);
    else setNotice(msg);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!form.instructorId) {
      flash('Please assign an instructor', true);
      return;
    }
    try {
      await api.post('/courses', { ...form, instructorId: Number(form.instructorId) });
      setForm(emptyForm);
      const data = await api.get('/admin/courses');
      setCourses(data.courses || []);
      flash('Course created successfully');
    } catch (err) {
      flash(err.message || 'Failed to create course', true);
    }
  };

  const handleAssign = async (course, instructorId) => {
    if (!instructorId) return;
    try {
      const data = await api.put(`/admin/courses/${course.id}/assign`, { instructorId: Number(instructorId) });
      setCourses((prev) => prev.map((c) => (c.id === course.id ? data.course : c)));
      flash(data.message || 'Instructor assigned');
    } catch (err) {
      flash(err.message || 'Failed to assign instructor', true);
    }
  };

  const handleToggle = async (course) => {
    try {
      await api.put(`/admin/courses/${course.id}/status`);
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, isActive: !c.isActive } : c)));
      flash(course.isActive ? 'Course deactivated' : 'Course activated');
    } catch (err) {
      flash(err.message || 'Failed to update course', true);
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete "${course.title}"? This removes the course and cannot be undone.`)) return;
    try {
      await api.delete(`/courses/${course.id}`);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
      flash('Course deleted');
    } catch (err) {
      flash(err.message || 'Failed to delete course', true);
    }
  };

  const inputCls = 'w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content placeholder:text-muted focus:border-orange-400/50 focus:outline-none';

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
              src={adminHeroImg}
              alt=''
              aria-hidden='true'
              className='absolute inset-0 h-full w-full object-cover opacity-20'
              loading='lazy'
            />
            <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40' aria-hidden='true' />
            <div className='relative'>
              <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Admin</p>
              <h1 className='tracking-display font-display mt-3 text-3xl font-medium'>Manage Courses</h1>
              <p className='mt-3 text-muted'>Add and remove courses, assign them to instructors, and control availability.</p>
            </div>
          </header>

          {error && <p className='rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger'>{error}</p>}
          {notice && <p className='rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-accent-soft'>{notice}</p>}

          <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
            <h2 className='text-lg font-semibold'>Add New Course</h2>
            <form onSubmit={handleCreate} className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              <input className={inputCls} placeholder='Course title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input className={inputCls} placeholder='Category (e.g. Engineering)' value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              <select className={inputCls} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option value='beginner'>Beginner</option>
                <option value='intermediate'>Intermediate</option>
                <option value='advanced'>Advanced</option>
              </select>
              <textarea
                className={`${inputCls} md:col-span-2 xl:col-span-2`}
                rows={2}
                placeholder='Course description'
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              <select className={inputCls} value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })} required>
                <option value=''>Assign an instructor…</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name} ({inst.email})</option>
                ))}
              </select>
              <button className='rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 md:col-span-2 xl:col-span-3'>
                Create course
              </button>
            </form>
          </section>

          <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
            <h2 className='text-lg font-semibold'>All Courses ({courses.length})</h2>
            {loading ? (
              <p className='mt-4 text-sm text-muted'>Loading...</p>
            ) : courses.length > 0 ? (
              <ul className='mt-5 space-y-3'>
                {courses.map((course) => (
                  <li key={course.id} className='flex flex-col gap-3 rounded-2xl border border-line bg-card-deep px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4'>
                    <div className='flex min-w-0 flex-1 items-center gap-3'>
                      <img
                        src={courseCover(course.title)}
                        alt=''
                        className='h-12 w-16 shrink-0 rounded-lg object-cover'
                        loading='lazy'
                      />
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-secondary'>{course.title}</p>
                        <p className='mt-0.5 truncate text-xs text-muted'>
                          {course.instructor?.name || 'Unassigned'} · {course.category} · {course.difficulty}
                        </p>
                      </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                          course.isActive
                            ? 'border-orange-400/30 bg-orange-400/10 text-accent-soft'
                            : 'border-slate-400/30 bg-slate-400/10 text-secondary'
                        }`}
                      >
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <select
                        value={course.instructorId || ''}
                        onChange={(e) => handleAssign(course, e.target.value)}
                        className='w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-secondary focus:border-orange-400/50 focus:outline-none sm:w-auto'
                      >
                        <option value=''>Assign instructor…</option>
                        {instructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
                      <div className='flex w-full gap-2 sm:w-auto'>
                        <button
                          onClick={() => handleToggle(course)}
                          className='flex-1 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-card-hover sm:flex-none'
                        >
                          {course.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(course)}
                          className='flex-1 rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-red-400/20 sm:flex-none'
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='mt-4 text-sm text-muted'>No courses found.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ManageCourses;