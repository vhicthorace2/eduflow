import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import PasswordInput from '../component/passwordInput.jsx';
import { markNewUser } from '../component/sessionFlags.js';
import api, { tokenStore, userStore } from '../api/client.js';
import studyImg from '../assets/study.jpg';

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
      markNewUser();
      navigate(me.user.role === 'instructor' ? '/instructorDashboard' : '/studentDashboard');
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Registration failed. Please try again.');
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

        <div className='relative mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 pb-24 pt-36 sm:px-8 lg:flex-row lg:justify-between lg:px-16'>
          <div className='max-w-xl text-center lg:text-left'>
            <p className='mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-card-strong px-4 py-2 text-sm font-medium text-accent-soft backdrop-blur-md'>
              <span className='h-2 w-2 rounded-full bg-orange-400' />
              Join EduFlow
            </p>
            <h1 className='tracking-display font-display text-4xl font-medium leading-[1.05] sm:text-5xl'>
              Create your account and start learning with confidence.
            </h1>
            <p className='mt-6 text-lg leading-8 text-muted'>
              Access curated courses, track your progress, and connect with instructors in one place.
            </p>

            <figure className='border-line-strong shadow-panel mt-10 hidden overflow-hidden border bg-page-solid lg:block'>
              <img
                src={studyImg}
                alt='Student studying with an open notebook and laptop'
                className='aspect-[4/3] w-full object-cover'
                loading='lazy'
              />
              <figcaption className='rule-h-strong flex items-center justify-between gap-3 px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-faint'>
                <span>Start your semester</span>
                <span className='text-accent'>EduFlow</span>
              </figcaption>
            </figure>
          </div>

          <div className='shadow-panel w-full max-w-md rounded-3xl border border-line-strong bg-page-solid p-8 sm:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Get started</p>
            <h2 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Sign up</h2>
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
                <PasswordInput
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Create a password"
                />
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='confirmPassword'>
                  Confirm password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Re-enter your password"
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
                className='w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--page)] shadow-xl shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60'
              >
                {loading ? 'Creating account...' : 'Create account'}
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
