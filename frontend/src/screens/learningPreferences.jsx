import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import { useSidebar } from '../component/useSidebar.js';
import BackButton from '../component/backButton.jsx';
import {
  BookOpenIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const MODE_OPTIONS = [
  {
    value: 'text',
    label: 'Text',
    icon: BookOpenIcon,
    blurb: 'Read documents, notes, links and written lectures.',
  },
  {
    value: 'audio',
    label: 'Audio',
    icon: SpeakerWaveIcon,
    blurb: 'Listen to audio lessons, podcasts and explanations.',
  },
  {
    value: 'video',
    label: 'Video',
    icon: VideoCameraIcon,
    blurb: 'Watch video lectures, demos and screencasts.',
  },
];

const modeLabel = (value) => {
  const match = MODE_OPTIONS.find((option) => option.value === value);
  return match ? match.label : null;
};

function LearningPreferences() {
  const { collapsed } = useSidebar();
  const [learningMode, setLearningMode] = useState(null);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/learner/model')
      .then((data) => {
        if (!active) return;
        const mode = data.model && data.model.profile ? data.model.profile.learningMode || null : null;
        setLearningMode(mode);
        setSelection(mode);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load your preferences');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (!selection || saving) return;
    setSaving(true);
    setError('');
    setJustSaved(false);
    try {
      const data = await api.put('/learner/preferences', { learningMode: selection });
      setLearningMode(data.learningMode);
      setJustSaved(true);
    } catch (err) {
      setError(err.message || 'Failed to save your preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <Sidebar />
      <div className={`relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 ${collapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <div className="mx-auto max-w-5xl space-y-6">
          <div><BackButton /></div>

          <div className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-accent-soft ring-1 ring-inset ring-orange-400/30">
                <AcademicCapIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Learner Profile</p>
                <h1 className="tracking-display font-display mt-1 text-3xl font-medium">Learning Preferences</h1>
                <p className="mt-1 text-sm text-muted">
                  {learningMode
                    ? `Your preferred way of learning is ${modeLabel(learningMode)}.`
                    : 'How do you like to learn? Pick what works best for you.'}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-muted">Loading your preferences...</p>
          ) : (
            <>
              {!learningMode ? (
                <p className="rounded-2xl border border-orange-400/40 bg-orange-500/10 px-5 py-3 text-sm text-content">
                  Let&apos;s get set up: choose your preferred mode of learning below so your recommendations match it.
                </p>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-3">
                {MODE_OPTIONS.map(({ value, label, icon: Icon, blurb }) => {
                  const selected = selection === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelection(value);
                        setJustSaved(false);
                      }}
                      aria-pressed={selected}
                      className={`group rounded-3xl border p-6 text-left transition ${
                        selected
                          ? 'border-orange-400/60 bg-orange-500/10 ring-1 ring-inset ring-orange-400/40'
                          : 'border-line bg-card hover:border-orange-400/40 hover:bg-card-hover'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                          selected
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-orange-500/15 text-accent-soft'
                        }`}>
                          <Icon className="h-6 w-6" />
                        </span>
                        {selected ? <CheckIcon className="h-5 w-5 text-accent" /> : null}
                      </div>
                      <p className="mt-5 font-semibold">{label}</p>
                      <p className="mt-1 text-sm text-muted">{blurb}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-line bg-card p-6 sm:flex-row sm:items-center">
                <p className="text-sm text-muted">
                  Your content recommendations are filtered to the style you pick.
                </p>
                <div className="flex items-center gap-4">
                  {justSaved ? <p className="text-sm text-accent">Saved.</p> : null}
                  <button
                    type="button"
                    onClick={save}
                    disabled={!selection || selection === learningMode || saving}
                    className="flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save preference'}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-danger">{error}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LearningPreferences;