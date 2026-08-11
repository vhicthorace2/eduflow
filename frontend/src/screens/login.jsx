import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import api, { tokenStore, userStore } from '../api/client.js';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const redirectByRole = (role) => {
    if (role === 'admin') return navigate('/adminDashboard');
    if (role === 'instructor' || role === 'lecturer') return navigate('/instructorDashboard');
    return navigate('/studentDashboard');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setIsError(false);
    setMessage('');

    try {
      const data = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });
      tokenStore.set(data.token);
      userStore.set(data.user);
      redirectByRole(data.user.role);
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-line-strong bg-card-strong px-4 py-3 text-content placeholder:text-muted outline-none backdrop-blur-md transition focus:border-emerald-400/60 focus:bg-card-hover focus:ring-2 focus:ring-emerald-400/20';

  return (
    <div className='min-h-screen bg-page text-content'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='pointer-events-none absolute -left-32 top-20 h-[26rem] w-[26rem] rounded-full bg-emerald-500/20 blur-[120px]' />
        <div className='pointer-events-none absolute -right-32 bottom-10 h-[26rem] w-[26rem] rounded-full bg-teal-400/15 blur-[120px]' />

        <Navbar />

        <div className='relative mx-auto flex max-w-7xl flex-col items-center justify-center px-6 pb-24 pt-36 sm:px-8 lg:px-16'>
          <div className='w-full max-w-md rounded-3xl border border-line-strong bg-card p-8 shadow-2xl backdrop-blur-xl sm:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Welcome back</p>
            <h1 className='font-display mt-3 text-3xl font-semibold tracking-tight'>Sign in to EduFlow</h1>
            <p className='mt-3 text-sm leading-6 text-muted'>
              Access your courses, progress, and dashboard.
            </p>

            <form className='mt-8 space-y-5' onSubmit={handleSubmit}>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='email'>
                  Email address
                </label>
                <input
                  id='email'
                  name='email'
                  type='email'
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder='you@example.com'
                />
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='password'>
                  Password
                </label>
                <input
                  id='password'
                  name='password'
                  type='password'
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder='Enter your password'
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 shadow-xl shadow-emerald-500/10 transition hover:bg-emerald-100 disabled:opacity-60'
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {message ? (
              <p
                className={`mt-6 rounded-xl border px-4 py-3 text-sm backdrop-blur-md ${
                  isError
                    ? 'border-red-400/30 bg-red-500/10 text-danger'
                    : 'border-emerald-400/30 bg-emerald-500/10 text-accent-soft'
                }`}
              >
                {message}
              </p>
            ) : null}

            <p className='mt-8 text-center text-sm text-muted'>
              Don&apos;t have an account?{' '}
              <Link to='/signup' className='font-semibold text-accent hover:text-accent-soft'>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Login;
