'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { useToast } from '@/components/use-toast';
import { Loader2, ChevronLeft } from 'lucide-react';

// Default templates data for system templates
const defaultTemplates = {
  'article-template': {
    id: 'article-template',
    name: 'Basic Article Template',
    description: 'A simple article template with title, body, and metadata',
    fields: {
      inputFields: [
        {
          id: 'title',
          name: 'Title',
          type: 'shortText',
          required: true,
          options: { maxLength: 100 },
          aiSuggester: true,
          aiPrompt: 'Suggest a catchy title based on the article topic and brand voice.'
        },
        {
          id: 'topic',
          name: 'Topic',
          type: 'shortText',
          required: true,
          options: {},
          aiSuggester: false
        },
        {
          id: 'keywords',
          name: 'Keywords',
          type: 'tags',
          required: false,
          options: { maxTags: 5 },
          aiSuggester: true,
          aiPrompt: 'Suggest relevant SEO keywords for this article about {{topic}}.'
        }
      ],
      outputFields: [
        {
          id: 'body',
          name: 'Article Body',
          type: 'richText',
          required: true,
          options: {},
          aiAutoComplete: true,
          aiPrompt: 'Write an informative article about {{topic}} using the keywords {{keywords}}.'
        },
        {
          id: 'meta-description',
          name: 'Meta Description',
          type: 'plainText',
          required: false,
          options: { maxLength: 160 },
          aiAutoComplete: true,
          aiPrompt: 'Write an SEO-optimized meta description for an article about {{topic}}.'
        }
      ]
    }
  },
  'product-template': {
    id: 'product-template',
    name: 'Product Description Template',
    description: 'Template for creating product descriptions with features and benefits',
    fields: {
      inputFields: [
        {
          id: 'product-name',
          name: 'Product Name',
          type: 'shortText',
          required: true,
          options: {},
          aiSuggester: false
        },
        {
          id: 'category',
          name: 'Product Category',
          type: 'select',
          required: true,
          options: { choices: ['Electronics', 'Clothing', 'Home Goods', 'Beauty', 'Food'] },
          aiSuggester: false
        },
        {
          id: 'features',
          name: 'Key Features',
          type: 'longText',
          required: true,
          options: {},
          aiSuggester: false
        },
        {
          id: 'target-audience',
          name: 'Target Audience',
          type: 'shortText',
          required: false,
          options: {},
          aiSuggester: true,
          aiPrompt: 'Suggest target audiences for a {{category}} product named {{product-name}}.'
        }
      ],
      outputFields: [
        {
          id: 'short-description',
          name: 'Short Description',
          type: 'plainText',
          required: true,
          options: { maxLength: 200 },
          aiAutoComplete: true,
          aiPrompt: 'Write a short, compelling product description for {{product-name}} highlighting the main features.'
        },
        {
          id: 'long-description',
          name: 'Long Description',
          type: 'richText',
          required: true,
          options: {},
          aiAutoComplete: true,
          aiPrompt: 'Write a detailed product description for {{product-name}} with these key features: {{features}}. Target audience: {{target-audience}}.'
        },
        {
          id: 'benefits',
          name: 'Key Benefits',
          type: 'plainText',
          required: false,
          options: {},
          aiAutoComplete: true,
          aiPrompt: 'List the main benefits of {{product-name}} for the {{target-audience}}.'
        }
      ]
    }
  }
};

export default function TemplateEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);

      // Check if this is a default template
      if (id === 'article-template' || id === 'product-template') {
        setTemplate(defaultTemplates[id as keyof typeof defaultTemplates]);
        setLoading(false);
        return;
      }

      // Otherwise, try to fetch from the API
      try {
        const response = await fetch(`/api/content-templates/${id}`);
        const data = await response.json();

        if (data.success) {
          setTemplate(data.template);
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to load template',
            variant: 'destructive',
          });
          router.push('/dashboard/templates');
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        toast({
          title: 'Error',
          description: 'Failed to load template',
          variant: 'destructive',
        });
        router.push('/dashboard/templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id, router, toast]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <PageHeader
        title={`Edit ${template?.name || 'Template'}`}
        description="Modify your content template configuration"
        actions={
          <Link href="/dashboard/templates">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
          </Link>
        }
      />
      
      {template && <TemplateForm initialData={template} />}
    </div>
  );
} 