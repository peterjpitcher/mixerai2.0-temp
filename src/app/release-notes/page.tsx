'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

export default function ReleaseNotesPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">MixerAI 2.0 Release Notes</h1>
      
      {/* TODO: Update with current release notes, summarizing recent changes. */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Version 2.1.0 - June 2023</CardTitle>
          <CardDescription>Major feature update and bug fixes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">🚀 New Features</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Added accordion-style grouping to the Workflows page for better organization</li>
              <li>Implemented auto-generate feature on the new workflow page for easier workflow creation</li>
              <li>Added Culinary role option to workflow steps for food content review</li>
              <li>Enhanced brand organization with improved accordion UI</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">🛠️ Improvements</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Improved workflow step organization and description generation</li>
              <li>Enhanced UI consistency across brand and workflow pages</li>
              <li>Updated testing tools for Azure OpenAI integration</li>
              <li>Added comprehensive documentation for recent features</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">🐛 Bug Fixes</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fixed auto-generation API integration issues</li>
              <li>Resolved workflow step editing inconsistencies</li>
              <li>Fixed brand identity generation fallbacks</li>
              <li>Improved error handling in content generation flows</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Version 2.0.0 - May 2023</CardTitle>
          <CardDescription>Initial release of MixerAI 2.0</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">🚀 Key Features</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Brand management with AI-powered brand identity generation</li>
              <li>Workflow creation and management for content approval processes</li>
              <li>Multi-role content review system</li>
              <li>Azure OpenAI integration for content generation</li>
              <li>User invitation and management</li>
              <li>Responsive design for desktop and mobile devices</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 