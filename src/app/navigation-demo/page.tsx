import { Metadata } from 'next';
import TopNavigation from '@/components/layout/top-navigation';
import SideNavigation from '@/components/layout/side-navigation';

export const metadata: Metadata = {
  title: 'Navigation Demo | MixerAI 2.0',
  description: 'Demonstration of the new navigation system with blue theme',
};

export default function NavigationDemoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNavigation />
      
      <div className="flex flex-1">
        <SideNavigation />
        
        <main className="p-6 flex-1 bg-background">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="border rounded-lg p-8 bg-white">
              <h1 className="text-3xl font-bold mb-6 text-neutral-900">Navigation System Demo</h1>
              <p className="text-lg text-neutral-700 mb-4">
                This page demonstrates the updated navigation system with our brand colors.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="border rounded-md p-4 bg-neutral-50">
                  <h2 className="text-xl font-semibold mb-3 text-primary">Top Navigation</h2>
                  <p className="text-neutral-600 mb-3">
                    The top navigation uses <code className="bg-neutral-100 px-2 py-1 rounded text-primary">bg-primary</code> class,
                    which is set to our exact blue color (<code className="bg-neutral-100 px-2 py-1 rounded text-primary">#0066CC</code>).
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-sm">
                    <li>Primary blue background (#0066CC)</li>
                    <li>White text for optimal readability</li>
                    <li>Active state highlighting</li>
                    <li>Responsive design with mobile menu</li>
                  </ul>
                </div>
                
                <div className="border rounded-md p-4 bg-neutral-50">
                  <h2 className="text-xl font-semibold mb-3 text-primary">Side Navigation</h2>
                  <p className="text-neutral-600 mb-3">
                    The side navigation uses <code className="bg-neutral-100 px-2 py-1 rounded text-primary">bg-side-nav</code> class,
                    which uses our light blue shade (<code className="bg-neutral-100 px-2 py-1 rounded text-primary">#E6F0FA</code>).
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-sm">
                    <li>Light blue background for subtlety</li>
                    <li>Blue highlight for active items</li>
                    <li>Consistent spacing and alignment</li>
                    <li>Section dividers for organization</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-neutral-50 rounded-md border">
                <h2 className="text-lg font-semibold mb-2 flex items-center">
                  <span className="inline-block h-3 w-3 rounded-full bg-accent mr-2"></span>
                  Accent Color Usage
                </h2>
                <p className="text-neutral-600">
                  The red accent color (<code className="bg-neutral-100 px-1 py-0.5 rounded text-accent">#CC3333</code>) is used for:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-sm mt-2">
                  <li>Important call-to-action buttons</li>
                  <li>Notification indicators</li>
                  <li>Status badges for urgent items</li>
                  <li>Icons that need emphasis</li>
                </ul>
              </div>
              
              <div className="mt-6 text-sm text-neutral-500">
                <p>
                  This navigation system is part of our broader UI standardization effort, creating a cohesive visual experience with our brand colors.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 