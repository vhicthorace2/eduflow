import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import api from '../api/client.js';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-line-strong bg-card-strong px-4 py-3 text-content placeholder:text-muted outline-none backdrop-blur-md transition focus:border-orange-400/60 focus:bg-card-hover focus:ring-2 focus:ring-orange-400/20';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setIsError(false);
    setMessage('');

    try {
      const data = await api.post('/auth/forgot-password', { email });
      setSent(true);
      setMessage(data.message || 'If an account exists with that email, a reset link has been sent.');
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Could not send the reset email. Please try again.');
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
            <h1 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Forgot password</h1>
            <p className='mt-3 text-sm leading-6 text-muted'>
              Enter the email on your account and we will send you a link to choose a new password.
            </p>

            {sent ? (
              <div className='mt-8 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-5 text-sm leading-6 text-accent-soft'>
                <p className='font-semibold'>Check your inbox</p>
                <p className='mt-1'>{message}</p>
              </div>
            ) : (
              <form className='mt-8 space-y-5' onSubmit={handleSubmit}>
                <div>
                  <label className='mb-1.5 block text-sm font-medium text-secondary' htmlFor='email'>
                    Email address
                  </label>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className={inputClass}
                    placeholder='you@example.com'
                  />
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  className='w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--page)] shadow-xl shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60'
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            )}

            {isError && message ? (
              <p className='mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger backdrop-blur-md'>
                {message}
              </p>
            ) : null}

            <p className='mt-8 text-center text-sm text-muted'>
              Remembered it?{' '}
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

export default ForgotPassword;
