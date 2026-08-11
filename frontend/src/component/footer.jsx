function Footer() {
  return (
    <footer className='border-t border-line bg-page-solid'>
      <div className='mx-auto max-w-7xl px-6 py-16 lg:px-8'>
        <div className='flex flex-col gap-12 lg:flex-row lg:justify-between'>
          <div className='max-w-md'>
            <h2 className='font-display text-2xl font-semibold tracking-tight text-content'>EduFlow</h2>
            <p className='mt-4 text-sm leading-7 text-muted'>
              Empowering students with modern learning tools, structured courses, and a seamless academic experience.
              Built for the Software Engineering department.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-10 sm:grid-cols-2'>
            <div>
              <h3 className='text-sm font-semibold uppercase tracking-[0.2em] text-faint'>Platform</h3>
              <ul className='mt-5 space-y-3 text-sm text-muted'>
                <li><a href='/' className='transition hover:text-accent'>Home</a></li>
                <li><a href='/courses' className='transition hover:text-accent'>Courses</a></li>
                <li><a href='/#courses' className='transition hover:text-accent'>Semester Courses</a></li>
              </ul>
            </div>

            <div>
              <h3 className='text-sm font-semibold uppercase tracking-[0.2em] text-faint'>Support</h3>
              <ul className='mt-5 space-y-3 text-sm text-muted'>
                <li><a href='#' className='transition hover:text-accent'>Help Center</a></li>
                <li><a href='#' className='transition hover:text-accent'>Contact Us</a></li>
                <li><a href='#' className='transition hover:text-accent'>FAQs</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className='mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-sm text-faint sm:flex-row'>
          <p>© 2026 EduFlow. All rights reserved.</p>
          <div className='flex gap-6'>
            <a href='#' className='transition hover:text-accent'>Privacy</a>
            <a href='#' className='transition hover:text-accent'>Terms</a>
            <a href='#' className='transition hover:text-accent'>About</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
