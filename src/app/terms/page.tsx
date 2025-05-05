'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>MixerAI 2.0 Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose">
          <p>Last updated: June 2023</p>
          
          <h2>Agreement to Terms</h2>
          <p>
            By accessing or using our AI-powered content creation platform, MixerAI 2.0, you agree to be bound
            by these Terms of Service and all applicable laws and regulations. If you do not agree with any of 
            these terms, you are prohibited from using this service.
          </p>
          
          <h2>Use of Service</h2>
          <p>
            MixerAI 2.0 provides an AI-powered platform for generating and managing content. Users are responsible
            for all content they create, manage, and publish using our platform. Users must not:
          </p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of our system</li>
            <li>Use the service to generate content that violates copyright, trademark, or other intellectual property rights</li>
            <li>Generate or distribute harmful, offensive, or inappropriate content</li>
          </ul>
          
          <h2>Content Ownership</h2>
          <p>
            Users retain intellectual property rights to content they create using MixerAI 2.0, subject to
            our right to use such content for service improvement and promotional purposes as outlined in 
            our Privacy Policy.
          </p>
          
          <h2>Limitation of Liability</h2>
          <p>
            MixerAI 2.0 is provided "as is" without warranties of any kind. We shall not be liable for any
            direct, indirect, incidental, or consequential damages resulting from your use of our services.
          </p>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at legal@mixerai.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 