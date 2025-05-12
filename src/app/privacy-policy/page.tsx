'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      {/* TODO: Update with current Privacy Policy content */}
      <Card>
        <CardHeader>
          <CardTitle>MixerAI 2.0 Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose">
          <p>Last updated: June 2023</p>
          
          <h2>Introduction</h2>
          <p>
            This privacy policy explains how MixerAI 2.0 collects, uses, and protects your personal information
            when you use our content creation and workflow management platform.
          </p>
          
          <h2>Information We Collect</h2>
          <p>
            We collect information that you provide directly to us, such as when you create an account,
            create content, or contact us for support. This may include your name, email address, 
            company information, and any content you create or upload to the platform.
          </p>
          
          <h2>How We Use Your Information</h2>
          <p>
            We use your information to provide, maintain, and improve our services, including:
          </p>
          <ul>
            <li>Processing and delivering your content generation requests</li>
            <li>Providing customer support and responding to your inquiries</li>
            <li>Managing your account preferences and settings</li>
            <li>Improving our AI models and content generation capabilities</li>
          </ul>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this privacy policy, please contact us at privacy@mixerai.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 