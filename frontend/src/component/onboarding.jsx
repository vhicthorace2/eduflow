import { useState } from 'react';
import {
  SparklesIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { userStore } from '../api/client.js';

const STEPS = [
  {
    icon: SparklesIcon,
    title: 'Welcome to EduFlow',
    body: 'This is your learning home. Depending on your role — student, instructor, or admin — you get a tailored dashboard with everything one click away.',
  },
  {
    icon: AcademicCapIcon,
    title: 'Enroll in a course',
    body: 'Browse the course catalog and enroll with a quick 10-question placement check that matches you to the right starting level.',
  },
  {
    icon: BookOpenIcon,
    title: 'Learn your way',
    body: 'Pick a learning mode (text, audio, or video). The platform shapes most of your course content — about 70% — around how you like to learn.',
  },
  {
    icon: ChartBarIcon,
    title: 'Stay on track',
    body: 'Follow your progress, compare on the leaderboard, keep a consistency streak, and ask the AI assistant whenever you get stuck.',
  },
];

function OnboardingGuide() {
  const user = userStore.get();
  const storageKey = user ? `eduflow_onboarding_${user.id}` : null;
  const [open, setOpen] = useState(() => {
    if (!user || !storageKey) return false;
    try {
      return localStorage.getItem(storageKey) !== '1';
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);

  const dismiss = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, '1');
      } catch {
        return;
      }
    }
    setOpen(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    setStep((s) => s + 1);
  };

  if (!user || !open) return null;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={dismiss} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-label={current.title} className="relative w-full max-w-md shadow-panel rounded-3xl border border-line bg-card p-8 text-content">
        <button
          type="button"
          aria-label="Dismiss onboarding"
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-card-hover hover:text-content"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20 text-accent-soft ring-1 ring-inset ring-orange-400/30">
          <current.icon className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-accent-mid">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="tracking-display font-display mt-2 text-2xl font-medium">{current.title}</h2>
        <p className="mt-3 leading-7 text-muted">{current.body}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-orange-400' : 'w-2 bg-line-strong'}`}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-card-hover hover:text-content"
          >
            Skip
          </button>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-line bg-card-deep px-4 py-2.5 text-sm font-medium text-secondary transition hover:bg-card-hover"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
            >
              {step >= STEPS.length - 1 ? 'Start learning' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingGuide;