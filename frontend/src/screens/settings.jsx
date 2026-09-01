import { useEffect, useRef, useState } from 'react';
import api, { userStore, tokenStore } from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { useTheme } from '../component/themeContext.js';
import ThemeToggle from '../component/theme.jsx';
import PasswordInput from '../component/passwordInput.jsx';
import avatarImg from '../assets/avatar-f.jpg';

const DEFAULT_NOTIFICATIONS = { email: true, push: false, digest: true };

const inputClass = 'w-full rounded-xl border border-line bg-card-deep px-4 py-3 text-sm text-content outline-none transition placeholder:text-muted focus:border-orange-400/50';
const labelClass = 'text-xs font-semibold uppercase tracking-[0.2em] text-faint';

function Settings() {
  const user = userStore.get();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    api
      .get('/settings/me')
      .then((data) => {
        if (!active) return;
        setProfile({
          name: data.user?.name || '',
          email: data.user?.email || '',
        });
        setAvatar(data.user?.avatar || null);
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(data.user?.preferences || {}) });
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const showMessage = (text) => {
    setError('');
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3000);
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    setPendingAvatar(URL.createObjectURL(file));
    setPendingAvatarFile(file);
    setError('');
  };

  const confirmAvatar = async () => {
    if (!pendingAvatarFile) return;
    setAvatarUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('avatar', pendingAvatarFile);
      const data = await api.put('/settings/me/avatar', formData);
      setAvatar(data.user?.avatar || pendingAvatar);
      resetPendingAvatar();
      userStore.set({ ...user, avatar: data.user?.avatar || null });
      showMessage('Profile photo updated');
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const resetPendingAvatar = () => {
    if (pendingAvatar) URL.revokeObjectURL(pendingAvatar);
    setPendingAvatar(null);
    setPendingAvatarFile(null);
  };

  const avatarSrc = pendingAvatar || avatar || avatarImg;

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api.put('/settings/me', { name: profile.name, email: profile.email });
      userStore.set({ ...user, name: data.user.name, email: data.user.email });
      showMessage('Profile saved');
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (password.next !== password.confirm) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put('/settings/me', {
        currentPassword: password.current,
        password: password.next,
      });
      setPassword({ current: '', next: '', confirm: '' });
      showMessage('Password changed');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = async (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    setError('');
    try {
      await api.put('/settings/me', { preferences: next });
      showMessage('Notification preferences saved');
    } catch (err) {
      setNotifications(notifications);
      setError(err.message || 'Failed to save preferences');
    }
  };

  const handleSignOut = () => {
    tokenStore.clear();
    userStore.clear();
    window.location.href = '/login';
  };

  const roleLabel = (user?.role || 'student').replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -right-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <Sidebar />
      <div className="relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 md:ml-72">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <BackButton />
            <div className="mt-6 rounded-3xl border border-line bg-card p-8 shadow-2xl backdrop-blur-xl sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Settings</p>
              <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">Your preferences</h1>
              <p className="mt-3 text-muted">Manage your profile, appearance, and notifications.</p>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-accent-soft">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted">Loading settings...</p>
          ) : (
            <>
              {/* Profile layout */}
              <section className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Profile</h2>
                    <p className="mt-1 text-sm text-muted">Update your name and email address.</p>
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-orange-400/30">
                      <img
                        src={avatarSrc}
                        alt={`${profile.name || 'User'} profile photo`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold">{profile.name || 'Learner'}</h3>
                      <p className="truncate text-sm text-muted">{profile.email || 'your@email.com'}</p>
                      <span className="mt-2 inline-block rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-sm font-medium text-accent-soft">
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                    {pendingAvatar ? (
                      <>
                        <button
                          onClick={confirmAvatar}
                          disabled={avatarUploading}
                          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"
                        >
                          {avatarUploading ? 'Uploading...' : 'Use this photo'}
                        </button>
                        <button
                          onClick={resetPendingAvatar}
                          disabled={avatarUploading}
                          className="rounded-xl border border-line bg-card-deep px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-card-hover disabled:cursor-not-allowed disabled:text-muted"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                          className="rounded-xl border border-line bg-card-deep px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-card-hover"
                        >
                          Take photo
                        </button>
                        <button
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          className="rounded-xl border border-line bg-card-deep px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-card-hover"
                        >
                          Upload from device
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleAvatarSelect} />
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="settings-name">Full name</label>
                    <input
                      id="settings-name"
                      className={`${inputClass} mt-2`}
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="settings-email">Email address</label>
                    <input
                      id="settings-email"
                      type="email"
                      className={`${inputClass} mt-2`}
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {/* Appearance layout with embedded theme toggle */}
              <section className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Appearance</h2>
                    <p className="mt-1 text-sm text-muted">Choose how the platform looks for you.</p>
                  </div>
                  <ThemeToggle />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <button
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${
                      theme === 'dark'
                        ? 'border-orange-400/50 bg-orange-400/10'
                        : 'border-line bg-card-deep hover:border-orange-400/30 hover:bg-card-hover'
                    }`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white ring-1 ring-inset ring-slate-700">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                    </span>
                    <span>
                      <span className="block font-medium text-content">Dark mode</span>
                      <span className="block text-sm text-muted">Easier on the eyes at night.</span>
                    </span>
                    {theme === 'dark' && (
                      <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-accent">Active</span>
                    )}
                  </button>
                  <button
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${
                      theme === 'light'
                        ? 'border-orange-400/50 bg-orange-400/10'
                        : 'border-line bg-card-deep hover:border-orange-400/30 hover:bg-card-hover'
                    }`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    </span>
                    <span>
                      <span className="block font-medium text-content">Light mode</span>
                      <span className="block text-sm text-muted">Bright and clean during the day.</span>
                    </span>
                    {theme === 'light' && (
                      <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-accent">Active</span>
                    )}
                  </button>
                </div>
              </section>

              {/* Notifications layout */}
              <section className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <p className="mt-1 text-sm text-muted">Choose what you want to be notified about.</p>
                <div className="mt-6 space-y-3">
                  {[
                    { key: 'email', title: 'Email notifications', desc: 'Assignment deadlines and new course announcements.' },
                    { key: 'push', title: 'Push notifications', desc: 'Instant alerts in your browser.' },
                    { key: 'digest', title: 'Weekly digest', desc: 'A summary of your progress every week.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card-deep px-5 py-4">
                      <div>
                        <p className="font-medium text-secondary">{item.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => toggleNotification(item.key)}
                        role="switch"
                        aria-checked={notifications[item.key]}
                        aria-label={item.title}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${notifications[item.key] ? 'bg-orange-500' : 'bg-line-strong'}`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${notifications[item.key] ? 'left-[22px]' : 'left-0.5'}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Account layout */}
              <section className="rounded-3xl border border-line bg-card p-8 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Account</h2>
                <p className="mt-1 text-sm text-muted">Change your password or manage your session.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass} htmlFor="settings-current-password">Current password</label>
                    <PasswordInput
                      id="settings-current-password"
                      className={`${inputClass} mt-2`}
                      value={password.current}
                      onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="settings-new-password">New password</label>
                    <PasswordInput
                      id="settings-new-password"
                      className={`${inputClass} mt-2`}
                      value={password.next}
                      onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="settings-confirm-password">Confirm new password</label>
                    <PasswordInput
                      id="settings-confirm-password"
                      className={`${inputClass} mt-2`}
                      value={password.confirm}
                      onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={savePassword}
                    disabled={saving}
                    className="rounded-xl border border-line bg-card-deep px-5 py-3 text-sm font-semibold text-secondary transition hover:bg-card-hover disabled:cursor-not-allowed disabled:text-muted"
                  >
                    {saving ? 'Saving...' : 'Change password'}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-danger transition hover:bg-red-500/20"
                  >
                    Sign out
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
