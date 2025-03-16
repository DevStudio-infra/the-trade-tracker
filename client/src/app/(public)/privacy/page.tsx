"use client";

import { motion } from "framer-motion";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold tracking-tighter text-black dark:text-white sm:text-5xl md:text-6xl text-center">Privacy Policy</h1>
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
              At Trade Tracker (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our website, applications, and services (collectively, the &quot;Services&quot;). Please read this Privacy Policy carefully.
              By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              This Privacy Policy applies only to information we collect through our Services and does not apply to information collected through any third-party websites,
              services, or applications that may be linked to or accessible from our Services, each of which may have data collection, storage, and use practices and policies that
              differ from this Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">2. Information We Collect</h2>
            <p className="text-black/70 dark:text-white/70">We collect several types of information from and about users of our Services:</p>
            <h3 className="text-xl font-semibold text-black/90 dark:text-white/90 mt-4">2.1 Information You Provide to Us</h3>
            <p className="text-black/70 dark:text-white/70">We collect information that you provide directly to us, such as when you:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Create an account or register for our Services</li>
              <li>Subscribe to our Services or make purchases</li>
              <li>Complete forms or surveys</li>
              <li>Contact our support team</li>
              <li>Participate in promotions or contests</li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">This information may include:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Personal identifiers (name, email address, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Payment information (processed through secure third-party payment processors)</li>
              <li>Trading preferences and history</li>
              <li>Communications with us</li>
              <li>Any other information you choose to provide</li>
            </ul>

            <h3 className="text-xl font-semibold text-black/90 dark:text-white/90 mt-4">2.2 Information We Collect Automatically</h3>
            <p className="text-black/70 dark:text-white/70">When you access or use our Services, we automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Log data (IP address, browser type, operating system, referring URLs, pages visited, actions taken)</li>
              <li>Device information (device type, mobile device identifiers)</li>
              <li>Usage patterns and preferences</li>
              <li>Location information (general location based on IP address)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">3. How We Use Your Information</h2>
            <p className="text-black/70 dark:text-white/70">We use the information we collect for various purposes, including to:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>Provide, maintain, and improve our Services</li>
              <li>Process transactions and manage your account</li>
              <li>Send you technical notices, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our Services</li>
              <li>Detect, prevent, and address fraud, unauthorized access, and other illegal activities</li>
              <li>Personalize your experience and deliver content and features relevant to your interests</li>
              <li>Develop new products and services</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">We may combine information we collect about you with information we receive from third parties.</p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">4. Legal Basis for Processing (For EEA Users)</h2>
            <p className="text-black/70 dark:text-white/70">
              If you are located in the European Economic Area (EEA), we process your personal data based on one or more of the following legal grounds:
            </p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>
                <strong>Performance of a Contract:</strong> To provide you with the Services you have requested.
              </li>
              <li>
                <strong>Legitimate Interests:</strong> For our legitimate business interests, such as improving our Services, preventing fraud, and ensuring the security of our
                Services.
              </li>
              <li>
                <strong>Consent:</strong> When you have given us consent to process your personal data for specific purposes.
              </li>
              <li>
                <strong>Legal Obligation:</strong> To comply with legal requirements.
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">5. Sharing of Information</h2>
            <p className="text-black/70 dark:text-white/70">We do not sell your personal information. However, we may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>
                <strong>Service Providers:</strong> With third-party vendors, consultants, and other service providers who need access to your information to perform services on
                our behalf (e.g., payment processing, data analysis, email delivery, hosting services).
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another
                company.
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or if we believe that disclosure is necessary to comply with a legal obligation, protect our rights or
                property, protect the safety of our users or others, or investigate fraud.
              </li>
              <li>
                <strong>With Your Consent:</strong> With your consent or at your direction.
              </li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">We may also share aggregated or de-identified information that cannot reasonably be used to identify you.</p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">6. Cookies and Tracking Technologies</h2>
            <p className="text-black/70 dark:text-white/70">
              We and our third-party service providers use cookies, web beacons, and other tracking technologies to track information about your use of our Services. We may combine
              this information with other information we collect about you.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              You can set your browser to refuse all or some browser cookies or to alert you when cookies are being sent. However, if you disable or refuse cookies, some parts of
              our Services may be inaccessible or not function properly.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">7. Data Retention</h2>
            <p className="text-black/70 dark:text-white/70">
              We retain your personal information for as long as necessary to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal,
              accounting, or reporting requirements, to resolve disputes, and to enforce our agreements.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              When we no longer need your personal information, we will securely delete or anonymize it. If this is not possible, we will securely store your personal information
              and isolate it from any further use until deletion is possible.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">8. Data Security</h2>
            <p className="text-black/70 dark:text-white/70">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss,
              destruction, or damage. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              In the event of a data breach that affects your personal information, we will make reasonable efforts to inform you and relevant authorities when required by
              applicable law.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">9. Your Rights</h2>
            <p className="text-black/70 dark:text-white/70">Depending on your location, you may have certain rights regarding your personal information, which may include:</p>
            <ul className="list-disc pl-6 text-black/70 dark:text-white/70">
              <li>
                <strong>Access:</strong> The right to request copies of your personal information.
              </li>
              <li>
                <strong>Rectification:</strong> The right to request that we correct inaccurate information about you.
              </li>
              <li>
                <strong>Erasure:</strong> The right to request that we delete your personal information in certain circumstances.
              </li>
              <li>
                <strong>Restriction:</strong> The right to request that we restrict the processing of your information in certain circumstances.
              </li>
              <li>
                <strong>Data Portability:</strong> The right to receive your personal information in a structured, commonly used format.
              </li>
              <li>
                <strong>Objection:</strong> The right to object to our processing of your personal information.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> The right to withdraw consent where we process your information based on consent.
              </li>
            </ul>
            <p className="text-black/70 dark:text-white/70 mt-4">
              To exercise any of these rights, please contact us using the information provided in the &quot;Contact Us&quot; section. We may need to verify your identity before
              responding to your request. We will respond to all legitimate requests within the timeframes required by applicable law.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">10. International Data Transfers</h2>
            <p className="text-black/70 dark:text-white/70">
              We may transfer, store, and process your information in countries other than your own. If you are located in the European Economic Area (EEA) or other regions with
              laws governing data collection and use that may differ from U.S. law, please note that we may transfer information, including personal information, to a country and
              jurisdiction that does not have the same data protection laws as your jurisdiction.
            </p>
            <p className="text-black/70 dark:text-white/70 mt-4">
              By using our Services, you consent to the transfer of information to the United States or to any other country in which we or our service providers maintain
              facilities and the use and disclosure of information about you as described in this Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">11. Children&apos;s Privacy</h2>
            <p className="text-black/70 dark:text-white/70">
              Our Services are not directed to children under the age of 18, and we do not knowingly collect personal information from children under 18. If we learn that we have
              collected personal information from a child under 18, we will promptly delete that information. If you believe we have collected personal information from a child
              under 18, please contact us.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">12. Third-Party Services</h2>
            <p className="text-black/70 dark:text-white/70">
              Our Services may contain links to third-party websites, services, or applications. This Privacy Policy does not apply to those third-party services, and we are not
              responsible for the privacy practices of such third parties. We encourage you to review the privacy policies of any third-party services you access.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">13. Changes to This Privacy Policy</h2>
            <p className="text-black/70 dark:text-white/70">
              We may update this Privacy Policy from time to time at our sole discretion. If we make material changes, we will notify you by posting the updated Privacy Policy on
              this page with a new effective date. Your continued use of our Services after any such changes constitutes your acceptance of the new Privacy Policy. We encourage you
              to review this Privacy Policy periodically.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">14. Limitation of Liability</h2>
            <p className="text-black/70 dark:text-white/70">
              BY USING OUR SERVICES, YOU UNDERSTAND AND AGREE THAT WE PROVIDE OUR SERVICES ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. TO THE FULLEST EXTENT
              PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES AND CONDITIONS, EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO REPRESENTATIONS ABOUT THE ACCURACY, RELIABILITY, COMPLETENESS, OR TIMELINESS OF
              THE SERVICES OR THE CONTENT THEREIN.
            </p>

            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">15. Contact Us</h2>
            <p className="text-black/70 dark:text-white/70">If you have any questions about this Privacy Policy or our privacy practices, please contact us at:</p>
            <p className="text-black/70 dark:text-white/70 mt-2">Email: support@trade-tracker.net</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
