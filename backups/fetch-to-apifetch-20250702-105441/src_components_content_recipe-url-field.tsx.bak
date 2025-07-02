'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Link, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RecipeUrlOptions } from '@/types/template';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

interface RecipeUrlFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  options?: RecipeUrlOptions;
  helpText?: string;
  error?: string;
  onRecipeDataExtracted?: (data: Record<string, string>) => void;
}

interface ExtractedRecipeData {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  nutrition: string;
  imageUrl: string;
  author: string;
  source: string;
}

export function RecipeUrlField({
  id,
  label,
  value,
  onChange,
  required,
  options,
  helpText,
  error,
  onRecipeDataExtracted
}: RecipeUrlFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedRecipeData | null>(null);

  const handleScrapeRecipe = async () => {
    if (!value.trim()) {
      toast.error('Please enter a recipe URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(value);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/content/scrape-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: value }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setExtractedData(data.data);
        setShowPreview(true);
        toast.success('Recipe data extracted successfully!');
        
        // If auto-populate is enabled and callback is provided
        if (options?.autoPopulateFields && onRecipeDataExtracted) {
          const mappedData: Record<string, string> = {};
          
          // Map the extracted data to field IDs if mapping is provided
          if (options.fieldsMapping) {
            Object.entries(options.fieldsMapping).forEach(([key, fieldId]) => {
              if (fieldId && data.data[key]) {
                mappedData[fieldId] = data.data[key];
              }
            });
          }
          
          onRecipeDataExtracted(mappedData);
        }
      } else {
        throw new Error(data.error || 'Failed to extract recipe data');
      }
    } catch (error) {
      console.error('Error scraping recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract recipe data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="flex gap-2">
        <Input
          id={id}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/recipe"
          className={error ? 'border-red-500' : ''}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleScrapeRecipe}
          disabled={isLoading || !value.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Link className="mr-2 h-4 w-4" />
              Extract Recipe
            </>
          )}
        </Button>
      </div>

      {helpText && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {showPreview && extractedData && (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <h4 className="font-semibold">Extracted Recipe Data:</h4>
              
              {extractedData.title && (
                <div>
                  <Label className="text-xs">Title</Label>
                  <p className="text-sm">{extractedData.title}</p>
                </div>
              )}

              {extractedData.description && (
                <div>
                  <Label className="text-xs">Description</Label>
                  <p className="text-sm">{extractedData.description}</p>
                </div>
              )}

              {extractedData.ingredients && (
                <div>
                  <Label className="text-xs">Ingredients</Label>
                  <Textarea 
                    value={extractedData.ingredients} 
                    readOnly 
                    className="text-sm h-24"
                  />
                </div>
              )}

              {extractedData.instructions && (
                <div>
                  <Label className="text-xs">Instructions</Label>
                  <Textarea 
                    value={extractedData.instructions} 
                    readOnly 
                    className="text-sm h-32"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {extractedData.prepTime && (
                  <div>
                    <Label className="text-xs">Prep Time</Label>
                    <p>{extractedData.prepTime}</p>
                  </div>
                )}
                {extractedData.cookTime && (
                  <div>
                    <Label className="text-xs">Cook Time</Label>
                    <p>{extractedData.cookTime}</p>
                  </div>
                )}
                {extractedData.totalTime && (
                  <div>
                    <Label className="text-xs">Total Time</Label>
                    <p>{extractedData.totalTime}</p>
                  </div>
                )}
                {extractedData.servings && (
                  <div>
                    <Label className="text-xs">Servings</Label>
                    <p>{extractedData.servings}</p>
                  </div>
                )}
              </div>

              {extractedData.nutrition && (
                <div>
                  <Label className="text-xs">Nutrition</Label>
                  <p className="text-sm">{extractedData.nutrition}</p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                Hide Preview
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}