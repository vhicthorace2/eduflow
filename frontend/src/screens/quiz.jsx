import Navbar from '../component/navigation';
import BackButton from '../component/backButton.jsx';
import notesImg from '../assets/notes.jpg';

function Quiz() {
  return (
    <div className="relative min-h-screen bg-page px-6 py-10 text-content sm:px-8 lg:px-16">
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-[130px]" />
      <Navbar />
<div className="relative mx-auto mt-32 max-w-4xl">
        <figure className="border-line-strong shadow-panel overflow-hidden border bg-page-solid">
          <img
            src={notesImg}
            alt=""
            className="aspect-[21/9] w-full object-cover"
            loading="lazy"
          />
          <figcaption className="rule-h-strong flex items-center justify-between gap-3 px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-faint">
            <span>Assessment corner</span>
            <span className="text-accent">EduFlow</span>
          </figcaption>
        </figure>
        <div className="mt-6 rounded-3xl border border-line bg-card p-8 shadow-panel sm:p-10">
          <BackButton className="mb-6" />
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Quiz</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Weekly Assessment</h1>
        <p className="mt-3 text-muted">Answer the questions below to review your progress.</p>

        <div className="mt-10 space-y-4">
          <div className="rounded-2xl border border-line bg-card-deep p-5">
            <p className="font-semibold">1. What does React Router help you do?</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <label className="flex items-center gap-2"><input type="radio" name="q1" className="accent-orange-400" /> Navigate between pages</label>
              <label className="flex items-center gap-2"><input type="radio" name="q1" className="accent-orange-400" /> Style components</label>
              <label className="flex items-center gap-2"><input type="radio" name="q1" className="accent-orange-400" /> Connect to a database</label>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Quiz;
