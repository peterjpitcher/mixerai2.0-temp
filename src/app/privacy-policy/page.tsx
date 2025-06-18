'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>MixerAI 2.0 Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <p className="text-muted-foreground">Last updated: December 2024</p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
          <p className="mb-4">
            At MixerAI, we take your privacy seriously. This Privacy Policy explains how we collect, use, share, 
            and protect your personal information when you use our AI-powered content creation and workflow 
            management platform ("Service"). By using MixerAI, you agree to the collection and use of 
            information in accordance with this policy.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
          <h3 className="text-lg font-medium mt-4 mb-2">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li><strong>Account Information:</strong> Name, email address, company name, job title</li>
            <li><strong>Profile Data:</strong> Avatar images, team information, brand associations</li>
            <li><strong>Content Data:</strong> Templates, generated content, brand identities, product claims</li>
            <li><strong>Usage Data:</strong> Tool interactions, AI generation history, workflow activities</li>
            <li><strong>Communication Data:</strong> Support requests, feedback, correspondence</li>
          </ul>
          
          <h3 className="text-lg font-medium mt-4 mb-2">2.2 Information We Collect Automatically</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li><strong>Log Data:</strong> IP address, browser type, device information, access times</li>
            <li><strong>Usage Analytics:</strong> Features used, performance metrics, error reports</li>
            <li><strong>Cookies and Similar Technologies:</strong> Session cookies, authentication tokens</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
          <p className="mb-2">We use collected information to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Provide and maintain our AI-powered content generation services</li>
            <li>Process your requests and manage your account</li>
            <li>Improve our AI models and service quality</li>
            <li>Send service-related communications and updates</li>
            <li>Ensure security and prevent fraud</li>
            <li>Comply with legal obligations</li>
            <li>Analyze usage patterns to enhance user experience</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">4. Information Sharing</h2>
          <p className="mb-2">We do not sell your personal information. We share information only:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li><strong>With Service Providers:</strong> Trusted third parties who assist in operating our service (e.g., Supabase for authentication, Azure for AI processing)</li>
            <li><strong>Within Your Organization:</strong> With team members based on permissions and roles</li>
            <li><strong>For Legal Reasons:</strong> When required by law or to protect rights and safety</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Security</h2>
          <p className="mb-4">
            We implement industry-standard security measures to protect your information, including:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Employee training on data protection</li>
            <li>Incident response procedures</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">6. Your Rights and Choices</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li><strong>Access:</strong> Request a copy of your personal information</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Export your content and data</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            <li><strong>Restriction:</strong> Limit processing of your information in certain circumstances</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">7. Data Retention</h2>
          <p className="mb-4">
            We retain your information for as long as necessary to provide our services and comply with legal 
            obligations. When you delete your account, we will delete or anonymize your personal information 
            within 90 days, except where retention is required by law.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">8. International Data Transfers</h2>
          <p className="mb-4">
            Your information may be transferred to and processed in countries other than your own. We ensure 
            appropriate safeguards are in place to protect your information in accordance with this policy.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">9. Children's Privacy</h2>
          <p className="mb-4">
            Our Service is not intended for users under 18 years of age. We do not knowingly collect personal 
            information from children under 18.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. We will notify you of material changes by 
            posting the new policy on this page and updating the "Last updated" date.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact Us</h2>
          <p className="mb-2">If you have questions about this Privacy Policy or our data practices, please contact us:</p>
          <ul className="list-none space-y-1">
            <li><strong>Email:</strong> privacy@mixerai.com</li>
            <li><strong>Security Issues:</strong> security@mixerai.com</li>
            <li><strong>Address:</strong> [Company Address]</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 