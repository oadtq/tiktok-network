export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using the services provided by EveryLab Technology Pte. Ltd. ("EveryLab", "we", "us", or "our"), 
            you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
          <p>
            We grant you a limited, non-exclusive, non-transferable, and revocable license to use our AI assistant services for your personal, non-commercial use, subject to these Terms.
            You agree not to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Modify or copy our materials for commercial purposes without our consent.</li>
            <li>Attempt to reverse engineer any software contained in our products.</li>
            <li>Remove any copyright or other proprietary notations from our materials.</li>
            <li>Use the service for any unlawful purpose or to solicit others to perform or participate in any unlawful acts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
          <p>
            To access certain features of our service, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process.
            You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Content and Conduct</h2>
          <p>
            Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content").
            You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
          </p>
          <p className="mt-2">
            You agree not to use the service to transmit any content that is offensive, harmful, deceptive, or violates the rights of others.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Payment Terms</h2>
          <p>
            Certain aspects of the Service may be provided for a fee. You agree to pay all fees associated with your use of the Service.
            All payments are non-refundable. We reserve the right to change our prices at any time, with reasonable notice provided to you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Disclaimer and Limitation of Liability</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. EveryLab makes no warranties, expressed or implied, regarding the operation of the service or the information, content, or materials included therein.
          </p>
          <p className="mt-2">
            To the fullest extent permitted by law, EveryLab shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of Singapore, without regard to its conflict of law provisions.
            Any dispute arising from these Terms shall be resolved through binding arbitration administered by the Singapore International Arbitration Centre (SIAC).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at hello@everylab.ai.
          </p>
        </section>
      </div>
    </div>
  );
}
