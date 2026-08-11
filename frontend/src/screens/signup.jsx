import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import api, { tokenStore, userStore } from '../api/client.js';

function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsError(false);
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setIsError(true);
      setMessage('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/register', {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      tokenStore.set(data.token);
      userStore.set(data.user);

      const me = await api.get('/auth/me');
      if (!me || !me.user) {
        throw new Error('Could not authenticate after signup.');
      }
      userStore.set(me.user);
      navigate(me.user.role === 'instructor' ? '/instructorDashboard' : '/studentDashboard');
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Registration failed. Please try again.');
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

        <div className='relative mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 pb-24 pt-36 sm:px-8 lg:flex-row lg:justify-between lg:px-16'>
          <div className='max-w-xl text-center lg:text-left'>
            <p className='mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-card-strong px-4 py-2 text-sm font-medium text-accent-soft backdrop-blur-md'>
              <span className='h-2 w-2 rounded-full bg-emerald-400' />
              Join EduFlow
            </p>
            <h1 className='font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl'>
              Create your account and start learning with confidence.
            </h1>
            <p className='mt-6 text-lg leading-8 text-muted'>
              Access curated courses, track your progress, and connect with instructors in one place.
            </p>
          </div>

          <div className='w-full max-w-md rounded-3xl border border-line-strong bg-card p-8 shadow-2xl backdrop-blur-xl sm:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Get started</p>
            <h2 className='font-display mt-3 text-3xl font-semibold tracking-tight'>Sign up</h2>
            <p className='mt-3 text-sm leading-6 text-muted'>
              Start your learning journey in just a few steps.
            </p>

            <form className='mt-8 space-y-5' onSubmit={handleSubmit}>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='fullName'>
                  Full name
                </label>
                <input
                  id='fullName'
                  name='fullName'
                  type='text'
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder='Enter your full name'
                />
              </div>

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
                  placeholder='Create a password'
                />
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='confirmPassword'>
                  Confirm password
                </label>
                <input
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder='Re-enter your password'
                />
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='role'>
                  I am a
                </label>
                <select
                  id='role'
                  name='role'
                  value={formData.role}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value='student' className='bg-page'>Student</option>
                  <option value='instructor' className='bg-page'>Instructor</option>
                </select>
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 shadow-xl shadow-emerald-500/10 transition hover:bg-emerald-100 disabled:opacity-60'
              >
                {loading ? 'Creating account...' : 'Create account'}
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
              Already have an account?{' '}
              <Link to='/login' className='font-semibold text-accent hover:text-accent-soft'>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Signup;
