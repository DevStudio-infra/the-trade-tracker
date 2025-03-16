"use client";

import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100%,#3b82f6,transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_80%_60%,rgba(59,130,246,0.2),transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_20%_40%,rgba(59,130,246,0.1),transparent)] opacity-30 dark:opacity-100" />
      </div>

      <div className="container relative py-24">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mx-auto max-w-[800px]">
          <h1 className="text-4xl font-bold tracking-tighter text-black dark:text-white sm:text-5xl md:text-6xl text-center">Terms of Service</h1>
          <p className="mt-6 text-xl text-black/70 dark:text-white/70 text-center">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </motion.div>

        {/* Content Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-16 max-w-[800px] rounded-2xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 bg-black/5 p-8 backdrop-blur-xl md:p-12">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-black dark:text-white">1. Introduction</h2>
            <p className="text-black/70 dark:text-white/70">
              Welcome to Trade Tracker (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of our
              website, applications, and services (collectively, the &quot;Services&quot;). By accessing or using our Services, you agree to be bound by these Terms. If you do not
              agree to these Terms, you may not access or use the Services.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">2. Use of Services</h2>
            <p className="text-black/70 dark:text-white/70">Our platform provides AI-powered trading analysis and signals. You acknowledge and agree that:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Trading involves substantial risk, including possible loss of principal.</li>
              <li>Our signals and analysis are not financial advice and should not be construed as such.</li>
              <li>We do not guarantee profits or particular results from using our Services.</li>
              <li>You are solely responsible for your trading decisions and any resulting gains or losses.</li>
              <li>Past performance is not indicative of future results.</li>
            </ul>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">3. User Accounts</h2>
            <p className="text-black/70 dark:text-white/70">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain and promptly update your account information.</li>
              <li>Notify us immediately of any unauthorized use of your account or any other breach of security.</li>
              <li>Ensure that you exit from your account at the end of each session.</li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">
              We reserve the right to disable any user account at any time, including if we believe you have violated these Terms.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">4. Subscription and Payments</h2>
            <p className="text-black/70 dark:text-white/70">We offer free and paid subscription plans. By purchasing a subscription, you agree to the following:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>You authorize us to charge the applicable fees to your designated payment method.</li>
              <li>Subscriptions automatically renew unless canceled before the renewal date.</li>
              <li>All fees are non-refundable except as expressly provided in these Terms.</li>
              <li>We may change our fees upon notice, with changes taking effect at the next billing cycle.</li>
              <li>You are responsible for all applicable taxes in addition to the subscription fees.</li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">You may cancel your subscription at any time, but no refunds will be provided for partial subscription periods.</p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">5. Intellectual Property</h2>
            <p className="text-black/70 dark:text-white/70">
              All content and materials available on Trade Tracker, including but not limited to text, graphics, logos, icons, images, software, code, data, and the design,
              selection, and arrangement thereof, are the property of Trade Tracker or our licensors and are protected by copyright, trademark, and other intellectual property
              laws.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material
              on our Services, except as follows:
            </p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Your computer may temporarily store copies of such materials incidental to your accessing and viewing those materials.</li>
              <li>You may store files that are automatically cached by your web browser for display enhancement purposes.</li>
              <li>
                You may print or download one copy of a reasonable number of pages of the website for your own personal, non-commercial use and not for further reproduction,
                publication, or distribution.
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">6. User Content</h2>
            <p className="text-black/70 dark:text-white/70">
              You retain ownership of any content you submit to our Services (&quot;User Content&quot;). By providing User Content, you grant us a worldwide, non-exclusive,
              royalty-free license to use, reproduce, modify, adapt, publish, translate, distribute, and display such User Content in connection with providing and promoting the
              Services.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">You represent and warrant that:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>You own or have the necessary rights to your User Content.</li>
              <li>Your User Content does not violate the privacy rights, publicity rights, copyright, contractual rights, or any other rights of any person or entity.</li>
              <li>
                Your User Content does not contain any material that is defamatory, obscene, indecent, abusive, offensive, harassing, violent, hateful, inflammatory, or otherwise
                objectionable.
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">7. Limitation of Liability</h2>
            <p className="text-black/70 dark:text-white/70">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADE TRACKER AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, AND ASSIGNS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER
              INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>YOUR ACCESS TO OR USE OF, OR INABILITY TO ACCESS OR USE, THE SERVICES;</li>
              <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES;</li>
              <li>ANY CONTENT OBTAINED FROM THE SERVICES;</li>
              <li>UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT;</li>
              <li>TRADING DECISIONS MADE BASED ON INFORMATION PROVIDED BY OUR SERVICES.</li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT PAID BY YOU, IF ANY, FOR ACCESSING OR USING OUR SERVICES DURING THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">8. Disclaimer of Warranties</h2>
            <p className="text-black/70 dark:text-white/70">
              THE SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TRADE TRACKER
              DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, OR THAT ANY DEFECTS WILL BE CORRECTED. WE MAKE NO WARRANTY REGARDING THE
              QUALITY, ACCURACY, TIMELINESS, TRUTHFULNESS, COMPLETENESS, OR RELIABILITY OF ANY CONTENT ON THE SERVICES.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">9. Indemnification</h2>
            <p className="text-black/70 dark:text-white/70">
              You agree to indemnify, defend, and hold harmless Trade Tracker and its officers, directors, employees, agents, affiliates, successors, and assigns from and against
              any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) that arise from or relate to:
            </p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Your use of the Services;</li>
              <li>Your violation of these Terms;</li>
              <li>Your violation of any rights of another person or entity;</li>
              <li>Your User Content.</li>
            </ul>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">10. Termination</h2>
            <p className="text-black/70 dark:text-white/70">
              We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason, including if you breach these
              Terms. Upon termination, your right to use the Services will immediately cease.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              All provisions of these Terms which by their nature should survive termination shall survive, including without limitation ownership provisions, warranty disclaimers,
              indemnity, and limitations of liability.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">11. Governing Law</h2>
            <p className="text-black/70 dark:text-white/70">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. You agree to submit
              to the personal and exclusive jurisdiction of the courts located within the United States for the resolution of any disputes.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">12. Changes to Terms</h2>
            <p className="text-black/70 dark:text-white/70">
              We may modify these Terms at any time by posting the revised Terms on our website. Your continued use of the Services after any such changes constitutes your
              acceptance of the new Terms. If you do not agree to the new Terms, you must stop using the Services.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">13. Severability</h2>
            <p className="text-black/70 dark:text-white/70">
              If any provision of these Terms is held to be invalid, illegal, or unenforceable, such provision shall be struck from these Terms, and the remaining provisions shall
              remain in full force and effect.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">14. Entire Agreement</h2>
            <p className="text-black/70 dark:text-white/70">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Trade Tracker regarding the Services and supersede all prior and
              contemporaneous agreements, proposals, or representations, written or oral.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">15. Contact Us</h2>
            <p className="text-black/70 dark:text-white/70">If you have any questions about these Terms, please contact us at support@trade-tracker.net.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
