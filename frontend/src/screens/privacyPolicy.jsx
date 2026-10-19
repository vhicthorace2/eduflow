import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';

const headingClass = 'font-display mt-10 text-xl font-semibold tracking-tight text-content sm:text-2xl';
const subheadingClass = 'mt-6 text-sm font-semibold text-secondary';
const bodyClass = 'mt-3 text-sm leading-7 text-muted';
const listClass = 'mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted';

function PrivacyPolicy() {
  return (
    <div className='min-h-screen bg-page text-content'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 bg-dot-grid opacity-50' />
        <Navbar landing />

        <div className='relative mx-auto max-w-3xl px-6 pb-24 pt-36 sm:px-8 lg:px-16'>
          <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Legal</p>
          <h1 className='tracking-display font-display mt-3 text-4xl font-medium sm:text-5xl'>Privacy Policy</h1>
          <p className='mt-3 text-sm text-muted'>Last updated: October 19, 2026</p>

          <div className='shadow-panel mt-10 rounded-3xl border border-line-strong bg-page-solid p-8 sm:p-10'>
            <p className={bodyClass}>
              EduFlow (&ldquo;EduFlow&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is an
              education platform for students, instructors, and administrators. This Privacy Policy explains what
              information we collect, how we use it, and the choices you have. By using EduFlow you agree to the
              practices described here.
            </p>

            <h2 className={headingClass}>1. Information We Collect</h2>
            <h3 className={subheadingClass}>Information you provide</h3>
            <ul className={listClass}>
              <li>Account details such as your name, email address, password (stored as a secure hash), and role (student, instructor, or administrator).</li>
              <li>Profile information you choose to add, including an optional profile photo.</li>
              <li>Content you submit, such as messages, forum posts, assignment submissions, and assessment answers.</li>
            </ul>
            <h3 className={subheadingClass}>Information collected automatically</h3>
            <ul className={listClass}>
              <li>Learning activity, such as courses enrolled, modules viewed, time spent on content, and quiz or assessment results.</li>
              <li>Technical information such as browser type, device type, and general usage data needed to operate and secure the service.</li>
            </ul>
            <h3 className={subheadingClass}>Information from third parties</h3>
            <ul className={listClass}>
              <li>If you sign in with Google, we receive your name, email address, and profile identifier from Google. We do not receive your Google password.</li>
            </ul>

            <h2 className={headingClass}>2. How We Use Your Information</h2>
            <ul className={listClass}>
              <li>To create and manage your account, verify your email, and authenticate you when you sign in.</li>
              <li>To deliver courses, materials, assessments, progress tracking, and personalized recommendations.</li>
              <li>To communicate with you about your account, including password reset and email verification messages.</li>
              <li>To maintain the security, integrity, and reliability of the platform and to prevent misuse.</li>
              <li>To understand how the platform is used so we can improve it.</li>
            </ul>

            <h2 className={headingClass}>3. Cookies and Local Storage</h2>
            <p className={bodyClass}>
              EduFlow uses your browser&rsquo;s local storage to keep you signed in and to remember basic
              preferences such as theme (light or dark). We do not use local storage to serve third-party
              advertising. You can clear this data at any time through your browser settings, though you may be
              signed out as a result.
            </p>

            <h2 className={headingClass}>4. How We Share Information</h2>
            <p className={bodyClass}>
              We do not sell your personal information. We share it only with service providers that help us
              operate the platform, and only as needed to provide their services:
            </p>
            <ul className={listClass}>
              <li>Cloud hosting and database providers that store and serve the platform.</li>
              <li>Email delivery providers used to send verification and password reset messages.</li>
              <li>Google, when you choose to sign in with Google.</li>
              <li>Artificial intelligence providers that power assessment feedback and learning recommendations, to which relevant learning data may be submitted to generate those results.</li>
            </ul>
            <p className={bodyClass}>
              We may also disclose information where required by law, or to protect the rights, safety, and
              security of EduFlow and its users.
            </p>

            <h2 className={headingClass}>5. Data Retention</h2>
            <p className={bodyClass}>
              We retain your information for as long as your account is active or as needed to provide the
              service, comply with legal obligations, resolve disputes, and enforce our agreements. When it is no
              longer needed, we delete or anonymize it.
            </p>

            <h2 className={headingClass}>6. Security</h2>
            <p className={bodyClass}>
              We use reasonable technical and organizational measures to protect your information, including
              hashed passwords and encrypted connections. No method of transmission or storage is completely
              secure, so we cannot guarantee absolute security.
            </p>

            <h2 className={headingClass}>7. Your Rights</h2>
            <p className={bodyClass}>
              Depending on where you live, you may have the right to access, correct, update, or delete your
              personal information, or to object to or restrict certain processing. You can update much of your
              information from your account settings, and you can contact us to exercise these rights.
            </p>

            <h2 className={headingClass}>8. Children&rsquo;s Privacy</h2>
            <p className={bodyClass}>
              EduFlow is intended for use by students at the post-secondary level and is not directed to children
              under the age of 13. If you believe a child has provided us with personal information, please
              contact us so we can remove it.
            </p>

            <h2 className={headingClass}>9. International Transfers</h2>
            <p className={bodyClass}>
              Your information may be stored and processed in countries other than your own. Where required, we
              take steps to ensure your information receives an adequate level of protection.
            </p>

            <h2 className={headingClass}>10. Changes to This Policy</h2>
            <p className={bodyClass}>
              We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;Last
              updated&rdquo; date above. Continued use of EduFlow after changes take effect means you accept the
              updated policy.
            </p>

            <h2 className={headingClass}>11. Contact Us</h2>
            <p className={bodyClass}>
              If you have questions about this Privacy Policy or your personal information, contact us at {' '}
              <span className='font-semibold text-secondary'>[contact email]</span>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default PrivacyPolicy;
