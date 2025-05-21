import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../../app/globals.css'; // Corrected path

const StreamlinedOperationsPage = () => {
  return (
    <>
      <Head>
        <title>Streamlined Operations with MixerAI 2.0 | Deep Dive</title>
        <meta name="description" content="Learn how MixerAI 2.0 enables content creation at volume, optimises non-working media ROI, and empowers BDTs and MATs for efficiency." />
      </Head>

      <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
        {/* Removed Header Section */}

        {/* Page Title Section - Full Width */}
        <section 
          className="w-full py-16 md:py-24 text-white text-center bg-cover bg-center shadow-lg relative"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')" }} // Flat lay of baking ingredients
        >
          <div className="absolute inset-0 bg-purple-600 opacity-70"></div> {/* Gradient overlay */}
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Deep Dive: Content at Volume, Optimised ROI</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Empowering BDTs to set strategy and MATs to execute efficiently. Produce high-quality, localised content at scale while maximising the return on your non-working media investment.
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
            <article className="prose prose-lg max-w-none text-gray-800">
              <p>
                The demand for fresh, relevant, and localised content is ever-increasing. MixerAI 2.0 is designed to help your BDTs and MATs meet this demand by enabling the creation of high-impact content at scale, without sacrificing quality or busting budgets. This is key to optimising the ROI of your non-working media spend.
              </p>

              <h3>Strategic Frameworks by BDTs, Agile Execution by MATs</h3>
              <p>
                MixerAI 2.0 facilitates a powerful synergy between your central brand strategists and local market experts:
              </p>
              <ul>
                <li><strong>BDTs Define the Blueprint:</strong> Brand Development Teams can establish core messaging pillars, brand voice guidelines, approved product claims, and campaign frameworks directly within the platform. This ensures global consistency and strategic alignment.</li>
                <li><strong>MATs Activate with Speed & Precision:</strong> Market Activation Teams can then leverage these BDT-defined blueprints, using MixerAI 2.0's intelligent localisation capabilities to rapidly adapt and generate a high volume of market-specific content variations. This allows for targeted messaging across diverse consumer segments and channels.</li>
              </ul>

              {/* Placeholder for an impactful inline image */}
              <div className="my-8 md:my-12 clearfix">
                <img 
                  src="https://images.pexels.com/photos/887827/pexels-photo-887827.jpeg?auto=compress&cs=tinysrgb&w=1000&h=700&dpr=2" 
                  alt="Woman in yellow sweater holding a red and white packaged food box" 
                  className="rounded-lg shadow-xl float-left mr-6 mb-4 md:w-1/2 lg:w-2/5 xl:w-1/3" 
                  style={{ maxWidth: '450px' }}/>
              </div>

              <h3>Maximising Your Non-Working Media ROI</h3>
              <p>
                'Non-working media' – the budget spent on the creation and production of advertising content – can be a significant investment. MixerAI 2.0 helps you maximise this ROI by:
              </p>
              <ul>
                <li><strong>Reducing Redundant Creation:</strong> Instead of MATs creating content from scratch for every local need, they can adapt and build upon centrally provided assets and AI-generated localisations, drastically reducing duplicated effort.</li>
                <li><strong>Accelerating Time-to-Market:</strong> The speed of AI-powered localisation and streamlined workflows means content gets to market faster, allowing you to capitalise on opportunities more quickly.</li>
                <li><strong>Enabling Cost-Effective Versioning:</strong> Need slightly different versions of an ad for various demographics or A/B testing? MixerAI 2.0 makes this process highly efficient, allowing for more granular targeting without a linear increase in production costs.</li>
              </ul>

              <h3>Seasonal Content & Campaign Agility with Ease</h3>
              <p>
                One of the standout benefits of MixerAI 2.0 is the ability to refresh and seasonalise content with unprecedented ease and minimal cost. Once initial localisations are established, creating new variations for seasonal campaigns, holidays, or local events becomes a significantly lighter lift. MATs can quickly adapt existing approved content, ensuring your brands remain relevant and timely throughout the year, boosting engagement and maintaining a fresh presence in the market.
              </p>
              <p>
                This agility allows your teams to be more responsive to market dynamics, competitor activities, and consumer trends, all while keeping content production costs under control. By empowering your MATs to generate content at volume efficiently, and enabling BDTs to maintain strategic control, MixerAI 2.0 transforms your content operations into a lean, powerful engine for global growth.
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

export default StreamlinedOperationsPage; 