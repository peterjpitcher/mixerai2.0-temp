import { Metadata } from 'next';
import UIShowcase from '@/components/ui-showcase';

export const metadata: Metadata = {
  title: 'UI Style Guide | MixerAI 2.0',
  description: 'A showcase of MixerAI 2.0 UI components and styling',
};

export default function UIShowcasePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="w-full bg-top-nav text-white px-6 py-4">
        <h1 className="text-2xl font-bold">MixerAI 2.0 UI Style Guide</h1>
        <p className="text-sm opacity-80">A showcase of the new UI standardization</p>
      </div>
      
      <div className="bg-app flex-1">
        <div className="max-w-7xl mx-auto">
          <UIShowcase />
        </div>
      </div>
    </div>
  );
} 