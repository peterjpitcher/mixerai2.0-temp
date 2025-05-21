import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../../app/globals.css'; // Corrected path

const QualityWorkflowPage = () => {
  return (
    <>
      <Head>
        <title>Quality & Workflow with MixerAI 2.0 | Deep Dive for Our Brands</title>
        <meta name="description" content="Explore MixerAI 2.0's robust quality control and streamlined approval workflows, empowering our BDT's and MAT's for brand safety and efficiency." />
      </Head>

      <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
        {/* Page Title Section - Full Width */}
        <section 
          className="w-full py-16 md:py-24 text-white text-center bg-cover bg-center shadow-lg relative"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/4049793/pexels-photo-4049793.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')" }} // Yogurt with granola and berries
        >
          <div className="absolute inset-0 bg-green-600 opacity-70"></div> {/* Gradient overlay */}
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Deep Dive: Uncompromising Quality & Workflow for Our Content</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Ensuring brand integrity and accelerating content delivery through intelligent, best-in-class approval processes. Empowering our BDT's with oversight and our MAT's with agility.
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
            <article className="prose prose-lg max-w-none text-gray-800">
              <p>
                In a fast-paced global environment, maintaining impeccable quality and ensuring brand safety across all our markets is paramount. MixerAI 2.0 integrates a sophisticated workflow and approval system designed to provide our BDT's with the necessary oversight while empowering our MAT's to activate campaigns swiftly and confidently.
              </p>

              <h3>Centralised Control, Local Agility for Our Teams</h3>
              <p>
                Our platform is built on the principle that global brand consistency and local market agility are not mutually exclusive. Our BDT's can establish and manage core brand guidelines, legal disclaimers, and mandatory messaging elements directly within MixerAI 2.0. These centralised controls serve as the foundation upon which our MAT's can then build locally nuanced content.
              </p>
              <ul>
                <li><strong>Configurable Approval Chains:</strong> Define multi-step approval processes tailored to our organisational structure. Assign reviewers based on market, content type, or specific campaign requirements.</li>
                <li><strong>Clear Version Control:</strong> Track changes, review iterations, and maintain a clear audit trail for all our content. This ensures transparency and accountability throughout the content lifecycle.</li>
                <li><strong>Automated Notifications:</strong> Keep stakeholders informed with automated alerts for pending reviews, approvals, or required revisions, minimising delays and keeping projects on track.</li>
              </ul>

              <div className="my-8 md:my-12 clearfix">
                <img 
                  src="https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1000&h=700&dpr=2" 
                  alt="Woman reading product label in a supermarket" 
                  className="rounded-lg shadow-xl float-left mr-6 mb-4 md:w-1/2 lg:w-2/5 xl:w-1/3" 
                  style={{ maxWidth: '450px' }} />
              </div>
              <h3>Empowering MAT's with Compliant Creativity</h3>
              <p>
                While our BDT's set the guardrails, our MAT's are equipped with tools that foster creativity within a compliant framework. MixerAI 2.0 provides real-time feedback and checks against established guidelines as content is being created, reducing the likelihood of rework and streamlining the approval process.
              </p>
              <p>
                This means our MAT's can confidently develop engaging, market-specific content knowing they are operating within pre-approved brand and legal parameters. The result is faster campaign launches, reduced risk, and a more efficient use of resources – directly impacting our non-working media ROI by minimising time spent on revisions and compliance checks.
              </p>

              <h3>Seamless Collaboration for Optimal Output</h3>
              <p>
                MixerAI 2.0 fosters seamless collaboration between our BDT's, MAT's, legal teams, and any other stakeholders involved in the content review process. A centralised platform for communication, feedback, and approvals eliminates scattered email chains and versioning confusion.
              </p>
              <ul>
                <li><strong>Role-Based Access:</strong> Ensure the right individuals have the appropriate level of access and control over content and workflows.</li>
                <li><strong>Integrated Feedback Tools:</strong> Provide specific, contextual feedback directly within the platform, making revisions clear and efficient.</li>
                <li><strong>Dashboard Overviews:</strong> Gain at-a-glance visibility into the status of all content pieces, identify bottlenecks, and monitor overall workflow efficiency.</li>
              </ul>
              <p>
                By harmonising the needs for global brand governance with the imperative for local market responsiveness, MixerAI 2.0's quality and workflow capabilities are essential for our organisation looking to scale its global content operations effectively and securely.
              </p>

              <div className="mt-12 text-center">
                <Link href="/overview#learn-more" className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition duration-300 ease-in-out">
                  &larr; Back to Overview
                </Link>
              </div>
            </article>
          </div>
        </main>

        {/* Footer - Consistent with Overview */}
        <footer className="py-8 bg-gray-800 text-gray-400 text-center mt-auto">
          <div className="container mx-auto px-6">
            <p>&copy; {new Date().getFullYear()} MixerAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default QualityWorkflowPage; 