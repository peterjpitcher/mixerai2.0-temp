'use client';

import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';

// Metadata for a redirecting page might be minimal or not strictly necessary
// as user shouldn't spend time here.
// export const metadata: Metadata = {
//   title: 'Creating New Brand | MixerAI 2.0',
//   description: 'Redirecting to the brand creation page.',
// };

/**
 * NewBrandPage allows users to create a new brand profile.
 * TODO: Implement the full brand creation form here.
 */
export default function NewBrandPage() {
  const router = useRouter();
  
  const handleCancel = () => {
    router.push('/dashboard/brands'); // Navigate back to the brands list
  };

  // Placeholder for form submission logic
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement form submission logic (call POST /api/brands)
    console.log('Form submission placeholder');
    // On success: router.push('/dashboard/brands');
    // On error: show toast
  };
  
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold tracking-tight">Create New Brand</h1>
         <Button variant="outline" onClick={handleCancel}>Cancel</Button>
       </div>
       
       <Card>
         <CardHeader>
           <CardTitle>Brand Details</CardTitle>
         </CardHeader>
         <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* TODO: Replace with actual BrandForm component or form fields */}
              <p className="text-muted-foreground p-4 border rounded">
                Placeholder for Brand Creation Form Fields (Name, Website, Country, Language, Identity, Tone, Guardrails etc.)
              </p>
              <div className="flex justify-end">
                  <Button type="submit">Create Brand (Placeholder)</Button>
              </div>
            </form>
         </CardContent>
       </Card>
    </div>
  );
} 