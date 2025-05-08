'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Card } from '@/components/card';
import BrandIdentityTest from './components/brand-identity-test';
import ContentGenerationTest from './components/content-generation-test';
import DirectApiTest from './components/direct-api-test';
import EnvironmentCheck from './components/environment-check';
import SystemStatus from './components/system-status';
import QuickTest from './components/quick-test';

export default function OpenAITestPage() {
  const [activeTab, setActiveTab] = useState('quick-test');

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">OpenAI Integration Tests</h1>
      <p className="text-gray-500 mb-6">
        This page provides tools to test and debug AI content generation features
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <QuickTest className="mb-4" />
          <SystemStatus className="mb-4" />
          <EnvironmentCheck />
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="brand-identity">Brand Identity</TabsTrigger>
              <TabsTrigger value="content-generation">Content Generation</TabsTrigger>
              <TabsTrigger value="direct-api">Direct API Test</TabsTrigger>
            </TabsList>

            <TabsContent value="brand-identity">
              <Card className="p-6">
                <BrandIdentityTest />
              </Card>
            </TabsContent>

            <TabsContent value="content-generation">
              <Card className="p-6">
                <ContentGenerationTest />
              </Card>
            </TabsContent>

            <TabsContent value="direct-api">
              <Card className="p-6">
                <DirectApiTest />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 