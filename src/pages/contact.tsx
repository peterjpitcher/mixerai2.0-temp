import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../app/globals.css'; // Corrected path, assuming pages and app are siblings

const ContactPage = () => {
  return (
    <>
      <Head>
        <title>Contact for MixerAI 2.0 | Enquiries & Demo Requests for Our Teams</title>
        <meta name="description" content="Get in touch with Peter Pitcher for enquiries or to schedule a demo of MixerAI 2.0 and learn how it can revolutionise our global content strategy." />
      </Head>

      <div className="min-h-screen bg-gray-100 font-sans flex flex-col items-center justify-center">
        {/* Page Title Section - Full Width */}
        <section 
          className="w-full py-16 md:py-24 text-white text-center bg-cover bg-center shadow-lg"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1622200194839-99340425b57b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')" }} // Well-stocked home pantry with packaged goods
        >
          <div className="absolute inset-0 bg-blue-700 opacity-60"></div> {/* Gradient overlay */}
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Contact for MixerAI 2.0 Enquiries</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto px-4">
              Have questions or ready to see MixerAI 2.0 in action? Reach out directly to Peter Pitcher for our teams.
            </p>
          </div>
        </section>

        {/* Main Content Section */}
        <main className="container mx-auto px-6 py-12 md:py-16 flex-grow flex items-center justify-center">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Direct Contact Information</h3>
            <p className="text-gray-700 mb-4 text-lg">
              For all MixerAI 2.0 enquiries, including demo requests for our teams, please email Peter Pitcher directly.
            </p>
            <a 
              href="mailto:peter.pitcher@genmills.com?subject=MixerAI%202.0%20Enquiry&body=Hello%20Peter%2C%0A%0AI%20have%20a%20question%20about%20MixerAI%202.0%20and%20would%20like%20to%20learn%20more.%0A%0AThanks%2C%0A[Your%20Name]"
              className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 mb-8"
            >
              Email Peter Pitcher
            </a>
            <p className="text-gray-600 text-md">
              He will be happy to assist you with your questions or schedule a personalised demonstration tailored to our BDT's and MAT's requirements.
            </p>
            
            <div className="mt-12">
                <Link href="/overview" className="text-blue-600 hover:text-blue-800 font-semibold text-lg">
                  &larr; Back to Overview
                </Link>
            </div>
          </div>
        </main>

        {/* Footer - Consistent with Overview */}
        <footer className="py-8 bg-gray-800 text-gray-400 text-center w-full">
          <div className="container mx-auto px-6">
            <p>&copy; {new Date().getFullYear()} MixerAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ContactPage; 