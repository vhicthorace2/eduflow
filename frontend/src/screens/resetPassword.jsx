import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import PasswordInput from '../component/passwordInput.jsx';
import api, { tokenStore, userStore } from '../api/client.js';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-line-strong bg-card-strong px-4 py-3 text-content placeholder:text-muted outline-none backdrop-blur-md transition focus:border-orange-400/60 focus:bg-card-hover focus:ring-2 focus:ring-orange-400/20';

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
      const data = await api.post(`/auth/reset-password/${token}`, { password: formData.password });
      tokenStore.set(data.token);

      try {
        const me = await api.get('/auth/me');
        if (me?.user) {
          userStore.set(me.user);
          const role = me.user.role;
          if (role === 'admin') return navigate('/adminDashboard');
          if (role === 'instructor' || role === 'lecturer') return navigate('/instructorDashboard');
          return navigate('/studentDashboard');
        }
      } catch {
        // Fall through to the login screen if we cannot load the profile.
      }

      return navigate('/login');
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-page text-content'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 bg-dot-grid opacity-50' />
        <Navbar landing />

        <div className='relative mx-auto flex max-w-7xl items-center justify-center px-6 pb-24 pt-36 sm:px-8 lg:px-16'>
          <div className='shadow-panel w-full max-w-md rounded-3xl border border-line-strong bg-page-solid p-8 sm:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Account recovery</p>
            <h1 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Choose a new password</h1>
            <p className='mt-3 text-sm leading-6 text-muted'>
              Set a new password for your EduFlow account. The link expires shortly after it is sent.
            </p>

            <form className='mt-8 space-y-5' onSubmit={handleSubmit}>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='password'>
                  New password
                </label>
                <PasswordInput
                  id='password'
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder='Enter a new password'
                />
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='confirmPassword'>
                  Confirm new password
                </label>
                <PasswordInput
                  id='confirmPassword'
                  name='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder='Re-enter the new password'
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--page)] shadow-xl shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60'
              >
                {loading ? 'Resetting...' : 'Reset password'}
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
              <Link to='/login' className='font-semibold text-accent hover:text-accent-soft'>
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ResetPassword;
