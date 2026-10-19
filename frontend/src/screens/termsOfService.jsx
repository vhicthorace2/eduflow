import Navbar from '../component/navigation.jsx';
import Footer from '../component/footer.jsx';

const headingClass = 'font-display mt-10 text-xl font-semibold tracking-tight text-content sm:text-2xl';
const bodyClass = 'mt-3 text-sm leading-7 text-muted';
const listClass = 'mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted';

function TermsOfService() {
  return (
    <div className='min-h-screen bg-page text-content'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 bg-dot-grid opacity-50' />
        <Navbar landing />

        <div className='relative mx-auto max-w-3xl px-6 pb-24 pt-36 sm:px-8 lg:px-16'>
          <p className='text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid'>Legal</p>
          <h1 className='tracking-display font-display mt-3 text-4xl font-medium sm:text-5xl'>Terms of Service</h1>
          <p className='mt-3 text-sm text-muted'>Last updated: October 19, 2026</p>

          <div className='shadow-panel mt-10 rounded-3xl border border-line-strong bg-page-solid p-8 sm:p-10'>
            <p className={bodyClass}>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of EduFlow (the
              &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these Terms. If you
              do not agree, do not use the Service.
            </p>

            <h2 className={headingClass}>1. Eligibility</h2>
            <p className={bodyClass}>
              You must be able to form a binding contract and meet the minimum age required in your jurisdiction to
              use the Service. If you use EduFlow on behalf of an institution, you represent that you have
              authority to bind that institution to these Terms.
            </p>

            <h2 className={headingClass}>2. Your Account</h2>
            <ul className={listClass}>
              <li>You agree to provide accurate information and to keep it up to date.</li>
              <li>New accounts must verify their email address before signing in. You are responsible for the activity that occurs under your account.</li>
              <li>Keep your password confidential. If you sign in with Google, you are responsible for the security of that Google account.</li>
              <li>Notify us promptly if you suspect any unauthorized use of your account.</li>
            </ul>

            <h2 className={headingClass}>3. Acceptable Use</h2>
            <p className={bodyClass}>You agree not to:</p>
            <ul className={listClass}>
              <li>Break any applicable law or infringe the rights of others.</li>
              <li>Attempt to access accounts, data, or systems you are not authorized to access, or interfere with the operation of the Service.</li>
              <li>Upload malicious code, scrape the Service, or use automated means to access it without our permission.</li>
              <li>Harass, threaten, or impersonate others, or post content that is unlawful, hateful, or misleading.</li>
              <li>Cheat on assessments, misrepresent your identity, or submit work that is not your own where independent work is required.</li>
            </ul>

            <h2 className={headingClass}>4. Courses, Content, and Intellectual Property</h2>
            <p className={bodyClass}>
              The Service, including its courses, materials, software, and design, is owned by EduFlow or its
              licensors and is protected by intellectual property laws. We grant you a limited, non-exclusive,
              non-transferable, revocable license to use the Service for your personal, non-commercial educational
              purposes. You may not copy, redistribute, sell, or create derivative works from the content except as
              expressly permitted.
            </p>

            <h2 className={headingClass}>5. Assessments and Academic Integrity</h2>
            <p className={bodyClass}>
              Some features, including placement assessments, quizzes, and personalized recommendations, are
              generated or supported by automated and artificial intelligence systems. These results are provided
              for guidance and may contain inaccuracies. They are not a substitute for instructor judgment, and
              you agree to use them honestly and in accordance with your institution&rsquo;s academic integrity
              policies.
            </p>

            <h2 className={headingClass}>6. Your Content</h2>
            <p className={bodyClass}>
              You retain ownership of the content you submit, such as messages, posts, and assignment submissions.
              By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to host, store,
              display, and process that content solely to operate and improve the Service. You are responsible for
              ensuring you have the rights to any content you submit.
            </p>

            <h2 className={headingClass}>7. Third-Party Services</h2>
            <p className={bodyClass}>
              The Service integrates with third parties, such as Google for sign-in and external providers for
              email and media. Your use of those services is subject to their own terms and policies, and we are
              not responsible for them.
            </p>

            <h2 className={headingClass}>8. Fees</h2>
            <p className={bodyClass}>
              The Service is currently provided free of charge. If we introduce paid features, we will present the
              applicable terms and pricing to you before you incur any charges.
            </p>

            <h2 className={headingClass}>9. Termination</h2>
            <p className={bodyClass}>
              We may suspend or terminate your access to the Service if you violate these Terms or if we need to
              protect the Service or its users. You may stop using the Service and delete your account at any time.
              Provisions that by their nature should survive termination will do so.
            </p>

            <h2 className={headingClass}>10. Disclaimers</h2>
            <p className={bodyClass}>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
              kind, whether express or implied, including fitness for a particular purpose and non-infringement. We
              do not warrant that the Service will be uninterrupted, error-free, or completely secure.
            </p>

            <h2 className={headingClass}>11. Limitation of Liability</h2>
            <p className={bodyClass}>
              To the maximum extent permitted by law, EduFlow and its operators will not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or
              goodwill arising from your use of the Service.
            </p>

            <h2 className={headingClass}>12. Governing Law</h2>
            <p className={bodyClass}>
              These Terms are governed by the laws of {' '}
              <span className='font-semibold text-secondary'>[governing jurisdiction]</span>, without regard to its
              conflict-of-laws rules. Any disputes will be subject to the exclusive jurisdiction of the courts
              located there.
            </p>

            <h2 className={headingClass}>13. Changes to These Terms</h2>
            <p className={bodyClass}>
              We may update these Terms from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
              date above. Continued use of the Service after changes take effect means you accept the updated
              Terms.
            </p>

            <h2 className={headingClass}>14. Contact Us</h2>
            <p className={bodyClass}>
              If you have questions about these Terms, contact us at {' '}
              <span className='font-semibold text-secondary'>[contact email]</span>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default TermsOfService;
