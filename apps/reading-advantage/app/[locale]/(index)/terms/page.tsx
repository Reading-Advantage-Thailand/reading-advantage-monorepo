import React from "react";

type Props = {};

export default function TermsPage({}: Props) {
  return (
    <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="container max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-6">Terms of Service</h1>
        <p className="text-sm text-center mb-8">Last updated: February 23, 2025</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold">1. Agreement to Terms</h2>
            <p>
              {`By accessing or using Reading Advantage's application and services (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the Terms, you do not have permission to access the Service.`}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">2. Definitions</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>{`"User," "you," and "your"`}</strong> {`refer to individuals accessing the Service.`}
              </li>
              <li>
                <strong>{`"Content"`}</strong> {`refers to text, images, audio, and other materials available through the Service.`}
              </li>
              <li>
                <strong>{`"User Content"`}</strong> {`refers to any content submitted by users, including written responses and saved items.`}
              </li>
              <li>
                <strong>{`"Subscription"`}</strong> {`refers to paid access to the Service.`}
              </li>
              <li>
                <strong>{`"License"`}</strong> {`refers to institutional access agreements.`}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">3. Account Registration and Security</h2>
            <h3 className="text-xl font-semibold mt-4">3.1 Account Creation</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>{`You must provide accurate and complete information when creating an account.`}</li>
              <li>{`Users under 13 must obtain parental consent or register through their educational institution.`}</li>
              <li>{`You are responsible for maintaining the confidentiality of your account credentials.`}</li>
            </ul>
            <h3 className="text-xl font-semibold mt-4">3.2 Account Security</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>{`You must notify us immediately of any unauthorized access to your account.`}</li>
              <li>{`You are responsible for all activities that occur under your account.`}</li>
              <li>{`We reserve the right to disable accounts that violate these Terms.`}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">4. Subscriptions and Payments</h2>
            <h3 className="text-xl font-semibold mt-4">4.1 Subscription Terms</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>{`Subscription fees are charged according to the plan selected.`}</li>
              <li>{`Institutional licenses are subject to separate agreements.`}</li>
              <li>{`All fees are non-refundable unless required by law.`}</li>
            </ul>
            <h3 className="text-xl font-semibold mt-4">4.2 Cancellation</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>{`You may cancel your subscription at any time.`}</li>
              <li>{`No refunds for partial subscription periods.`}</li>
              <li>{`Institutional licenses are governed by their specific agreements.`}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>{`You agree not to use the Service for any illegal purpose.`}</li>
              <li>{`Do not share account credentials with unauthorized users.`}</li>
              <li>{`Do not attempt to gain unauthorized access to the Service.`}</li>
              <li>{`Do not upload malicious code or content.`}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">6. Intellectual Property Rights</h2>
            <p>{`The Service and its original content are owned by Reading Advantage. All rights not expressly granted are reserved.`}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">7. Data Usage and Privacy</h2>
            <p>{`Data collection and use are governed by our Privacy Policy. We comply with applicable data protection laws.`}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">8. Disclaimers and Limitations</h2>
            <p>{`The Service is provided "as is" without warranties. We do not guarantee uninterrupted service.`}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">9. Changes to Service or Terms</h2>
            <p>{`We may modify these Terms at any time. Continued use after changes constitutes acceptance.`}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">10. Contact Information</h2>
            <p>{`Email: admin@reading-advantage.com`}</p>
            <p>{`Reading Advantage (Thailand)`}</p>
            <p>{`912/316 Na Muang Road, Muang, Khonkaen 40000, Thailand`}</p>
          </section>
        </div>
      </div>
    </section>
  );
}
