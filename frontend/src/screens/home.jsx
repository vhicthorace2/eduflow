import { useNavigate } from 'react-router-dom';
import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';

const stats = [
  { value: '12+', label: 'Expert-led courses' },
  { value: '250+', label: 'Students enrolled' },
  { value: '95%', label: 'Completion rate' },
  { value: '24/7', label: 'Learning access' },
];

const features = [
  {
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14v7',
    title: 'Curated Curriculum',
    text: 'University-grade content, structured around the Software Engineering syllabus and reviewed by faculty.',
  },
  {
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    title: 'Progress Tracking',
    text: 'Follow your mastery across every module with live dashboards, grades, and tailored recommendations.',
  },
  {
    icon: 'M8 10h8m-8 4h5m8-7a4 4 0 11-8 0 4 4 0 018 0z M6 17.5A5.5 5.5 0 0111.5 12h1a5.5 5.5 0 015.5 5.5V19a1 1 0 01-1 1H7a1 1 0 01-1-1v-1.5z',
    title: 'Expert Instructors',
    text: 'Learn directly from industry practitioners and senior faculty who bring real projects into the classroom.',
  },
  {
    icon: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z',
    title: 'Adaptive Assessments',
    text: 'AI-assisted quizzes that grade instantly and recommend the next best lesson based on your performance.',
  },
  {
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4-.84L3 20l1.2-3.6A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    title: 'Collaborative Forums',
    text: 'Discuss assignments, share solutions, and get help from classmates and instructors in one place.',
  },
  {
    icon: 'M5 13l4 4L19 7',
    title: 'Verified Achievement',
    text: 'Earn recognisable outcomes for every course completed, building a record you can take anywhere.',
  },
];

const courses = [
  {
    title: 'Backend Web Application Development',
    text: 'Learn backend development using the Spring Boot framework, from REST APIs to database integration.',
    tag: 'Second Semester',
  },
  {
    title: 'Game Development',
    text: 'Master game development with the Unity Game Engine — from core mechanics to polished builds.',
    tag: 'Second Semester',
  },
  {
    title: 'UI/UX Design Systems',
    text: 'A deep dive into creating sustainable design ecosystems for websites and mobile applications.',
    tag: 'Second Semester',
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
    quote: 'EduFlow changed how our department delivers coursework. Everything is in one place and my students are more engaged than ever.',
    name: 'Ada Mensah',
    role: 'Lecturer, Software Engineering',
  },
  {
    quote: 'The adaptive quizzes and instant feedback made studying for exams genuinely effortless.',
    name: 'Kofi Owusu',
    role: 'Final Year Student',
  },
  {
    quote: 'A polished, modern platform that finally matches how students actually learn today.',
    name: 'Dr. Charles Ikerionwu',
    role: 'Head of Department',
  },
];

function Home() {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-page font-sans text-content'>
      <Navbar landing />

      {/* Hero */}
      <section className='relative overflow-hidden'>
        <div className='pointer-events-none absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-emerald-500/20 blur-[120px]' />
        <div className='pointer-events-none absolute -right-40 top-40 h-[30rem] w-[30rem] rounded-full bg-teal-400/15 blur-[120px]' />
        <div className='pointer-events-none absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-slate-500/20 blur-[100px]' />

        <div className='relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-40 text-center lg:px-8'>
          <p className='mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-card-strong px-4 py-2 text-sm font-medium text-accent-soft backdrop-blur-md'>
            <span className='h-2 w-2 rounded-full bg-emerald-400' />
            Academic Excellence · Software Engineering Department
          </p>

          <h1 className='font-display max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl'>
            Unlock your future with{' '}
            <span className='text-gradient font-display'>expert-led education</span>
          </h1>

          <p className='mt-8 max-w-2xl text-lg leading-8 text-secondary sm:text-xl'>
            Master the skills of tomorrow with a curated collection of university-grade courses,
            adaptive assessments, and instructors who care about your progress.
          </p>

          <div className='mt-10 flex flex-col gap-4 sm:flex-row'>
            <button
              onClick={() => navigate('/signup')}
              className='rounded-full bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-2xl shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-100'
            >
              Get Started Today
            </button>
            <button
              onClick={() => navigate('/courses')}
              className='rounded-full border border-line-strong bg-card-strong px-8 py-4 text-base font-semibold text-content backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-card-hover'
            >
              Browse Courses
            </button>
          </div>

          {/* Glass stats bar */}
          <div className='mt-20 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line-strong bg-card backdrop-blur-xl sm:grid-cols-4'>
            {stats.map((stat) => (
              <div key={stat.label} className='bg-card-deep px-6 py-8 text-center'>
                <p className='font-display text-3xl font-semibold text-content sm:text-4xl'>{stat.value}</p>
                <p className='mt-2 text-sm text-muted'>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className='relative mx-auto max-w-7xl px-6 py-24 lg:px-8'>
        <div className='mx-auto max-w-2xl text-center'>
          <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Why EduFlow</p>
          <h2 className='font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Everything a modern learner needs
          </h2>
          <p className='mt-5 text-lg leading-8 text-muted'>
            Built for the Software Engineering department — designed around how students actually learn.
          </p>
        </div>

        <div className='mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature) => (
            <div
              key={feature.title}
              className='group rounded-3xl border border-line bg-card p-8 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-card-hover'
            >
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 ring-1 ring-inset ring-emerald-400/30 transition group-hover:bg-emerald-400/20'>
                <svg className='h-6 w-6 text-accent' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'>
                  <path d={feature.icon} />
                </svg>
              </div>
              <h3 className='mt-6 text-xl font-semibold text-content'>{feature.title}</h3>
              <p className='mt-3 leading-7 text-muted'>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Courses */}
      <section id='courses' className='relative mx-auto max-w-7xl px-6 py-24 lg:px-8'>
        <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
          <div className='max-w-xl'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>This Semester</p>
            <h2 className='font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
              Second Semester Courses
            </h2>
            <p className='mt-5 text-lg text-muted'>Courses to be offered this semester.</p>
          </div>
          <button
            onClick={() => navigate('/courses')}
            className='w-fit rounded-full border border-line-strong bg-card-strong px-6 py-3 text-sm font-semibold text-content backdrop-blur-md transition hover:bg-card-hover'
          >
            View all courses →
          </button>
        </div>

        <div className='mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {courses.map((course) => (
            <button
              key={course.title}
              onClick={() => navigate('/courses')}
              className='group relative overflow-hidden rounded-3xl border border-line bg-card p-8 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-card-hover'
            >
              <div className='absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl transition group-hover:bg-emerald-400/20' />
              <span className='inline-block rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent ring-1 ring-inset ring-emerald-400/30'>
                {course.tag}
              </span>
              <h3 className='mt-6 text-xl font-semibold leading-snug text-content'>{course.title}</h3>
              <p className='mt-3 leading-7 text-muted'>{course.text}</p>
              <p className='mt-6 text-sm font-semibold text-accent transition group-hover:translate-x-1'>
                Explore course →
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className='relative overflow-hidden'>
        <div className='pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-teal-400/10 blur-[120px]' />
        <div className='relative mx-auto max-w-7xl px-6 py-24 lg:px-8'>
          <div className='mx-auto max-w-2xl text-center'>
            <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Your Journey</p>
            <h2 className='font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
              How it works
            </h2>
          </div>

          <div className='mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
            {steps.map((step) => (
              <div
                key={step.num}
                className='relative rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'
              >
                <span className='font-display text-5xl font-semibold text-emerald-400/25'>{step.num}</span>
                <h3 className='mt-6 text-lg font-semibold text-content'>{step.title}</h3>
                <p className='mt-2 leading-7 text-muted'>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className='mx-auto max-w-7xl px-6 py-24 lg:px-8'>
        <div className='mx-auto max-w-2xl text-center'>
          <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Testimonials</p>
          <h2 className='font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Trusted by students and faculty
          </h2>
        </div>

        <div className='mt-16 grid gap-6 md:grid-cols-3'>
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className='flex flex-col rounded-3xl border border-line bg-card p-8 backdrop-blur-xl'
            >
              <div className='flex gap-1 text-amber-300'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M12 17.3l6.18 3.7-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
                  </svg>
                ))}
              </div>
              <blockquote className='mt-6 flex-1 leading-7 text-secondary'>“{testimonial.quote}”</blockquote>
              <figcaption className='mt-8 border-t border-line pt-6'>
                <p className='font-semibold text-content'>{testimonial.name}</p>
                <p className='mt-1 text-sm text-muted'>{testimonial.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className='mx-auto max-w-7xl px-6 pb-24 lg:px-8'>
        <div className='relative overflow-hidden rounded-[2.5rem] border border-line bg-hero-band px-8 py-20 text-center backdrop-blur-xl sm:px-16'>
          <div className='pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-[100px]' />
          <div className='pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-[100px]' />

          <div className='relative'>
            <h2 className='font-display mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl'>
              Ready to start your journey?
            </h2>
            <p className='mx-auto mt-5 max-w-2xl text-lg leading-8 text-secondary'>
              Join Software Engineering students who have already improved their academics through our learning platform.
            </p>
            <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <button
                onClick={() => navigate('/signup')}
                className='rounded-full bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-2xl transition hover:-translate-y-0.5 hover:bg-emerald-100'
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate('/login')}
                className='rounded-full border border-line-strong bg-card-strong px-8 py-4 text-base font-semibold text-content backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-card-hover'
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
