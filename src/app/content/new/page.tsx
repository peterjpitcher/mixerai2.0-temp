import { ContentGeneratorForm } from '@/components/content/content-generator-form';

export const metadata = {
  title: 'Create New Content | MixerAI',
  description: 'Generate new AI content for your brands',
};

export default function NewContentPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Content</h1>
          <p className="text-muted-foreground">
            Generate high-quality marketing content with AI
          </p>
        </div>
      </div>
      
      <ContentGeneratorForm />
    </div>
  );
} 