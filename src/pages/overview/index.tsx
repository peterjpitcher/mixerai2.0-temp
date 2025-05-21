import React from 'react';
import Head from 'next/head'; // Import Head for title and meta tags
import Link from 'next/link'; // Import Link

// Assuming your global styles including Tailwind base are in src/app/globals.css
import '../../app/globals.css'; 

const OverviewPage = () => {
  return (
    <>
      <Head>
        <title>MixerAI 2.0 | Revolutionise Our Global Content Strategy</title>
        <meta name="description" content="Discover MixerAI 2.0 - Create authentic, culturally-attuned marketing that captivates audiences worldwide and streamlines our content workflows." />
        {/* Add other relevant meta tags: Open Graph, Twitter Cards etc. */}
      </Head>

      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
        {/* Hero Section */}
        <section 
          className="min-h-[60vh] md:min-h-[70vh] bg-cover bg-center flex flex-col justify-center items-center text-white relative"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 opacity-75"></div>
          <div className="relative z-10 text-center p-6 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              MixerAI 2.0: Global Reach, Local Impact for Our Brands.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-8">
              Transform our content strategy to drive share of search and market. Create authentic, culturally-attuned marketing that captivates audiences worldwide, effortlessly.
            </p>
            <a 
              href="#learn-more" 
              className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-100 transition duration-300 ease-in-out transform hover:scale-105"
            >
              Discover How
            </a>
          </div>
        </section>

        {/* Introduction Section */}
        <section id="learn-more" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Unlock the Power of True Localisation for Our Content</h2>
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              Is our global content truly connecting, or just 'good enough'? MixerAI 2.0 empowers our MAT's to craft messages that genuinely resonate with local cultures and values. This moves beyond simple translation, enabling us to build authentic connections that drive engagement and significantly boost market share for our brands. All this, while our BDT's maintain centralised strategic oversight and brand consistency.
            </p>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="py-16 md:py-24 bg-gray-100">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 text-gray-900">Elevate Our Global Content Excellence</h2>
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Benefit 1 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                <div className="text-blue-500 text-4xl mb-4">🌍</div> 
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Authentic Cultural Resonance</h3>
                <p className="text-gray-700 leading-relaxed flex-grow">
                  Connect deeply to win in every market. Our AI crafts content that speaks authentically to each specific culture, boosting our share of search and making our brands a local favourite.
                </p>
                <Link href="/deep-dive/cultural-resonance" className="text-blue-600 hover:text-blue-800 font-semibold mt-4 inline-block self-start">Learn more &rarr;</Link>
              </div>
              {/* Benefit 2 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                <div className="text-green-500 text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Uncompromising Quality & Workflow</h3>
                <p className="text-gray-700 leading-relaxed flex-grow">
                  Our robust workflow and approval system ensures every piece of our content meets the highest standards of quality and compliance. Empower our MAT's with agility, while our BDT's ensure global brand integrity.
                </p>
                <Link href="/deep-dive/quality-workflow" className="text-blue-600 hover:text-blue-800 font-semibold mt-4 inline-block self-start">Learn more &rarr;</Link>
              </div>
              {/* Benefit 3 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                <div className="text-purple-500 text-4xl mb-4">⚙️</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Content at Volume, Optimised ROI</h3>
                <p className="text-gray-700 leading-relaxed flex-grow">
                  Produce impactful content at scale, optimising our ROI on non-working media. Our BDT's can establish clear guidelines, empowering our MAT's to create and adapt content swiftly and efficiently.
                </p>
                <Link href="/deep-dive/streamlined-operations" className="text-blue-600 hover:text-blue-800 font-semibold mt-4 inline-block self-start">Learn more &rarr;</Link>
              </div>
              {/* Benefit 4 */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                <div className="text-red-500 text-4xl mb-4">📈</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Drive Growth & Agility for Our Brands</h3>
                <p className="text-gray-700 leading-relaxed flex-grow">
                  Unlock new growth by keeping our brand messaging fresh and relevant. Effortlessly seasonalise our content across our diverse portfolio, at virtually zero incremental cost for creation, driving sustained engagement and market penetration.
                </p>
                <Link href="/deep-dive/business-growth" className="text-blue-600 hover:text-blue-800 font-semibold mt-4 inline-block self-start">Learn more &rarr;</Link>
              </div>
            </div>
            
            {/* New Sub-section for Content Use Cases */}
            <div className="mt-16 text-center">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">What We Create: From PDPs to Optimised Recipes</h3>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto mb-8">
                MixerAI 2.0 excels at crafting a variety of lower-funnel content types essential for driving conversions and engagement. Our teams leverage it to produce:
              </p>
              <ul className="list-none space-y-2 mb-8 inline-block text-left">
                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> High-conversion Product Detail Pages (PDPs)</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> Insightful Articles and SEO-friendly blog posts</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> Personalised Email Newsletters</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> Culturally-adapted Recipes for our food brands</li>
              </ul>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto mb-8">
                These are just a few examples of how MixerAI 2.0 empowers our MAT's and BDT's to achieve specific marketing goals and connect more deeply with our consumers.
              </p>
              <Link 
                href="/deep-dive/content-use-cases" 
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
              >
                Explore Our Content Use Cases &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-gray-900">Empowering Our Key Teams</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-6 bg-gray-50 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-2 text-blue-600">BDT's</h3>
                <p className="text-gray-700">Define global brand strategy and provide consistent guidelines, ensuring our core message resonates powerfully yet flexibly across all markets. Enable our teams to create content at volume while optimising the ROI of non-working media.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-2 text-green-600">MAT's</h3>
                <p className="text-gray-700">Rapidly create and adapt highly-localised, compliant content that drives engagement and wins share of market. Respond to local trends and seasonal opportunities with unprecedented speed and efficiency.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-blue-600 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Elevate Our Global Content Game?</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              We're here to empower our BDT's and MAT's to drive brand penetration and deepen consumer connections. Discover how MixerAI 2.0 can help us create content at volume, drive share of market, and maximise our content ROI.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4">
              <a 
                href="mailto:peter.pitcher@genmills.com?subject=MixerAI%202.0%20Demo%20Request&body=Hello%20Peter%2C%0A%0AI'm%20interested%20in%20a%20demo%20of%20MixerAI%202.0%20after%20reviewing%20the%20overview%20page.%0APlease%20let%20me%20know%20the%20next%20steps.%0A%0AThanks%2C%0A[Your%20Name]"
                className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-100 transition duration-300 ease-in-out transform hover:scale-105 inline-block"
              >
                Request a Demo
              </a>
              <a 
                href="/specifics" // Update to your actual features/specifics page
                className="border-2 border-white text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-white hover:text-blue-600 transition duration-300 ease-in-out transform hover:scale-105 inline-block"
              >
                View Features
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-gray-800 text-gray-400 text-center">
          <div className="container mx-auto px-6">
            <p>&copy; {new Date().getFullYear()} MixerAI. All rights reserved.</p>
          </div>
        </footer>
    </div>
    </>
  );
};

export default OverviewPage; 