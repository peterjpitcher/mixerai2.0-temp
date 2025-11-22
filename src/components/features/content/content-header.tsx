import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './breadcrumbs';
import { ActiveBrandIndicator } from '@/components/ui/active-brand-indicator';

interface ContentHeaderProps {
  templateName?: string;
  onBack?: () => void;
  activeBrand?: {
    id: string;
    name: string;
    brand_color?: string | null;
    logo_url?: string | null;
  };
}

export function ContentHeader({ templateName, onBack, activeBrand }: ContentHeaderProps) {
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Content', href: '/dashboard/content' },
    { label: templateName || 'Create New' }
  ];

  return (
    <div className="mb-8">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Content
      </Button>
      
      <Breadcrumbs items={breadcrumbItems} />
      
      {activeBrand && (
        <div className="my-4">
          <ActiveBrandIndicator
            brandName={activeBrand.name}
            brandColor={activeBrand.brand_color}
            brandLogoUrl={activeBrand.logo_url}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New {templateName || 'Content'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {templateName 
              ? `Fill in the required fields to generate ${templateName.toLowerCase()} content.`
              : 'Select a template and fill in the required fields to generate content.'}
          </p>
        </div>
      </div>
    </div>
  );
}