import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import teamImg from '../assets/team.jpg';

const ROLE_COLORS = {
  admin: 'border-purple-400/40 bg-purple-400/15 text-purple-300',
  instructor: 'border-teal-400/40 bg-teal-400/15 text-info',
  lecturer: 'border-sky-400/40 bg-sky-400/15 text-info',
  student: 'border-orange-400/40 bg-orange-400/15 text-accent-soft',
};

const emptyForm = { name: '', email: '', password: '', role: 'student' };

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let active = true;
    api.get('/admin/users')
      .then((data) => {
        if (active) setUsers(data.users || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load users');
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
    try {
      await api.post('/admin/users', form);
      setForm(emptyForm);
      const data = await api.get('/admin/users');
      setUsers(data.users || []);
      flash('User created successfully');
    } catch (err) {
      flash(err.message || 'Failed to create user', true);
    }
  };

  const handleRoleChange = async (user, role) => {
    try {
      await api.put(`/admin/users/${user.id}`, { role });
      const data = await api.get('/admin/users');
      setUsers(data.users || []);
      flash(`Role updated to ${role}`);
    } catch (err) {
      flash(err.message || 'Failed to update role', true);
    }
  };

  const handleToggle = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}/toggle-status`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      flash(user.isActive ? 'User deactivated' : 'User activated');
    } catch (err) {
      flash(err.message || 'Failed to update status', true);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      flash('User deleted');
    } catch (err) {
      flash(err.message || 'Failed to delete user', true);
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
              src={teamImg}
              alt=''
              aria-hidden='true'
              className='absolute inset-0 h-full w-full object-cover opacity-20'
              loading='lazy'
            />
            <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40' aria-hidden='true' />
            <div className='relative'>
              <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Admin</p>
              <h1 className='tracking-display font-display mt-3 text-3xl font-medium'>Manage Users</h1>
              <p className='mt-3 text-muted'>Create accounts, change roles, and remove users.</p>
            </div>
          </header>

          {error && <p className='rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger'>{error}</p>}
          {notice && <p className='rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-accent-soft'>{notice}</p>}

          <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
            <h2 className='text-lg font-semibold'>Add New User</h2>
            <form onSubmit={handleCreate} className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
              <input className={inputCls} placeholder='Full name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className={inputCls} type='email' placeholder='Email' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className={inputCls} type='password' placeholder='Password (min 6)' value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value='student'>Student</option>
                <option value='instructor'>Instructor</option>
                <option value='lecturer'>Lecturer</option>
                <option value='admin'>Admin</option>
              </select>
              <button className='rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400'>
                Add user
              </button>
            </form>
          </section>

          <section className='rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'>
            <h2 className='text-lg font-semibold'>Users ({users.length})</h2>
            {loading ? (
              <p className='mt-4 text-sm text-muted'>Loading...</p>
            ) : users.length > 0 ? (
              <ul className='mt-5 space-y-3'>
                {users.map((user) => (
                  <li key={user.id} className='flex flex-col gap-3 rounded-2xl border border-line bg-card-deep px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4'>
                    <div className='flex min-w-0 flex-1 items-center gap-3'>
                      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20 font-semibold text-accent-soft'>
                        {(user.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className='min-w-0'>
                        <p className='flex items-center gap-2 truncate text-sm font-semibold text-secondary'>
                          {user.name}
                          {!user.isActive && (
                            <span className='rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-danger'>Inactive</span>
                          )}
                        </p>
                        <p className='truncate text-xs text-muted'>{user.email}</p>
                      </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${ROLE_COLORS[user.role] || ROLE_COLORS.student}`}>
                        {user.role}
                      </span>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className='w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-secondary focus:border-orange-400/50 focus:outline-none sm:w-auto'
                      >
                        <option value='student'>Student</option>
                        <option value='instructor'>Instructor</option>
                        <option value='lecturer'>Lecturer</option>
                        <option value='admin'>Admin</option>
                      </select>
                      <div className='flex w-full gap-2 sm:w-auto'>
                        <button
                          onClick={() => handleToggle(user)}
                          className='flex-1 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-card-hover sm:flex-none'
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
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
              <p className='mt-4 text-sm text-muted'>No users found.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ManageUsers;