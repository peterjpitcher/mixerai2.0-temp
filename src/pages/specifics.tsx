import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../app/globals.css'; // Corrected path, assuming pages and app are siblings

const SpecificsPage = () => {
  return (
    <>
      <Head>
        <title>MixerAI 2.0 Features & Specifics | Deep Dive</title>
        <meta name="description" content="Explore the detailed features and technical specifics of MixerAI 2.0, including AI capabilities, workflow management, and integration points." />
      </Head>

      <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
        {/* Page Title Section - Full Width */}
        <section 
          className="w-full py-16 md:py-24 text-white text-center bg-cover bg-center shadow-lg relative"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1495195129352-aeb3cacc6541?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')" }} // Flat lay of cooking ingredients
        >
          <div className="absolute inset-0 bg-indigo-600 opacity-70"></div> {/* Gradient overlay */}
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">MixerAI 2.0: Key Features & Technical Specifics</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Delve into the core functionalities that make MixerAI 2.0 a powerful solution for global content creation and management. (Further details to be populated based on technical documentation and specific feature sets).
            </p>
          </div>
        </section>

        {/* Main Content Section - Placeholder for detailed features */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
            <article className="prose prose-lg max-w-none text-gray-800">
              <p className="text-center text-xl font-semibold">
                This page will provide a detailed breakdown of MixerAI 2.0's features.
              </p>
              <p className="text-center mt-4">
                Content will be added here based on your specific questions from our previous discussion and the available technical documentation for the application.
              </p>
              
              <h3 className="mt-10">Potential Areas to Detail:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>AI & Localisation Engine:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Supported languages and regional nuances.</li>
                    <li>Types of content the AI can generate/adapt (e.g., social media copy, web content, product descriptions, ad copy).</li>
                    <li>Information on the AI models used (if disclosable).</li>
                    <li>Cultural sensitivity and bias detection mechanisms.</li>
                  </ul>
                </li>
                <li><strong>Workflow Management:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Detailed explanation of configurable approval chains.</li>
                    <li>Version control and audit trail capabilities.</li>
                    <li>Role-based access control and permissions.</li>
                    <li>Notification systems and task management.</li>
                  </ul>
                </li>
                <li><strong>Content Management & Collaboration:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Centralised asset library features (if any).</li>
                    <li>Feedback and annotation tools.</li>
                    <li>Brand guideline enforcement mechanisms.</li>
                  </ul>
                </li>
                <li><strong>Integration Capabilities:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Details on any APIs for connecting with other internal systems (DAM, PIM, etc.).</li>
                    <li>Data import/export functionalities.</li>
                  </ul>
                </li>
                <li><strong>Reporting & Analytics:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Overview of available dashboards for BDTs and MATs.</li>
                    <li>Metrics tracked (e.g., content production time, approval rates, localisation effectiveness - if measurable).</li>
                  </ul>
                </li>
                 <li><strong>Security & Compliance:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Data security measures.</li>
                    <li>Compliance with internal data handling policies.</li>
                  </ul>
                </li>
              </ul>

              <div className="my-8 md:my-12 clearfix">
                <img 
                  src="https://source.unsplash.com/F9hsJM23fNI/1000x700" 
                  alt="Couple shopping together in the supermarket produce department" 
                  className="rounded-lg shadow-xl float-left mr-6 mb-4 md:w-1/2 lg:w-2/5 xl:w-1/3" 
                  style={{ maxWidth: '450px' }}/>
              </div>
              
              <p className="mt-8">
                To populate this page effectively, please provide more details or ask specific questions about the features you'd like to highlight for your BDTs and MATs.
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

export default SpecificsPage; 