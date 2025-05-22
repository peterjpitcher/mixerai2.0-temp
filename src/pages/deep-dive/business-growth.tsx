import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../../app/globals.css'; // Corrected path

const BusinessGrowthPage = () => {
  return (
    <>
      <Head>
        <title>Driving Business Growth with MixerAI 2.0 | Deep Dive for Our Brands</title>
        <meta name="description" content="Discover how MixerAI 2.0 helps achieve sustainable business growth, market penetration, and campaign agility for our brands through culturally-attuned content."
        />
      </Head>

      <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
        {/* Removed Header Section */}

        {/* Page Title Section - Full Width */}
        <section 
          className="w-full py-16 md:py-24 text-white text-center bg-cover bg-center shadow-lg relative"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')" }} // Vibrant farmer's market
        >
          <div className="absolute inset-0 bg-red-600 opacity-70"></div> {/* Gradient overlay */}
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Deep Dive: Driving Growth & Agility for Our Brands</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Unlock new market opportunities and accelerate growth by keeping our brand messaging fresh, relevant, and deeply connected to local consumer needs with MixerAI 2.0.
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
            <article className="prose prose-lg max-w-none text-gray-800">
              <p>
                Sustainable business growth in a global landscape hinges on the ability to not only enter new markets but to win them. MixerAI 2.0 is a strategic enabler, empowering our BDT's and MAT's to drive significant market penetration and maintain campaign agility through culturally-attuned content that resonates and converts for our brands.
              </p>

              <h3>Culturally-Powered Market Penetration for Our Brands</h3>
              <p>
                Entering a new market or increasing share in an existing one requires more than just presence; it demands relevance. MixerAI 2.0 facilitates this by helping our teams deploy highly relevant content such as locally-optimised Product Detail Pages (PDPs) that convert, engaging articles that build trust, and culturally adapted recipes that drive trial and adoption of our food products. Specifically, this involves:
              </p>
              <ul>
                <li><strong>Deep Consumer Understanding:</strong> Our AI-driven insights help our MAT's uncover what truly motivates consumers in each locality, enabling the creation of hyper-relevant campaigns. For instance, understanding local preferences can shape the tone and focus of an email newsletter or the features highlighted on a PDP.</li>
                <li><strong>Overcoming Cultural Barriers:</strong> By ensuring our content is not just translated but culturally adapted (e.g., recipes using local ingredients, articles referencing local customs), MixerAI 2.0 helps our brands avoid missteps and build trust, paving the way for smoother market entry and stronger consumer adoption.</li>
                <li><strong>Boosting Share of Search & Voice:</strong> Locally optimised content naturally ranks higher and gets talked about more, increasing our brand's visibility and authority within target markets. This is crucial for capturing and growing market share for our brands.
                </li>
              </ul>

              {/* Placeholder for an impactful inline image */}
              <div className="my-8 md:my-12 clearfix">
                <img 
                  src="https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1000&h=700&dpr=2" 
                  alt="A table topped with lots of plates of food, signifying growth and abundance" 
                  className="rounded-lg shadow-xl float-right ml-6 mb-4 md:w-1/2 lg:w-2/5 xl:w-1/3" 
                  style={{ maxWidth: '450px' }}/>
              </div>

              <h3>Campaign Agility for Sustained Engagement with Our Consumers</h3>
              <p>
                The modern consumer landscape is dynamic. Trends shift, seasons change, and local events create unique engagement opportunities. MixerAI 2.0 provides the agility our MAT's need to respond effectively:
              </p>
              <ul>
                <li><strong>Rapid Seasonal Adaptation:</strong> As highlighted previously, the ability to refresh our content for seasonal campaigns, holidays, or local festivities at virtually zero incremental creation cost is a game-changer. This includes updating recipe suggestions in newsletters for seasonal ingredients or tweaking PDPs for holiday promotions, keeping our brand perennially relevant and top-of-mind.</li>
                <li><strong>Responsive Marketing:</strong> Quickly adapt messaging in response to competitor moves, emerging consumer conversations, or unexpected market opportunities. This could mean swiftly updating online articles to reflect new trends or adjusting newsletter content based on current events, ensuring our brands remain part of the local dialogue.</li>
                <li><strong>Efficient A/B Testing and Optimisation:</strong> The ease of creating content variations (e.g., different headlines for articles, varied promotional offers in newsletters, alternative benefit statements on PDPs) allows our MAT's to conduct more effective A/B testing, continuously refining messaging for optimal performance and conversion, leading to better ROI on our working media spend.
                </li>
              </ul>

              <h3>Strategic Growth Through Localised Excellence for Our Brands</h3>
              <p>
                For our BDT's, MixerAI 2.0 offers a pathway to achieving strategic growth objectives. By empowering our MAT's with the tools to create highly effective, localised content at scale, our BDT's can be confident that global brand strategies are being executed with maximum impact in each market.
              </p>
              <p>
                This synergy between centralised strategy and localised execution, underpinned by efficient content creation and workflow, turns our content operations into a direct driver of business growth. It's about building lasting brand loyalty, increasing customer lifetime value, and consistently outperforming competitors by being more relevant, more responsive, and more deeply connected to consumers across our diverse global portfolio.
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

export default BusinessGrowthPage; 