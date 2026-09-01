import { Link } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import oopsImg from '../assets/oops.png';

function NotFound() {
  return (
    <div className="relative min-h-screen bg-page px-6 py-16 text-content sm:px-8 lg:px-16">
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-[130px]" />
      <Navbar />
      <div className="relative mx-auto mt-28 flex max-w-5xl flex-col items-center rounded-3xl border border-line bg-card px-8 py-16 text-center shadow-2xl backdrop-blur-xl sm:px-12 lg:px-16">
        <div className="h-44 w-44 overflow-hidden rounded-full border border-orange-400/30 bg-orange-400/10">
          <img src={oopsImg} alt="404 — lost in the curriculum" className="h-full w-full object-cover" />
        </div>

        <h1 className="font-display mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">Eduflow is not here</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Oops, the page you are looking for may have been moved, deleted, or never existed.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="rounded-full bg-[var(--content)] px-6 py-3 font-semibold text-[var(--page)] shadow-xl transition hover:opacity-90"
          >
            Go back home
          </Link>
          <Link
            to="/courses"
            className="rounded-full border border-line-strong bg-card-strong px-6 py-3 font-semibold text-content backdrop-blur-md transition hover:bg-card-hover"
          >
            Browse courses
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
