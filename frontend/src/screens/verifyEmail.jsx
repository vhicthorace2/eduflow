import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import api, { tokenStore, userStore } from '../api/client.js';

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return undefined;
    attempted.current = true;
    let cancelled = false;
    let redirectTimer;

    const verify = async () => {
      try {
        const data = await api.post(`/auth/verify-email/${token}`, {});
        if (cancelled) return;
        tokenStore.set(data.token);
        userStore.set(data.user);
        setStatus('success');
        setMessage(data.message || 'Your email address has been verified.');

        const role = data.user?.role;
        const destination =
          role === 'admin'
            ? '/adminDashboard'
            : role === 'instructor' || role === 'lecturer'
              ? '/instructorDashboard'
              : '/studentDashboard';
        redirectTimer = setTimeout(() => navigate(destination), 2000);
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error.message || 'This verification link is invalid or has expired.');
      }
    };

    verify();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [token, navigate]);

  return (
    <div className='min-h-screen bg-page text-content'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 bg-dot-grid opacity-50' />
        <Navbar landing />

        <div className='relative mx-auto flex max-w-7xl items-center justify-center px-6 pb-24 pt-36 sm:px-8 lg:px-16'>
          <div className='shadow-panel w-full max-w-md rounded-3xl border border-line-strong bg-page-solid p-8 text-center sm:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Email verification</p>

            {status === 'verifying' ? (
              <>
                <h1 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Verifying...</h1>
                <p className='mt-3 text-sm leading-6 text-muted'>{message}</p>
              </>
            ) : null}

            {status === 'success' ? (
              <>
                <h1 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Email verified</h1>
                <p className='mt-3 text-sm leading-6 text-muted'>{message}</p>
                <p className='mt-2 text-sm leading-6 text-muted'>Taking you to your dashboard...</p>
              </>
            ) : null}

            {status === 'error' ? (
              <>
                <h1 className='tracking-display font-display mt-3 text-3xl font-medium sm:text-4xl'>Verification failed</h1>
                <p className='mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger'>
                  {message}
                </p>
                <Link
                  to='/login'
                  className='mt-6 inline-block w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--page)] shadow-xl shadow-orange-500/20 transition hover:opacity-90'
                >
                  Back to sign in
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default VerifyEmail;
