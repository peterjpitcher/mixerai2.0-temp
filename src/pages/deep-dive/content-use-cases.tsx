import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../../app/globals.css'; // Assuming globals.css is in the app directory

const ContentUseCasesPage = () => {
  return (
    <>
      <Head>
        <title>MixerAI 2.0: Powering Our Lower-Funnel Content | Use Cases</title>
        <meta name="description" content="Explore how MixerAI 2.0 helps our BDT's and MAT's create high-impact lower-funnel content like PDPs, articles, newsletters, and optimised recipes to drive results for our brands." />
      </Head>

      <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
        {/* Page Title Section - Full Width */}
        <section 
          className="w-full py-16 md:py-24 text-white text-center bg-cover bg-center shadow-lg relative"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')" }} // Food-related image
        >
          <div className="absolute inset-0 bg-teal-600 opacity-70"></div> {/* Gradient overlay */}
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">MixerAI 2.0: Powering Our Lower-Funnel Content</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Discover how we leverage MixerAI 2.0 to create compelling, localised content that drives conversions and engagement for our brands at critical touchpoints.
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
            <article className="prose prose-lg max-w-none text-gray-800">

              <p className="text-xl mb-10">
                MixerAI 2.0 is instrumental in helping our BDT's and MAT's craft a wide array of lower-funnel content. By ensuring cultural relevance and optimising for local preferences, we can significantly enhance performance across key conversion-focused assets. Here's how we're making an impact:
              </p>

              {/* PDPs Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4 border-b pb-2 border-gray-300 text-teal-700">Compelling Product Detail Pages (PDPs)</h2>
                <p className="mb-4">
                  Our PDPs are a critical sales driver. With MixerAI 2.0, our MAT's can rapidly localise product descriptions, features, and benefits to resonate with specific market nuances. This includes adapting terminology, highlighting culturally relevant use-cases, and ensuring that all content aligns with local consumer expectations and e-commerce platform best practices.
                </p>
                <p>
                  <strong>Key Benefits for Our Brands:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-1 mb-4">
                  <li>Increased conversion rates on e-commerce platforms.</li>
                  <li>Reduced bounce rates due to more relevant product information.</li>
                  <li>Enhanced SEO performance for product listings in local search engines.</li>
                  <li>Consistent brand voice adapted for local markets.</li>
                </ul>
                <p>
                  MixerAI 2.0 empowers our BDT's to set foundational product information and brand guidelines, while our MAT's use the platform to scale the creation of persuasive, localised PDPs that drive sales for our diverse product portfolio.
                </p>
              </section>

              {/* Articles & Blog Posts Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4 border-b pb-2 border-gray-300 text-teal-700">Engaging Articles & Blog Posts</h2>
                <p className="mb-4">
                  Informative and engaging articles are key to building trust and authority for our brands. MixerAI 2.0 assists our MAT's in generating and adapting article content that addresses local interests, answers specific consumer questions within a market, and incorporates relevant cultural insights.
                </p>
                <p>
                  <strong>Key Benefits for Our Brands:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-1 mb-4">
                  <li>Improved organic search rankings through locally optimised, valuable content.</li>
                  <li>Increased brand engagement and thought leadership in specific markets.</li>
                  <li>Content that genuinely helps and informs our local consumers, building loyalty.</li>
                  <li>Efficient creation of diverse content to support various campaigns and brand narratives.</li>
                </ul>
                <p>
                  Our BDT's can outline strategic themes and topics, and MixerAI 2.0 helps our MAT's develop a pipeline of articles that resonate locally and support our broader content marketing objectives.
                </p>
              </section>

              {/* Newsletters Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4 border-b pb-2 border-gray-300 text-teal-700">Targeted Email Newsletters</h2>
                <p className="mb-4">
                  Email newsletters remain a vital tool for direct consumer communication. MixerAI 2.0 enables our MAT's to localise newsletter content effectively, from subject lines and calls-to-action to featured products and promotional messaging. This ensures our emails feel personal and relevant to subscribers in different regions.
                </p>
                <p>
                  <strong>Key Benefits for Our Brands:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-1 mb-4">
                  <li>Higher open and click-through rates for our email campaigns.</li>
                  <li>Increased engagement with promotional offers and brand updates.</li>
                  <li>Stronger customer retention through personalised communication.</li>
                  <li>Ability to quickly adapt global campaigns for local market execution via email.</li>
                </ul>
              </section>

              {/* Recipe Optimisation Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4 border-b pb-2 border-gray-300 text-teal-700">Recipe Optimisation & Creation</h2>
                <p className="mb-4">
                  For our food brands, recipes are a cornerstone of consumer engagement. MixerAI 2.0 plays a crucial role in helping our MAT's adapt existing recipes to suit local tastes, ingredient availability, and common cooking practices. It can also assist in creating new, culturally inspired recipes featuring our products.
                </p>
                <p>
                  <strong>Key Benefits for Our Brands:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-1 mb-4">
                  <li>Increased trial and usage of our food products in local markets.</li>
                  <li>Recipes that are practical and appealing to local home cooks.</li>
                  <li>Enhanced brand perception as one that understands and caters to local culinary traditions.</li>
                  <li>Creation of a rich library of localised recipe content to inspire our consumers.</li>
                </ul>
                <p>
                  Our BDT's can provide core product information and usage ideas, and MixerAI 2.0 helps our MAT's ensure that all recipe content is perfectly attuned to each market, encouraging consumers to bring our brands into their kitchens.
                </p>
              </section>

              <div className="mt-12 text-center">
                <Link href="/overview" className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition duration-300 ease-in-out">
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

export default ContentUseCasesPage; 