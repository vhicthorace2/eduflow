import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import PasswordInput from '../component/passwordInput.jsx';
import api, { tokenStore, userStore } from '../api/client.js';
import studyImg from '../assets/study.jpg';

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
    'w-full rounded-xl border border-line-strong bg-card-strong px-4 py-3 text-content placeholder:text-muted outline-none backdrop-blur-md transition focus:border-orange-400/60 focus:bg-card-hover focus:ring-2 focus:ring-orange-400/20';

  return (
    <div className='min-h-screen bg-page text-content'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 bg-dot-grid opacity-50' />

      <Navbar landing />

        <div className='relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-36 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-16'>
          <div className='lg:col-span-5'>
            <div className='shadow-panel w-full max-w-md rounded-3xl border border-line-strong bg-page-solid p-8 sm:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Welcome back</p>
            <h1 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Sign in to EduFlow</h1>
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
                <PasswordInput
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Enter your password"
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--page)] shadow-xl shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60'
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {message ? (
              <p
                className={`mt-6 rounded-xl border px-4 py-3 text-sm backdrop-blur-md ${
                  isError
                    ? 'border-red-400/30 bg-red-500/10 text-danger'
                    : 'border-orange-400/30 bg-orange-500/10 text-accent-soft'
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

          <div className='hidden lg:col-span-7 lg:block'>
            <figure className='border-line-strong shadow-panel overflow-hidden border bg-page-solid'>
              <img
                src={studyImg}
                alt='Student studying at a desk filled with books and notes'
                className='aspect-[4/3] w-full object-cover'
                loading='lazy'
              />
              <figcaption className='rule-h-strong flex items-center justify-between gap-3 px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-faint'>
                <span>Learn at your own pace</span>
                <span className='text-accent'>EduFlow</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Login;
