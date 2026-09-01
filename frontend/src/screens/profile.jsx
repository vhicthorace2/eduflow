import { useEffect, useState } from 'react';
import api, { tokenStore, userStore } from '../api/client.js';
import Navbar from '../component/navigation.jsx';
import BackButton from '../component/backButton.jsx';
import avatarImg from '../assets/avatar-m.jpg';

function Profile() {
  const [user, setUser] = useState(userStore.get());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenStore.get()) {
      return;
    }
    let active = true;
    api.get('/auth/me')
      .then((data) => {
        if (active) {
          setUser(data.user);
          userStore.set(data.user);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load profile');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (!tokenStore.get() && !user) {
    return (
      <div className='relative min-h-screen bg-page px-6 py-10 text-content sm:px-8 lg:px-16'>
        <Navbar />
        <div className='relative mx-auto mt-32 max-w-6xl'>
          <div className='rounded-3xl border border-line bg-card p-8 shadow-2xl backdrop-blur-xl'>
            <h1 className='font-display text-3xl font-semibold tracking-tight'>Not signed in</h1>
            <p className='mt-2 text-muted'>Please sign in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen bg-page px-6 py-10 text-content sm:px-8 lg:px-16'>
      <div className='pointer-events-none absolute -right-40 top-20 h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-[130px]' />
      <Navbar />

      <div className='relative mx-auto mt-32 max-w-6xl'>
        <BackButton className='mb-6' />
        <div className='overflow-hidden rounded-3xl border border-line bg-card shadow-2xl backdrop-blur-xl'>
          <div className='relative bg-hero-dark px-8 py-12 text-white sm:px-10 lg:px-12'>
            <div className='pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-orange-400/20 blur-[80px]' />
            <div className='relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
              <div className='flex items-center gap-6'>
                <div className='h-24 w-24 overflow-hidden rounded-full border border-white/30 shadow-lg'>
                  <img
                    src={avatarImg}
                    alt={`${user?.name || 'User'} profile photo`}
                    className='h-full w-full object-cover'
                    loading='lazy'
                  />
                </div>
                <div>
                  <h1 className='font-display text-3xl font-semibold tracking-tight'>{user?.name || 'Loading...'}</h1>
                  <p className='mt-2 capitalize text-orange-200'>{user?.role || ''}</p>
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-6 p-8 lg:grid-cols-[1.2fr_0.8fr]'>
            {error && (
              <div className='rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-danger'>{error}</div>
            )}

            {loading && <div className='rounded-2xl border border-line bg-card-deep p-6 text-muted'>Loading profile...</div>}

            {!loading && !error && user && (
              <>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-line bg-card-deep p-6'>
                    <h2 className='text-lg font-semibold'>Personal Information</h2>
                    <div className='mt-4 grid gap-4 md:grid-cols-2'>
                      <div>
                        <p className='text-sm font-medium text-muted'>Full Name</p>
                        <p className='mt-1 text-sm text-secondary'>{user.name}</p>
                      </div>
                      <div>
                        <p className='text-sm font-medium text-muted'>Email</p>
                        <p className='mt-1 text-sm text-secondary'>{user.email}</p>
                      </div>
                      <div>
                        <p className='text-sm font-medium text-muted'>Role</p>
                        <p className='mt-1 text-sm capitalize text-secondary'>{user.role}</p>
                      </div>
                      {user.forumPostCount !== undefined && user.forumPostCount !== null && (
                        <div>
                          <p className='text-sm font-medium text-muted'>Forum Posts</p>
                          <p className='mt-1 text-sm text-secondary'>{user.forumPostCount}</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
