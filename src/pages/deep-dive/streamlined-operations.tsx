import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../../app/globals.css'; // Corrected path

const StreamlinedOperationsPage = () => {
  return (
    <>
      <Head>
        <title>Streamlined Operations with MixerAI 2.0 | Deep Dive for Our Brands</title>
        <meta name="description" content="Learn how MixerAI 2.0 enables content creation at volume, optimises our non-working media ROI, and empowers our BDT's and MAT's for efficiency." />
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
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Deep Dive: Content at Volume, Optimised ROI for Our Brands</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Empowering our BDT's to set strategy and our MAT's to execute efficiently. Produce high-quality, localised content at scale while maximising the return on our non-working media investment.
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
            <article className="prose prose-lg max-w-none text-gray-800">
              <p>
                The demand for fresh, relevant, and localised content is ever-increasing. MixerAI 2.0 is designed to help our BDT's and MAT's meet this demand by enabling the creation of high-impact content at scale, without sacrificing quality or busting budgets. This is key to optimising the ROI of our non-working media spend.
              </p>

              <h3>Strategic Frameworks by BDT's, Agile Execution by MAT's</h3>
              <p>
                MixerAI 2.0 facilitates a powerful synergy between our central brand strategists and local market experts:
              </p>
              <ul>
                <li><strong>BDT's Define the Blueprint:</strong> Our Brand Development Teams can establish core messaging pillars, brand voice guidelines, approved product claims, and campaign frameworks directly within the platform. This ensures global consistency and strategic alignment for our brands.</li>
                <li><strong>MAT's Activate with Speed & Precision:</strong> Our Market Activation Teams can then leverage these BDT-defined blueprints, using MixerAI 2.0's intelligent localisation capabilities to rapidly adapt and generate a high volume of market-specific content variations. For example, they can efficiently generate and adapt numerous versions of Product Detail Pages for different e-commerce platforms, create multiple newsletter variations for segmented audiences, or quickly localise a core article for several regional blogs. This allows for targeted messaging across diverse consumer segments and channels for our brands.</li>
              </ul>

              {/* Placeholder for an impactful inline image */}
              <div className="my-8 md:my-12 clearfix">
                <img 
                  src="https://images.pexels.com/photos/887827/pexels-photo-887827.jpeg?auto=compress&cs=tinysrgb&w=1000&h=700&dpr=2" 
                  alt="Woman in yellow sweater holding a red and white packaged food box" 
                  className="rounded-lg shadow-xl float-left mr-6 mb-4 md:w-1/2 lg:w-2/5 xl:w-1/3" 
                  style={{ maxWidth: '450px' }}/>
              </div>

              <h3>Maximising Our Non-Working Media ROI</h3>
              <p>
                'Non-working media' – the budget spent on the creation and production of advertising content – can be a significant investment. MixerAI 2.0 helps us maximise this ROI by:
              </p>
              <ul>
                <li><strong>Reducing Redundant Creation:</strong> Instead of our MAT's creating content from scratch for every local need, they can adapt and build upon centrally provided assets and AI-generated localisations, drastically reducing duplicated effort. This is particularly impactful for creating variations of PDPs or localising base recipes.</li>
                <li><strong>Accelerating Time-to-Market:</strong> The speed of AI-powered localisation and streamlined workflows means our content gets to market faster, allowing us to capitalise on opportunities more quickly. This could be launching a seasonal recipe campaign or updating PDPs with new promotional messaging.</li>
                <li><strong>Enabling Cost-Effective Versioning:</strong> Need slightly different versions of an ad, a product description for an e-commerce site, or a newsletter for various demographics or A/B testing? MixerAI 2.0 makes this process highly efficient, allowing for more granular targeting without a linear increase in production costs for our campaigns.</li>
              </ul>

              <h3>Seasonal Content & Campaign Agility with Ease for Our Brands</h3>
              <p>
                One of the standout benefits of MixerAI 2.0 is the ability to refresh and seasonalise our content with unprecedented ease and minimal cost. Once initial localisations are established, creating new variations for seasonal campaigns, holidays, or local events becomes a significantly lighter lift. Our MAT's can quickly adapt existing approved content, ensuring our brands remain relevant and timely throughout the year, boosting engagement and maintaining a fresh presence in the market.
              </p>
              <p>
                This agility allows our teams to be more responsive to market dynamics, competitor activities, and consumer trends, all while keeping content production costs under control. By empowering our MAT's to generate content at volume efficiently, and enabling our BDT's to maintain strategic control, MixerAI 2.0 transforms our content operations into a lean, powerful engine for global growth.
              </p>

              <div className="mt-12 text-center">
                <Link href="/overview#learn-more" className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition duration-300 ease-in-out">
                  &larr; Back to Overview
                </Link>
              </div>
            </article>
          </div>
        </main>

        {/* AI Taskforce Disclaimer Section */}
        <section className="py-12 bg-yellow-50 border-t border-yellow-200">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md border border-yellow-300">
              <h3 className="text-xl font-semibold mb-3 text-yellow-700">Important Notice: AI Taskforce Approval</h3>
              <p className="text-gray-700 leading-relaxed">
                Please note: All use cases must be submitted and approved through the AI Taskforce before content can be set live on any public domain. Brands can use the system to test and trial without setting it live until approval is received.
              </p>
            </div>
          </div>
        </section>

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