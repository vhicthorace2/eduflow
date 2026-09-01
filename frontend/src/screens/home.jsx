import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';
import Reveal from '../component/reveal.jsx';
import heroImg from '../assets/hero.jpg';
import { courseCover } from '../component/courseCovers.js';

const stats = [
  { value: 12, suffix: '+', label: 'Expert-led courses' },
  { value: 250, suffix: '+', label: 'Students enrolled' },
  { value: 95, suffix: '%', label: 'Completion rate' },
  { value: 24, suffix: '/7', label: 'Learning access' },
];

const courses = [
  {
    index: '01',
    title: 'Backend Web Application Development',
    text: 'REST APIs to database integration with Spring Boot.',
    tag: 'Second Semester',
    cover: 'backend',
  },
  {
    index: '02',
    title: 'Game Development',
    text: 'From core mechanics to polished builds in Unity.',
    tag: 'Second Semester',
    cover: 'unity',
  },

];

const features = [
  {
    title: 'Curated Curriculum',
    text: 'University-grade content structured around the Software Engineering syllabus and reviewed by the department.',
  },
  {
    title: 'Progress Tracking',
    text: 'Follow mastery across every module with live dashboards, grades, and tailored recommendations.',
  },
  {
    title: 'Expert Instructors',
    text: 'Learn directly from industry practitioners and senior lecturers who bring real projects into the classroom.',
  },
  {
    title: 'Adaptive Assessments',
    text: 'AI-assisted quizzes that grade instantly and recommend the next best lesson based on your performance.',
  },
  {
    title: 'Collaborative Forums',
    text: 'Discuss assignments, share solutions, and get help from classmates and instructors in one place.',
  },

];

const steps = [
  { num: '01', title: 'Create your account', text: 'Sign up as a student or instructor in under a minute.' },
  { num: '02', title: 'Enrol in a course', text: 'Pick from the semester catalogue and join your cohort.' },
  { num: '03', title: 'Learn and assess', text: 'Work through modules, take AI-graded quizzes, track progress.' },
  { num: '04', title: 'Grow your path', text: 'Get recommendations and level up across the curriculum.' },
];

const testimonials = [
  {
    quote: 'EduFlow changed how our department delivers coursework making learning and teaching easier. Everything is in one place and my students are more engaged than ever.',
    name: 'Dr.(Mrs) Elei Florence',
    role: 'Lecturer, Software Engineering',
  },
  {
    quote: 'The adaptive quizzes and instant feedback made studying for exams genuinely effortless.',
    name: 'Alugbue Obinna Kennedy',
    role: 'Final Year Student',
  },
  {
    quote: 'A polished, modern platform that finally matches how students actually learn today.',
    name: 'Dr. Charles Ikerionwu',
    role: 'Head of Department',
  },
];

function Counter({ value, suffix = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(() => {
    if (typeof window === 'undefined') return value;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof window.IntersectionObserver === 'undefined') return value;
    return 0;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    let raf;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((e) => e.isIntersecting)) return;
        started = true;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const step = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * value));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function Home() {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-page font-sans text-content'>
      <Navbar landing />

      {/* Hero */}
      <section className='relative overflow-hidden'>
        <div className='absolute inset-0 bg-dot-grid opacity-60' aria-hidden='true' />
        <div className='absolute inset-y-0 right-0 hidden w-px bg-line lg:block' aria-hidden='true' />

        <div className='relative mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-40 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-32 lg:pt-48'>
          <div className='lg:col-span-7'>
            <Reveal>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <p className='inline-flex items-center gap-2.5 text-sm font-semibold text-accent-mid'>
                  <span className='h-2 w-2 rounded-full bg-accent' />
                  Software Engineering Department
                </p>
                <p className='text-xs font-medium uppercase tracking-[0.2em] text-faint'>Est. 2026</p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className='tracking-display font-display mt-8 text-[2.9rem] font-medium leading-[1.02] sm:text-6xl lg:text-7xl xl:text-[5.25rem]'>
                Software engineering,
                <br />
                learned with <em className='font-medium italic text-accent'>purpose</em>.
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className='mt-7 max-w-xl text-lg leading-8 text-secondary'>
                A curated collection of university-grade courses, adaptive assessments, and instructors
                who care about your progress — built for the way software engineers actually learn.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className='mt-10 flex flex-col gap-4 sm:flex-row'>
                <button
                  onClick={() => navigate('/signup')}
                  className='rounded-full bg-[var(--content)] px-8 py-4 text-base font-semibold text-[var(--page)] shadow-2xl transition hover:-translate-y-0.5 hover:opacity-90'
                >
                  Get Started Today
                </button>
                <button
                  onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className='rounded-full border border-line-strong bg-page-solid px-8 py-4 text-base font-semibold text-content transition hover:-translate-y-0.5 hover:border-accent'
                >
                  See the curriculum
                </button>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className='rule-h mt-14 flex flex-wrap items-center justify-between gap-2 pt-6 text-xs font-medium uppercase tracking-[0.2em] text-faint'>
                <span>Adaptive assessments</span>
                <span className='h-1 w-1 rounded-full bg-accent opacity-60' />
                <span>Live progress</span>
                <span className='h-1 w-1 rounded-full bg-accent opacity-60' />
                <span>Faculty reviewed</span>
              </div>
            </Reveal>
          </div>

          {/* Editorial curriculum index */}
          <div className='lg:col-span-5'>
            <Reveal delay={200}>
              <figure className='border-line-strong shadow-panel overflow-hidden border bg-page-solid '>
                <img
                  src={heroImg}
                  alt='Software engineering students collaborating in the lab'
                  className='aspect-[16/10] w-full object-cover'
                  loading='eager'
                />
                <figcaption className='rule-h-strong flex items-center justify-between gap-3 px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-faint'>
                  <span>Software Engineering Lab</span>
                  <span className='text-accent'>Est. 2026</span>
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={280}>
              <aside className='border-line-strong shadow-panel mt-6 border bg-page-solid'>
                <header className='rule-h-strong flex items-center justify-between border-b border-line px-7 py-5'>
                  <p className='text-sm font-semibold uppercase tracking-[0.2em] text-accent-mid'>The curriculum</p>
                  <p className='text-xs font-medium text-faint'>This semester</p>
                </header>

                <ul className='divide-y divide-line'>
                  {courses.map((course) => (
                    <li key={course.index}>
                      <button
                        onClick={() => navigate('/courses')}
                        className='group flex w-full items-start gap-6 px-7 py-6 text-left transition hover:bg-[var(--card-hover)]'
                      >
                        <span className='font-display text-sm font-semibold text-faint transition-colors group-hover:text-accent'>
                          {course.index}
                        </span>
                        <span className='min-w-0 flex-1'>
                          <span className='block text-base font-semibold text-content'>{course.title}</span>
                          <span className='mt-1 block text-sm leading-6 text-muted'>{course.text}</span>
                          <span className='mt-2 inline-block rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-faint'>
                            {course.tag}
                          </span>
                        </span>
                        <span className='mt-1 text-lg text-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent'>
                          &rarr;
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <footer className='rule-h-strong border-t border-line px-7 py-5'>
                  <button
                    onClick={() => navigate('/courses')}
                    className='text-sm font-semibold text-accent transition hover:text-accent-soft'
                  >
                    View all courses &rarr;
                  </button>
                </footer>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Proof band */}
      <section className='border-y border-line bg-page-solid'>
        <div className='mx-auto max-w-7xl px-6 lg:px-8'>
          <div className='grid grid-cols-2 lg:grid-cols-4'>
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 70} className='px-5 py-10 text-center sm:px-8 sm:border-l sm:border-line sm:first:border-l-0 lg:px-6'>
                <p className='tracking-display font-display text-4xl font-semibold text-content sm:text-5xl'>
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className='mt-2 text-sm font-medium text-muted'>{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className='mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32'>
        <div className='grid gap-12 lg:grid-cols-12 lg:gap-8'>
          <div className='lg:col-span-4'>
            <Reveal>
              <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Your journey</p>
              <h2 className='tracking-display font-display mt-4 text-4xl font-medium leading-[1.05] sm:text-5xl'>
                Four steps to a stronger semester.
              </h2>
            </Reveal>
          </div>

          <div className='lg:col-span-8'>
            <ol className='rule-h divide-y divide-line border-b border-line'>
              {steps.map((step, i) => (
                <Reveal as='li' key={step.num} delay={i * 80}>
                  <div className='group grid gap-4 py-8 transition-colors sm:grid-cols-[5rem_1fr] sm:gap-10 lg:px-6'>
                    <span className='tracking-display font-display text-4xl font-semibold text-faint transition-colors group-hover:text-accent'>
                      {step.num}
                    </span>
                    <div>
                      <h3 className='text-xl font-semibold text-content'>{step.title}</h3>
                      <p className='mt-2 max-w-lg leading-7 text-muted'>{step.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section id='curriculum' className='scroll-mt-24 border-y border-line bg-page-solid'>
        <div className='mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32'>
          <Reveal>
            <div className='grid gap-6 lg:grid-cols-12 lg:items-end'>
              <div className='lg:col-span-8'>
                <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>This semester</p>
                <h2 className='tracking-display font-display mt-4 text-4xl font-medium leading-[1.05] sm:text-5xl'>
                  Courses to be offered this semester.
                </h2>
              </div>
              <div className='lg:col-span-4 lg:text-right'>
                <button
                  onClick={() => navigate('/courses')}
                  className='text-sm font-semibold text-accent transition hover:text-accent-soft'
                >
                  View the full catalogue &rarr;
                </button>
              </div>
            </div>
          </Reveal>

          <div className='rule-h mt-14 divide-y divide-line'>
            {courses.map((course) => (
              <Reveal key={course.index}>
                <button
                  onClick={() => navigate('/courses')}
                  className='group grid w-full items-center gap-4 py-8 text-left sm:grid-cols-12 sm:gap-8'
                >
                  <span className='font-display text-sm font-semibold text-faint sm:col-span-1 transition-colors group-hover:text-accent'>
                    {course.index}
                  </span>
                  <span className='hidden sm:col-span-3 sm:block lg:col-span-3'>
                    <img
                      src={courseCover(course.cover)}
                      alt={`${course.title} cover`}
                      className='aspect-[16/9] w-full object-cover transition-opacity duration-300 group-hover:opacity-80'
                      loading='lazy'
                    />
                  </span>
                  <span className='sm:col-span-6 lg:col-span-6'>
                    <span className='tracking-display font-display block text-2xl font-medium leading-snug text-content transition-colors group-hover:text-accent sm:text-3xl'>
                      {course.title}
                    </span>
                    <span className='mt-2 block max-w-2xl leading-7 text-muted'>{course.text}</span>
                  </span>
                  <span className='flex items-center gap-4 sm:col-span-2 sm:justify-between lg:col-span-2'>
                    <span className='rounded-full border border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-faint'>
                      {course.tag}
                    </span>
                    <span className='text-lg text-faint transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-accent'>
                      &rarr;
                    </span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why EduFlow */}
      <section className='mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32'>
        <div className='grid gap-12 lg:grid-cols-12 lg:gap-8'>
          <div className='lg:col-span-4'>
            <div className='lg:sticky lg:top-28'>
              <Reveal>
                <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Why EduFlow</p>
                <h2 className='tracking-display font-display mt-4 text-4xl font-medium leading-[1.05] sm:text-5xl'>
                  Everything a modern learner needs.
                </h2>
                <p className='mt-5 max-w-md leading-8 text-muted'>
                  Designed for the Software Engineering department — built around how students actually learn.
                </p>
              </Reveal>
            </div>
          </div>

          <div className='lg:col-span-8'>
            <div className='rule-h divide-y divide-line border-b border-line'>
              {features.map((feature, i) => (
                <Reveal key={feature.title} delay={i * 60}>
                  <div className='group grid gap-4 py-7 transition-colors sm:grid-cols-[3rem_1fr] sm:gap-8 lg:px-4'>
                    <span className='font-display text-sm font-semibold text-faint transition-colors group-hover:text-accent'>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className='text-lg font-semibold text-content'>{feature.title}</h3>
                      <p className='mt-1.5 max-w-xl leading-7 text-muted'>{feature.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className='border-t border-line bg-page-solid'>
        <div className='mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32'>
          <Reveal>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Testimonials</p>
            <h2 className='tracking-display font-display mt-4 max-w-2xl text-4xl font-medium leading-[1.05] sm:text-5xl'>
              Trusted by students and department.
            </h2>
          </Reveal>

          <div className='rule-h mt-16 grid gap-px lg:grid-cols-3'>
            {testimonials.map((testimonial, i) => (
              <Reveal key={testimonial.name} delay={i * 90} className='border-line lg:border-l lg:first:border-l-0 lg:px-10 lg:first:pl-0 lg:last:pr-0 py-8 lg:py-0'>
                <blockquote className='flex h-full flex-col'>
                  <span aria-hidden='true' className='font-display block text-5xl leading-none text-accent'>
                    &ldquo;
                  </span>
                  <p className='mt-4 flex-1 text-lg leading-8 text-secondary'>{testimonial.quote}</p>
                  <figcaption className='mt-8 border-t border-line pt-6'>
                    <p className='font-semibold text-content'>{testimonial.name}</p>
                    <p className='mt-1 text-sm text-muted'>{testimonial.role}</p>
                  </figcaption>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className='mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32'>
        <Reveal>
          <div className='bg-hero-band rounded-full shadow-panel border border-line px-8 py-20 text-center sm:px-16 lg:py-28'>
            <h2 className='tracking-display font-display mx-auto max-w-3xl text-4xl font-medium leading-[1.05] sm:text-6xl'>
              Ready to start your journey?
            </h2>
            <p className='mx-auto mt-5 max-w-2xl text-lg leading-8 text-secondary'>
              Join Software Engineering students who have already improved their academics through our learning platform.
            </p>
            <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <button
                onClick={() => navigate('/signup')}
                className='rounded-full bg-[var(--content)] px-8 py-4 text-base font-semibold text-[var(--page)] shadow-2xl transition hover:-translate-y-0.5 hover:opacity-90'
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate('/login')}
                className='rounded-full border border-line-strong bg-page-solid px-8 py-4 text-base font-semibold text-content transition hover:-translate-y-0.5 hover:border-accent'
              >
                Sign in
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}

export default Home;