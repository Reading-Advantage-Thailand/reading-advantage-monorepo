import React from "react";

type Props = {};

export default function PrivacyPolicy({}: Props) {
  return (
    <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="container max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-6">Privacy Policy</h1>
        <p className="text-sm text-center mb-8">
          Last updated: February 23, 2025
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold">Introduction</h2>
            <p>
              {`Reading Advantage ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Reading Advantage application and related services (collectively, the "Service").`}
            </p>
            <p>
              {`Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use of information in accordance with this policy.`}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Information We Collect</h2>
            <h3 className="text-xl font-semibold mt-4">
              Information You Provide to Us
            </h3>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Account Information:</strong>{" "}
                {`Name, email address, password, and role (student, teacher, or administrator).`}
              </li>
              <li>
                <strong>Profile Information:</strong>{" "}
                {`Profile picture and language preferences.`}
              </li>
              <li>
                <strong>Educational Information:</strong>{" "}
                {`CEFR level, learning progress, and educational institution affiliation.`}
              </li>
              <li>
                <strong>User-Generated Content:</strong>{" "}
                {`Saved sentences, vocabulary, and written responses.`}
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4">
              Information Automatically Collected
            </h3>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Usage Data:</strong>{" "}
                {`Articles read, activities completed, time spent on features, and performance in assessments.`}
              </li>
              <li>
                <strong>Technical Data:</strong>{" "}
                {`Device information, IP address, browser type, and operating system.`}
              </li>
              <li>
                <strong>Cookies and Similar Technologies:</strong>{" "}
                {`We use cookies to monitor Service usage and maintain user sessions.`}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>{`To provide and maintain the Service`}</li>
              <li>{`To notify you about changes`}</li>
              <li>{`To provide customer support`}</li>
              <li>{`To track your learning progress`}</li>
              <li>{`To generate performance analytics`}</li>
              <li>{`To detect and address technical issues`}</li>
              <li>{`To comply with legal obligations`}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              Data Storage and Security
            </h2>
            <p>
              {`Your data is stored on secure servers provided by Google Cloud Platform. We implement appropriate measures to protect your information.`}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              Use of Google Workspace APIs
            </h2>
            <p>
              Our application integrates with certain Google Workspace APIs to
              provide functionality related to user accounts, data access, or
              productivity tools. We <strong>do not</strong> use any data
              obtained from Google Workspace APIs to develop, improve, or train{" "}
              <strong>generalized</strong> artificial intelligence (AI) or
              machine learning (ML) models.
            </p>
            <p>
              All data retrieved via Google Workspace APIs is used{" "}
              <strong>solely</strong> for the purpose of providing the requested
              features within our application and is handled in accordance with
              our privacy and security standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              Information Sharing and Disclosure
            </h2>
            <p>{`We do not sell your personal information. We may share data:`}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{`With your educational institution`}</li>
              <li>{`With service providers assisting in operations`}</li>
              <li>{`When required by law`}</li>
              <li>{`In connection with a business transfer`}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Student Privacy</h2>
            <p>
              {`For students under 13 years of age, we comply with COPPA. We collect personal data only with parental or school consent.`}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Your Rights</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>{`Access your personal information`}</li>
              <li>{`Correct inaccurate data`}</li>
              <li>{`Request deletion`}</li>
              <li>{`Object to processing`}</li>
              <li>{`Export data`}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              Changes to This Privacy Policy
            </h2>
            <p>
              {`We may update this Privacy Policy from time to time. Changes will be notified by updating the "Last updated" date.`}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p>{`Email: admin@reading-advantage.com`}</p>
            <p>{`Reading Advantage (Thailand)`}</p>
            <p>{`912/316 Na Muang Road, Muang, Khonkaen 40000, Thailand`}</p>
          </section>
        </div>
      </div>
    </section>
  );
}
