'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from "sonner";
import { BrandIcon } from '@/components/brand-icon';
// import { RadioGroup, RadioGroupItem } from '@/components/radio-group'; // File not found, commenting out import
import { scrapeUrlsFromText, extractUrls } from '@/lib/utils/url-scraper';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QuillEditor } from '@/components/content/quill-editor';
import 'quill/dist/quill.snow.css';
import { ArticleDetailsSidebar } from './article-details-sidebar';
import type { Brand } from '@/types/models'; // Import the new Brand type
import { apiFetch } from '@/lib/api-client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function ArticleGeneratorForm() {
  const router = useRouter();
  
  // State for form fields
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [titleKeyword, setTitleKeyword] = useState('');
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [primaryKeywords, setPrimaryKeywords] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [stimulus, setStimulus] = useState('');
  const [description, setDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  
  // State for generated content
  const [generatedContent, setGeneratedContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [urlSlug, setUrlSlug] = useState('');
  
  // State for UI tabs
  const [activeTab, setActiveTab] = useState('generate');
  
  // Loading states
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScrapingUrls, setIsScrapingUrls] = useState(false);
  
  // State for SEO tracking
  // const [contentLastUpdated, setContentLastUpdated] = useState(Date.now());
  // const [hasKeywordInH1, setHasKeywordInH1] = useState(false);
  // const [hasKeywordInH2, setHasKeywordInH2] = useState(false);
  // const [hasKeywordInH3, setHasKeywordInH3] = useState(false);
  // const [hasKeywordInH4, setHasKeywordInH4] = useState(false);
  
  useEffect(() => {
    // Fetch brands
    const fetchBrands = async () => {
      try {
        const response = await apiFetch('/api/brands');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.brands)) {
          setBrands(data.brands);
        } else {
          setBrands([]);
          sonnerToast.error("Error fetching brands", { description: "Could not load brands. Please try again." });
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        setBrands([]);
        sonnerToast.error("Error fetching brands", { description: "Could not load brands. Please try again." });
      }
    };
    
    fetchBrands();
  }, []);
  
  // Check SEO criteria whenever content changes
  // useEffect(() => {
  //   if (editableContent && focusKeyword) {
  //     const lowercaseKeyword = focusKeyword.toLowerCase();
      
  //     const tempDiv = document.createElement('div');
  //     tempDiv.innerHTML = editableContent;

  //     const checkKeywordInHeadings = (tag: string): boolean => {
  //       const headings = tempDiv.getElementsByTagName(tag);
  //       for (let i = 0; i < headings.length; i++) {
  //         if (headings[i].textContent?.toLowerCase().includes(lowercaseKeyword)) {
  //           return true;
  //         }
  //       }
  //       return false;
  //     };
      
  //     setHasKeywordInH1(checkKeywordInHeadings('h1'));
  //     setHasKeywordInH2(checkKeywordInHeadings('h2'));
  //     setHasKeywordInH3(checkKeywordInHeadings('h3'));
  //     setHasKeywordInH4(checkKeywordInHeadings('h4'));
  //   } else {
  //     // Reset if no content or keyword
  //     setHasKeywordInH1(false);
  //     setHasKeywordInH2(false);
  //     setHasKeywordInH3(false);
  //     setHasKeywordInH4(false);
  //   }
  // }, [editableContent, focusKeyword, contentLastUpdated]);
  
  const handleGenerateTitles = async () => {
    if (!selectedBrand) {
      sonnerToast.error("Brand required", { description: "Please select a brand first" });
      return;
    }
    
    setIsGeneratingTitles(true);
    
    try {
      const response = await apiFetch('/api/content/generate/article-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrand,
          keyword: titleKeyword || undefined
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate titles');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.titles)) {
        setGeneratedTitles(data.titles);
        // Reset selected title when we generate new titles
        setSelectedTitle('');
      } else {
        throw new Error(data.error || 'Failed to generate titles');
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      sonnerToast.error("Error generating titles", { description: "Could not generate article titles. Please try again." });
    } finally {
      setIsGeneratingTitles(false);
    }
  };
  
  const handleTitleSelect = (title: string) => {
    setSelectedTitle(title);
    
    // Only auto-generate if this is the first time selecting a title
    const isFirstTitleSelection = !selectedTitle;
    
    // If selecting title for the first time, auto-generate everything
    if (isFirstTitleSelection) {
      // Brief delay to ensure the title is set
      setTimeout(() => {
        autoGenerateAllFields();
      }, 500);
    }
  };
  
  const handleManualTitleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTitle(e.target.value);
    
    // Reset the flag when the title changes
    if (e.target.value && e.target.value.length > 10) {
      // Show a toast with option to auto-generate
      sonnerToast.info("Would you like to auto-generate fields?", {
        description: "Fields will auto-generate in 5 seconds based on this title.",
        duration: 5000 
      });
      
      // Auto-generate after a delay
      setTimeout(() => {
        autoGenerateAllFields();
      }, 5000);
    }
  };
  
  const handleGenerateContent = async () => {
    if (!selectedBrand || !selectedTitle) {
      sonnerToast.error("Missing fields", { description: "Please select a brand and provide an article title" });
      return;
    }
    
    // Ensure we have a focus keyword for SEO
    if (!focusKeyword) {
      sonnerToast.error("Missing focus keyword", { description: "Please provide a focus keyword for SEO optimization" });
      return;
    }
    
    setIsGeneratingContent(true);
    
    try {
      const selectedBrandObj = brands.find(b => b.id === selectedBrand);
      
      if (!selectedBrandObj) {
        throw new Error('Selected brand not found');
      }
      
      // Prepare keywords array from both primary and secondary keywords
      const keywordsArray = [
        ...primaryKeywords.split(',').map(k => k.trim()).filter(k => k),
        ...secondaryKeywords.split(',').map(k => k.trim()).filter(k => k)
      ];
      
      // Scrape any URLs from the stimulus
      let scrapedContentText = '';
      try {
        const scrapedContent = await scrapeUrlsFromText(stimulus);
        if (scrapedContent.length > 0) {
          scrapedContentText = "\n\nRelevant content from referenced URLs:\n" + 
                             scrapedContent.map(item => 
                               `From ${item.title || item.url}:\n${item.content.substring(0, 800)}...`
                             ).join("\n\n");
        }
      } catch (error) {
        console.error("Error scraping URLs for content generation:", error);
      }
      
      // Append scraped content to stimulus if available
      const enhancedStimulus = stimulus + (scrapedContentText ? scrapedContentText : '');
      
      // Check if food/recipe related to add specific instructions
      const foodRelatedTerms = [
        'recipe', 'food', 'cooking', 'baking', 'meal', 'dish', 'dessert'
      ];
      
      // Detect if this might be food content
      const isFoodRelated = 
        selectedTitle.toLowerCase().split(' ').some(word => foodRelatedTerms.includes(word)) || 
        keywordsArray.some(keyword => foodRelatedTerms.some(term => keyword.toLowerCase().includes(term))) ||
        selectedBrandObj.name.toLowerCase().includes('food') ||
        selectedBrandObj.name.includes('recipe') ||
        selectedBrandObj.name.toLowerCase().includes('betty crocker');
      
      // Standard instructions that apply to all content
      const standardInstructions = [
        "Do not use 'Conclusion' as a heading in the final section of the article.",
        "Use alternative headings like 'Final Thoughts', 'Wrapping Up', 'Moving Forward', 'Next Steps', or 'Summary'.",
        "Do not wrap the article title or any headings in quotes.",
        "If URLs to recipes are included in the stimulus, you may include the full recipes or link to them directly.",
      ].join(" ");
      
      // Brand-specific instructions
      const brandInstructions: string[] = [];
      
      if (selectedBrandObj.brand_identity) {
        brandInstructions.push(`Brand Identity: ${selectedBrandObj.brand_identity}. Ensure the content reflects this brand identity throughout.`);
      }
      
      if (selectedBrandObj.tone_of_voice) {
        brandInstructions.push(`Tone of Voice: ${selectedBrandObj.tone_of_voice}. The article must use this tone consistently.`);
      }
      
      if (selectedBrandObj.guardrails) {
        brandInstructions.push(`Guardrails: ${selectedBrandObj.guardrails}. Strictly adhere to these content guidelines.`);
      }
      
      if (selectedBrandObj.country || selectedBrandObj.language) {
        const locale = [selectedBrandObj.country, selectedBrandObj.language].filter(Boolean).join(', ');
        brandInstructions.push(`Target Audience Locale: ${locale}. Adapt content appropriately for this market/language.`);
      }
      
      const brandInstructionsText = brandInstructions.length > 0 ? brandInstructions.join(' ') : '';
      
      // SEO instructions to incorporate focus keywords
      const seoInstructions = [
        `Focus keyword: "${focusKeyword}" - This must appear in:`,
        "- The H1 title (make sure it's already included or add it naturally)",
        "- At least one H2 heading",
        "- At least one H3 heading", 
        "- At least one H4 heading",
        "- Throughout the body text in a natural way",
        "- Write at least 1200 words of content",
        "- Include external links to credible sources where relevant",
        "- Use emotional storytelling techniques especially in the introduction",
        "- Write in a clear, conversational yet authoritative tone",
        "- Start with an engaging introduction using emotional storytelling",
        "- Ensure all content is both engaging for readers and optimized for search engines"
      ].join(" ");
      
      // Additional instructions for food content - moved recipe guidance here
      const recipeInstructions = isFoodRelated ? 
        "For food content: Only create detailed recipes if they're specifically referenced in the stimulus or URLs. Otherwise, focus on cooking techniques, tips, and advice." : "";
      
      // Generate SEO-friendly URL slug
      const generatedSlug = generateSlug(selectedTitle, focusKeyword);
      setUrlSlug(generatedSlug);
      
      const response = await apiFetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: 'article',
          brand: {
            name: selectedBrandObj.name,
            brand_identity: selectedBrandObj.brand_identity || '',
            tone_of_voice: selectedBrandObj.tone_of_voice || '',
            guardrails: selectedBrandObj.guardrails || '',
            country: selectedBrandObj.country || '',
            language: selectedBrandObj.language || '',
          },
          input: {
            topic: selectedTitle,
            keywords: keywordsArray,
            focusKeyword: focusKeyword,
            additionalInstructions: `Use this as input/stimulus: ${enhancedStimulus}. ${description ? `Description: ${description}` : ''} ${brandInstructionsText} ${standardInstructions} ${seoInstructions} ${recipeInstructions}`,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate content');
      }
      
      const data = await response.json();
      
      // Ensure the title isn't wrapped in quotes by removing them if present
      if (data.metaTitle && (data.metaTitle.startsWith('"') || data.metaTitle.startsWith('"'))) {
        data.metaTitle = data.metaTitle.replace(/^[""](.*)[""]$/, '$1');
      }
      
      // Ensure meta title includes focus keyword
      if (data.metaTitle && !data.metaTitle.toLowerCase().includes(focusKeyword.toLowerCase())) {
        data.metaTitle = `${data.metaTitle} - ${focusKeyword}`;
      }
      
      // Ensure meta description includes focus keyword
      if (data.metaDescription && !data.metaDescription.toLowerCase().includes(focusKeyword.toLowerCase())) {
        const truncatedDesc = data.metaDescription.substring(0, 120);
        data.metaDescription = `${truncatedDesc}... Learn more about ${focusKeyword}.`;
      }
      
      setGeneratedContent(data.content);
      setEditableContent(data.content); // Initialize editable content with generated content
      setMetaTitle(data.metaTitle);
      setMetaDescription(data.metaDescription);
      
      // Switch to the article tab after generation
      setActiveTab('article');
    } catch (error) {
      console.error('Error generating content:', error);
      sonnerToast.error("Generation failed", { description: "Failed to generate article content. Please try again." });
      // Add a warning toast for URL scraping failure
      sonnerToast.warning("URL scraping issue during content generation", { description: "Could not scrape some URLs. Content generation will proceed without them." });
    } finally {
      setIsGeneratingContent(false);
    }
  };
  
  const handleAutoGenerateDescription = async () => {
    if (!selectedTitle || !primaryKeywords) {
      sonnerToast.error("Missing fields", { description: "Please provide a title and primary keywords" });
      return;
    }
    
    // Enhanced food detection with more thorough keyword matching
    const keywordsArray = primaryKeywords.split(',').map(k => k.trim());
    const foodRelatedTerms = [
      'recipe', 'food', 'cooking', 'baking', 'meal', 'dish', 'dessert', 'breakfast', 
      'lunch', 'dinner', 'snack', 'appetizer', 'ingredient', 'kitchen', 'cook', 
      'bake', 'eat', 'delicious', 'tasty', 'flavor', 'delights', 'feast', 'treats',
      'cuisine', 'culinary', 'grill', 'roast', 'fry', 'sauté', 'simmer', 'boil',
      'vegetable', 'fruit', 'meat', 'poultry', 'seafood', 'fish', 'sauce', 'spice',
      'herb', 'cream', 'butter', 'oil', 'chocolate', 'sugar', 'flour', 'cake',
      'pie', 'cookie', 'bread', 'pasta', 'noodle', 'rice', 'soup', 'salad',
      'sandwich', 'drink', 'beverage', 'cocktail', 'smoothie', 'juice'
    ];
    
    // Get the selected brand for brand-specific customization
    const selectedBrandObj = brands.find(b => b.id === selectedBrand);
    const brandName = selectedBrandObj?.name || '';
    
    // Enhanced detection: check title, keywords, and brand name
    const isFoodRelated = 
      selectedTitle.toLowerCase().split(' ').some(word => foodRelatedTerms.includes(word)) || 
      keywordsArray.some(keyword => foodRelatedTerms.some(term => keyword.toLowerCase().includes(term))) ||
      brandName.toLowerCase().includes('betty crocker') ||
      brandName.toLowerCase().includes('food') ||
      brandName.toLowerCase().includes('recipe');
    
    let generatedDescription = '';
    
    if (isFoodRelated) {
      // Enhanced food/recipe-oriented description with more specific elements
      generatedDescription = 
        `This article will provide readers with practical, easy-to-follow recipes and cooking tips for ${selectedTitle}. ` +
        `It will include 3-5 detailed recipes featuring ${keywordsArray.join(', ')}, with complete ingredients lists and step-by-step instructions. ` +
        `The content will highlight seasonal ingredients, quick preparation options, and helpful presentation ideas. ` +
        `Readers will find practical cooking techniques, food storage recommendations, and serving suggestions. ` +
        `The recipes are designed for home cooks of all skill levels, with options for different dietary needs and preferences. ` +
        `Each recipe will include prep time, cooking time, difficulty level, and yield information to help readers plan their cooking.`;
    } else {
      // Enhanced practical description for non-food content
      generatedDescription = 
        `This practical article will provide actionable guidance about ${selectedTitle}, focusing primarily on ${keywordsArray.join(', ')}. ` +
        `It will offer step-by-step instructions, troubleshooting advice, and real-world applications that readers can implement immediately. ` +
        `The content will address common challenges, provide specific solutions, and include relevant examples from everyday situations. ` +
        `Rather than theoretical concepts, this article emphasizes practical techniques, tools, and resources that readers can use right away. ` +
        `It's structured with scannable bullet points, numbered steps, and quick tips to help readers find exactly what they need. ` +
        `The target audience includes people looking for clear, actionable advice they can apply today to solve problems related to this topic.`;
    }
    
    setDescription(generatedDescription);
    
    sonnerToast.success("Detailed description generated", { description: "A practical description has been created for your article." });
  };
  
  const handleAutoGeneratePrimaryKeywords = async () => {
    if (!selectedTitle) {
      sonnerToast.error("Missing title", { description: "Please provide an article title first" });
      return;
    }
    
    // Use the selected brand for context if available
    const selectedBrandObj = brands.find(b => b.id === selectedBrand);
    if (!selectedBrandObj) {
      sonnerToast.error("Brand required", { description: "Please select a brand first" });
      return;
    }
    
    setIsGeneratingContent(true);
    
    try {
      // Call the API for AI-generated keywords
      const response = await apiFetch('/api/content/generate/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand,
          topic: selectedTitle,
          keywordType: 'primary',
          count: 5
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate primary keywords');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.keywords)) {
        setPrimaryKeywords(data.keywords.join(', '));
        
        sonnerToast.success("Primary keywords generated", { description: `Keywords: "${data.keywords.join(', ')}"` });
      } else {
        throw new Error(data.error || 'Failed to generate keywords');
      }
    } catch (error) {
      console.error('Error generating primary keywords:', error);
      
      // Make a direct call to generate keywords through Azure OpenAI
      try {
        const aiResponse = await apiFetch('/api/tools/metadata-generator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedTitle,
            brand: selectedBrandObj.name,
            type: 'keywords',
            count: 5
          })
        });
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.success && aiData.keywords) {
            setPrimaryKeywords(aiData.keywords.join(', '));
            sonnerToast.success("Keywords generated", { description: "Keywords generated using advanced AI analysis." });
            setIsGeneratingContent(false);
            return;
          }
        }
      } catch (secondaryError) {
        console.error('Error with fallback keyword generation:', secondaryError);
      }
      
      // Final fallback with more intelligent keyword generation
      const brandName = selectedBrandObj?.name || '';
      const titleLower = selectedTitle.toLowerCase();
      
      // More intelligent keyword generation based on topic analysis
      let keywordCandidates: string[] = [];
      
      // Use entire title as a base keyword
      keywordCandidates.push(selectedTitle);
      
      // Industry-specific keywords
      if (brandName.includes('Food') || 
          titleLower.includes('recipe') || 
          titleLower.includes('cook') || 
          titleLower.includes('meal')) {
        // Food industry
        keywordCandidates = [
          ...keywordCandidates,
          `${selectedTitle} recipe`,
          'easy recipes',
          'healthy meals',
          'cooking tips',
          'home cooking',
          'quick meals',
          'meal ideas'
        ];
      } else if (brandName.includes('Garden') || 
                titleLower.includes('garden') || 
                titleLower.includes('plant') || 
                titleLower.includes('grow')) {
        // Gardening industry  
        keywordCandidates = [
          ...keywordCandidates,
          `${selectedTitle} guide`,
          'gardening tips',
          'plant care',
          'garden ideas',
          'growing guide',
          'landscaping tips',
          'home garden'
        ];
      } else if (brandName.includes('Tech') || 
                titleLower.includes('technology') || 
                titleLower.includes('digital') || 
                titleLower.includes('app') ||
                titleLower.includes('software')) {
        // Tech industry
        keywordCandidates = [
          ...keywordCandidates,
          `${selectedTitle} guide`,
          'tech tips',
          'technology trends',
          'digital solutions',
          'tech how-to',
          'software guide',
          'tech advice'
        ];
      } else if (brandName.includes('Health') || 
                titleLower.includes('health') || 
                titleLower.includes('fitness') || 
                titleLower.includes('wellness')) {
        // Health industry
        keywordCandidates = [
          ...keywordCandidates,
          `${selectedTitle} guide`,
          'health tips',
          'wellness advice',
          'fitness guide',
          'healthy lifestyle',
          'wellbeing tips',
          'self-care'
        ];
      } else {
        // Generic but more intelligent keywords
        const mainTopic = selectedTitle.split(' ').slice(0, 2).join(' ');
        keywordCandidates = [
          ...keywordCandidates,
          `${mainTopic} guide`,
          `${mainTopic} tips`,
          `${mainTopic} best practices`,
          `${mainTopic} advice`,
          `${mainTopic} ideas`,
          `how to ${mainTopic}`,
          `${mainTopic} examples`
        ];
      }
      
      // Get 5 unique keywords
      const uniqueKeywords = Array.from(new Set(keywordCandidates))
        .filter(k => k && k.trim() !== '')
        .slice(0, 5);
      
      setPrimaryKeywords(uniqueKeywords.join(', '));
      
      sonnerToast.success("Using smart keywords", { description: "Generated relevant keywords based on content analysis." });
    } finally {
      setIsGeneratingContent(false);
    }
  };
  
  const handleAutoGenerateSecondaryKeywords = async () => {
    if (!selectedTitle || !primaryKeywords) {
      sonnerToast.error("Missing fields", { description: "Please provide a title and primary keywords first" });
      return;
    }
    
    setIsGeneratingContent(true);
    
    try {
      // Parse primary keywords to pass to the API
      const primaryKeywordsArray = primaryKeywords.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await apiFetch('/api/content/generate/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand,
          topic: selectedTitle,
          keywordType: 'secondary',
          count: 5,
          existingKeywords: primaryKeywordsArray
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate secondary keywords');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.keywords)) {
        setSecondaryKeywords(data.keywords.join(', '));
        
        sonnerToast.success("Secondary keywords generated", { description: `Keywords: "${data.keywords.join(', ')}"` });
      } else {
        throw new Error(data.error || 'Failed to generate keywords');
      }
    } catch (error) {
      console.error('Error generating secondary keywords:', error);
      
      // Fallback generation if API fails
      const primaryArray = primaryKeywords.split(',').map(k => k.trim());
      const secondaryArray = primaryArray.map(keyword => {
        return [`${keyword} best practices`, `${keyword} examples`, `${keyword} trends`];
      }).flat();
      
      setSecondaryKeywords(secondaryArray.slice(0, 5).join(', '));
      
      sonnerToast.info("Using simplified keyword generation", { description: `Keywords: "${secondaryArray.slice(0, 5).join(', ')}"` });
    } finally {
      setIsGeneratingContent(false);
    }
  };
  
  const handleAutoGenerateStimulus = async () => {
    if (!selectedTitle || !primaryKeywords) {
      sonnerToast.error("Missing fields", { description: "Please provide a title and keywords first" });
      return;
    }
    
    // Ensure there's a focus keyword
    if (!focusKeyword) {
      sonnerToast.error("Missing focus keyword", { description: "Please set a focus keyword for SEO optimization" });
      return;
    }
    
    setIsGeneratingContent(true);
    
    try {
      // Enhanced stimulus generation with more recipe-focused content
      const keywordsArray = primaryKeywords.split(',').map(k => k.trim());
      const secondaryKeywordsArray = secondaryKeywords.split(',').map(k => k.trim());
      
      // Enhanced food detection with more thorough keyword matching
      const foodRelatedTerms = [
        'recipe', 'food', 'cooking', 'baking', 'meal', 'dish', 'dessert', 'breakfast', 
        'lunch', 'dinner', 'snack', 'appetizer', 'ingredient', 'kitchen', 'cook', 
        'bake', 'eat', 'delicious', 'tasty', 'flavor', 'delights', 'feast', 'treats',
        'cuisine', 'culinary', 'grill', 'roast', 'fry', 'sauté', 'simmer', 'boil',
        'vegetable', 'fruit', 'meat', 'poultry', 'seafood', 'fish', 'sauce', 'spice',
        'herb', 'cream', 'butter', 'oil', 'chocolate', 'sugar', 'flour', 'cake',
        'pie', 'cookie', 'bread', 'pasta', 'noodle', 'rice', 'soup', 'salad',
        'sandwich', 'drink', 'beverage', 'cocktail', 'smoothie', 'juice'
      ];
      
      // Get the selected brand for brand-specific customization
      const selectedBrandObj = brands.find(b => b.id === selectedBrand);
      const brandName = selectedBrandObj?.name || '';
      
      // Create brand-specific guidance
      let brandGuidance = '';
      if (selectedBrandObj) {
        const brandAttributes: string[] = [];
        
        if (selectedBrandObj.brand_identity) {
          brandAttributes.push(`## Brand Identity\n${selectedBrandObj.brand_identity}`);
        }
        
        if (selectedBrandObj.tone_of_voice) {
          brandAttributes.push(`## Tone of Voice\n${selectedBrandObj.tone_of_voice}`);
        }
        
        if (selectedBrandObj.guardrails) {
          brandAttributes.push(`## Content Guardrails\n${selectedBrandObj.guardrails}`);
        }
        
        if (selectedBrandObj.country || selectedBrandObj.language) {
          const locale = [selectedBrandObj.country, selectedBrandObj.language].filter(Boolean).join(', ');
          brandAttributes.push(`## Target Audience\n${locale}`);
        }
        
        if (brandAttributes.length > 0) {
          brandGuidance = `\n\n# Brand Guidelines\n${brandAttributes.join('\n\n')}\n\n`;
        }
      }
      
      // Enhanced detection: check title, keywords, and brand name
      const isFoodRelated = 
        selectedTitle.toLowerCase().split(' ').some(word => foodRelatedTerms.includes(word)) || 
        keywordsArray.some(keyword => foodRelatedTerms.some(term => keyword.toLowerCase().includes(term))) ||
        brandName.toLowerCase().includes('betty crocker') ||
        brandName.toLowerCase().includes('food') ||
        brandName.toLowerCase().includes('recipe');
      
      // Scrape any URLs from the stimulus (if it contains any)
      let scrapedContentText = '';
      let hasRecipeUrls = false;
      if (stimulus.includes('http')) {
        try {
          const scrapedContent = await scrapeUrlsFromText(stimulus);
          if (scrapedContent.length > 0) {
            // Check if any URLs might contain recipes
            hasRecipeUrls = scrapedContent.some(item => 
              item.title?.toLowerCase().includes('recipe') || 
              item.content?.toLowerCase().includes('recipe') ||
              item.content?.toLowerCase().includes('ingredients') ||
              item.url?.toLowerCase().includes('recipe')
            );
            
            scrapedContentText = "\n\n## Reference Content\nHere is relevant content from referenced URLs:\n\n" + 
                               scrapedContent.map(item => 
                                 `### From ${item.title || item.url}\n${item.content.substring(0, 1000)}...`
                               ).join("\n\n");
            
            sonnerToast.success("URLs scraped", { description: `Successfully scraped content from ${scrapedContent.length} URLs.` });
          }
        } catch (error) {
          console.error("Error scraping URLs:", error);
          sonnerToast.error("URL scraping issue", { description: "Could not scrape some URLs. Proceeding with other content." });
        }
      }
      
      // SEO guidelines to include in the stimulus for both food and non-food content
      const seoGuidelines = `
## SEO Requirements
- Focus keyword: "${focusKeyword}" - must be used in:
  - The H1 title (already included or naturally integrated)
  - At least one H2 heading
  - At least one H3 heading
  - At least one H4 heading
  - Meta title and meta description
  - URL slug
  - Throughout the body copy in a natural way
- Write at least 1200 words of content
- Include external links to credible sources where relevant
- Use emotional storytelling techniques especially in the introduction
- Structure for SEO:
  - Start with an engaging introduction using emotional storytelling
  - Use H2 headings for main sections
  - Use H3 and H4 headings for subsections
  - Never use "Conclusion" as a heading - use "Final Thoughts" or similar instead
- Optimize for both reader engagement and search engine visibility
`;
      
      if (isFoodRelated) {
        // Enhanced food/recipe focused content brief with more specific recipe elements
        const generatedStimulus = 
          `# Content Brief: ${selectedTitle}\n\n` +
          
          `## Content Overview\n` +
          `Create a practical, appetizing article about ${selectedTitle} with helpful cooking tips and instructions. Focus on explaining cooking techniques and providing useful advice for home cooks.\n\n` +
          
          brandGuidance +
          
          `## Content Approach\n` + 
          `- Provide practical cooking advice and techniques related to ${selectedTitle}\n` +
          `- Explain food preparation methods and best practices\n` +
          `- Include helpful tips for working with relevant ingredients\n` +
          `- Share insights about cooking methods, timing, and temperatures\n` +
          `${hasRecipeUrls ? `- Reference and build upon recipes from the provided URLs` : ''}\n\n` +
          
          `## Key Ingredients to Discuss\n` +
          `- Seasonal ingredients that work well with ${selectedTitle}\n` +
          `- Pantry staples that home cooks likely already have\n` +
          `- ${brandName ? brandName + ' products that complement these dishes' : 'Key branded products that work well with this type of cooking'}\n` +
          `- Common ingredient substitutions for flexibility\n\n` +
          
          `## Practical Tips to Include\n` +
          `- Food preparation shortcuts and time-saving techniques\n` +
          `- Cooking methods with specific temperatures and times\n` +
          `- Visual doneness cues for foolproof results\n` +
          `- Food safety considerations\n` +
          `- Serving suggestions with presentation ideas\n` +
          `- Storage information and reheat instructions\n` +
          `- Pairing suggestions for complete meals\n\n` +
          
          `## Suggested Article Structure\n` +
          `1. Introduction: Engaging opening with emotional storytelling about ${selectedTitle}, including the focus keyword\n` +
          `2. Key Techniques: Cooking methods and approaches relevant to the topic (H2 heading with focus keyword)\n` +
          `3. Ingredient Tips: How to select, store, and prepare key ingredients (H3 heading with focus keyword)\n` +
          `4. Serving & Presentation: Ideas for making dishes look appetizing (H4 heading with focus keyword)\n` +
          `5. Final Thoughts: Encourage readers to apply these techniques to their cooking\n\n` +
          
          `## Tone and Approach\n` +
          `Write in a warm, encouraging tone as if sharing cooking advice with friends. Use sensory language to describe flavors, textures, and aromas. Focus on practical tips rather than complex culinary theory. Make readers feel confident they can achieve excellent results in their own kitchens.\n\n` +
          
          seoGuidelines +
          
          scrapedContentText;
          
        setStimulus(generatedStimulus);
      } else {
        // Enhanced practical content brief for non-food content
        // Create practical sections based on keywords
        const keywordSections = keywordsArray.map(keyword => 
          `Section on "${keyword}": Practical information, real-world examples, and actionable advice.`
        ).join('\n');
        
        // Create practical questions to address
        const questions = [
          `What practical tips can readers apply immediately about ${selectedTitle}?`,
          `What common challenges do people face with ${keywordsArray[0] || 'this topic'} and how can they be solved?`,
          `What are 3-5 specific steps to implement ${keywordsArray[1] || 'these ideas'} effectively?`,
          `What tools or resources help with ${keywordsArray[2] || 'this process'}?`,
          `How can readers measure success when applying this information?`
        ];
        
        // Create an enhanced practical content brief
        const generatedStimulus = 
          `# Content Brief for: ${selectedTitle}\n\n` +
          
          `## Topic Overview\n` +
          `Create a practical, solution-focused article about ${selectedTitle}. Focus on actionable information that readers can implement immediately rather than theoretical concepts.\n\n` +
          
          brandGuidance +
          
          `## Key Topics to Cover\n` + 
          `- ${keywordsArray.join('\n- ')}\n\n` +
          
          `## Secondary Topics\n` +
          `- ${secondaryKeywordsArray.length ? secondaryKeywordsArray.join('\n- ') : 'Build on the primary keywords with practical applications'}\n\n` +
          
          `## Suggested Structure\n` +
          `1. Introduction: Engaging opening with emotional storytelling about a problem ${selectedTitle} solves, including focus keyword\n` +
          `2. Brief Background: Only essential context (limit to 1-2 paragraphs)\n` +
          `3. Main Content (60-70% of the article - use H2 heading with focus keyword):\n${keywordSections}\n` +
          `4. Step-by-Step Implementation (use H3 heading with focus keyword): Numbered, actionable steps readers can follow\n` +
          `5. Real-World Examples (use H4 heading with focus keyword): Brief case studies showing the concepts in action\n` +
          `6. Problem-Solving Section: Address common challenges and solutions\n` +
          `7. Final Thoughts: Summarize key takeaways and encourage immediate action\n\n` +
          
          `## Questions to Address\n` +
          `- ${questions.join('\n- ')}\n\n` + 
          
          `## Content Elements to Include\n` +
          `- Bullet point lists for scannable information\n` +
          `- Numbered steps for processes\n` +
          `- Practical examples illustrating key points\n` +
          `- Brief "Quick Tips" callouts throughout the article\n` +
          `- One or two simple diagrams or frameworks if helpful\n` +
          `- A checklist readers can use to implement the advice\n\n` +
          
          `## Tone and Approach\n` +
          `Write in a direct, helpful tone that focuses on practical application. Avoid jargon or overly academic language. Use second-person ("you") to speak directly to readers. Emphasize how this information solves specific problems readers face. Balance thoroughness with accessibility - provide depth while keeping the content actionable.\n\n` +
          
          seoGuidelines +
          
          scrapedContentText;
        
        setStimulus(generatedStimulus);
      }
      
      sonnerToast.success("Detailed stimulus generated", { description: "A practical content brief has been created for your article." });
    } catch (error) {
      console.error('Error generating stimulus:', error);
      sonnerToast.error("Error generating stimulus", { description: "Couldn't generate stimulus content" });
    } finally {
      setIsGeneratingContent(false);
    }
  };
  
  const handleStimulusChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setStimulus(newValue);
    
    // Check if new URLs have been added
    const previousUrls = extractUrls(stimulus);
    const currentUrls = extractUrls(newValue);
    
    // Find newly added URLs
    const newUrls = currentUrls.filter(url => !previousUrls.includes(url));
    
    if (newUrls.length > 0) {
      setIsScrapingUrls(true);
      sonnerToast.info("Scraping URLs", { description: `Extracting content from ${newUrls.length} detected URLs...` });
      
      try {
        const scrapedContent = await scrapeUrlsFromText(newValue);
        if (scrapedContent.length > 0) {
          sonnerToast.success("URLs scraped", { description: `Successfully scraped content from ${scrapedContent.length} URLs.` });
        }
      } catch (error) {
        console.error("Error scraping URLs:", error);
        sonnerToast.error("URL scraping issue", { description: "Could not scrape some URLs. You can still proceed with other content." });
      } finally {
        setIsScrapingUrls(false);
      }
    }
  };
  
  const handleSave = async () => {
    if (!selectedBrand || !selectedTitle || !editableContent) {
      sonnerToast.error("Missing required fields", { description: "Please fill in all required fields and generate content first" });
      return;
    }
    
    // Validate SEO fields
    if (!focusKeyword) {
      sonnerToast.error("Missing focus keyword", { description: "A focus keyword is required for SEO optimization" });
      return;
    }
    
    // Validate URL slug
    if (!urlSlug) {
      // Generate a URL slug if it's missing
      setUrlSlug(generateSlug(selectedTitle, focusKeyword));
      sonnerToast.success("URL slug generated", { description: "A URL slug has been automatically generated" });
      return; // Return to let the user see the generated slug before saving
    }
    
    // Ensure URL slug is properly formatted with no spaces
    if (urlSlug.includes(' ')) {
      // Auto-fix by replacing spaces with hyphens
      const fixedSlug = urlSlug.replace(/\s+/g, '-');
      setUrlSlug(fixedSlug);
      
      sonnerToast.success("URL slug fixed", { description: "Spaces in URL slug were replaced with hyphens" });
      return; // Return to let the user see the fixed slug
    }
    
    // Validate that focus keyword is in important fields
    const keywordValidations = [
      { field: 'Title', value: selectedTitle, required: true },
      { field: 'Meta title', value: metaTitle, required: true },
      { field: 'Meta description', value: metaDescription, required: true },
      { field: 'URL slug', value: urlSlug, required: true },
      { field: 'Content', value: editableContent, required: true }
    ];
    
    const missingKeywordFields = keywordValidations
      .filter(validation => validation.required && 
              !validation.value.toLowerCase().includes(focusKeyword.toLowerCase()))
      .map(validation => validation.field);
    
    if (missingKeywordFields.length > 0) {
      sonnerToast.error("Focus keyword missing", { description: `Your focus keyword "${focusKeyword}" should appear in: ${missingKeywordFields.join(', ')}` });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Find content type ID for "Article"
      const contentTypeResponse = await apiFetch('/api/content-types');
      const contentTypeData = await contentTypeResponse.json();
      
      if (!contentTypeData.success || !Array.isArray(contentTypeData.contentTypes)) {
        throw new Error('Failed to fetch content types');
      }
      
      const articleContentType = contentTypeData.contentTypes.find(
        ct => ct.name.toLowerCase() === 'article'
      );
      
      if (!articleContentType) {
        throw new Error('Article content type not found');
      }
      
      // Create content in the database
      const response = await apiFetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: selectedBrand,
          content_type_id: articleContentType.id,
          title: selectedTitle,
          body: editableContent, // Use editable content which may have been modified by user
          meta_title: metaTitle,
          meta_description: metaDescription,
          focus_keyword: focusKeyword,
          url_slug: urlSlug,
          status: 'draft'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save content');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save content');
      }
      
      sonnerToast.success("Article saved", { description: "Your article has been saved successfully" });
      
      // Redirect to content list
      router.push('/dashboard/content');
      router.refresh();
    } catch (error) {
      console.error('Error saving content:', error);
      sonnerToast.error("Save failed", { description: "Failed to save article. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper function to generate a URL slug
  const generateSlug = (title: string, keyword: string): string => {
    // If a focus keyword is provided, ensure it's in the slug
    if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
      // Combine title with focus keyword
      const combinedText = `${title} ${keyword}`;
      
      // Convert to lowercase, replace spaces with hyphens, remove special characters
      return combinedText
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .replace(/-+/g, '-')            // Remove consecutive hyphens
        .substring(0, 60);              // Limit length
    }
    
    // If title already contains the keyword or no keyword was provided
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
      .replace(/\s+/g, '-')             // Replace spaces with hyphens
      .replace(/-+/g, '-')              // Remove consecutive hyphens
      .substring(0, 60);                // Limit length
  };
  
  // Add a new function to handle auto-generation of focus keyword
  const handleAutoGenerateFocusKeyword = async () => {
    if (!selectedTitle) {
      sonnerToast.error("Missing title", { description: "Please provide an article title first" });
      return;
    }
    
    // Use the selected brand for context
    const selectedBrandObj = brands.find(b => b.id === selectedBrand);
    if (!selectedBrandObj) {
      sonnerToast.error("Brand required", { description: "Please select a brand first" });
      return;
    }
    
    setIsGeneratingContent(true);
    
    try {
      // Use Azure OpenAI to generate the best focus keyword
      const response = await apiFetch('/api/tools/metadata-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTitle,
          brand: selectedBrandObj.name,
          type: 'focus-keyword',
          count: 1
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate focus keyword');
      }
      
      const data = await response.json();
      
      if (data.success && data.keywords && data.keywords.length > 0) {
        setFocusKeyword(data.keywords[0]);
        
        sonnerToast.success("Focus keyword generated", { description: `Focus keyword set to "${data.keywords[0]}" based on AI analysis.` });
      } else {
        throw new Error(data.error || 'Failed to generate focus keyword');
      }
    } catch (error) {
      console.error('Error generating focus keyword:', error);
      
      // Simple fallback - extract a key term from the title
      const words = selectedTitle.split(' ')
        .filter(word => word.length > 3)
        .sort((a, b) => b.length - a.length);
      
      if (words.length > 0) {
        const focusWord = words[0].toLowerCase();
        setFocusKeyword(focusWord);
        
        sonnerToast.info("Using simple focus keyword", { description: `Focus keyword set to "${focusWord}" from title.` });
      }
    } finally {
      setIsGeneratingContent(false);
    }
  };
  
  // Add a function to auto-generate all fields
  const autoGenerateAllFields = async () => {
    if (!selectedTitle || !selectedBrand) {
      sonnerToast.error("Missing required fields", { description: "Please select a brand and title first" });
      return;
    }
    
    sonnerToast.info("Auto-generating fields...", { description: "This may take a moment.", duration: 10000 });
    setIsGeneratingContent(true); // Use a general loading state

    try {
      await handleAutoGenerateFocusKeyword();
      await delay(600); 
      await handleAutoGeneratePrimaryKeywords();
      await delay(600);
      await handleAutoGenerateSecondaryKeywords();
      await delay(600);
      handleAutoGenerateDescription(); // This one is synchronous
      await delay(600);
      await handleAutoGenerateStimulus();
      
      sonnerToast.success("Auto-generation complete!", { description: "All fields have been populated." });
    } catch (error: unknown) {
      console.error("Error during auto-generation chain:", error);
      sonnerToast.error("Auto-generation Error", { description: error instanceof Error ? error.message : "An error occurred while auto-generating fields." });
    } finally {
      setIsGeneratingContent(false);
    }
  };
  
  const handleContentChange = (newContent: string) => {
    setEditableContent(newContent);
    // setContentLastUpdated(Date.now()); // Trigger SEO check
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="generate">Generate New Article</TabsTrigger>
          <TabsTrigger value="article" disabled={!generatedContent}>Article Details</TabsTrigger>
        </TabsList>
        
        {/* Tab 1: Generate New Article */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Set Up Article Generation</CardTitle>
              <CardDescription>
                Select a brand and generate article titles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={selectedBrand}
                  onValueChange={setSelectedBrand}
                >
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(brands) && brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center">
                          <BrandIcon name={brand.name} color={brand.brand_color ?? undefined} logoUrl={brand.logo_url} size="sm" className="mr-2" />
                          {brand.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title-keyword">Article Topic or Keyword for Title Generation</Label>
                <div className="flex space-x-2">
                  <Input
                    id="title-keyword"
                    placeholder="Enter a keyword to inspire article titles"
                    value={titleKeyword}
                    onChange={(e) => setTitleKeyword(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleGenerateTitles}
                    disabled={isGeneratingTitles || !selectedBrand}
                  >
                    {isGeneratingTitles ? 'Generating...' : 'Generate Titles'}
                  </Button>
                </div>
              </div>
              
              {/* Generated titles selection */}
              {generatedTitles.length > 0 && (
                <div className="space-y-4 mt-4 mb-4">
                  <Label>Select a Title</Label>
                  <div className="space-y-2">
                    {generatedTitles.map((title, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <input
                          type="radio"
                          name="article-title"
                          value={title}
                          id={`title-${index}`}
                          checked={selectedTitle === title}
                          onChange={() => handleTitleSelect(title)}
                          className="mt-1"
                        />
                        <Label htmlFor={`title-${index}`} className="cursor-pointer">{title}</Label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <Label htmlFor="custom-title">Or enter your own title</Label>
                    <Input
                      id="custom-title"
                      placeholder="Custom article title"
                      value={selectedTitle}
                      onChange={handleManualTitleInput}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
              {/* User can still input title manually using the existing input field below if generatedTitles was the only place for RadioGroup */}
              {/* Ensure there's a way to set selectedTitle - the custom title input should still work */}
              {(generatedTitles.length === 0 || true) && ( // Always show custom title input for now
                 <div className="mt-6 pt-4 border-t">
                    <Label htmlFor="custom-title">Article Title</Label>
                    <Input
                      id="custom-title"
                      placeholder="Enter article title"
                      value={selectedTitle}
                      onChange={handleManualTitleInput} // Existing handler for manual input
                      className="mt-2"
                    />
                  </div>
              )}
            </CardContent>
          </Card>
          
          {selectedTitle && (
            <Card>
              <CardHeader>
                <CardTitle>Article Details</CardTitle>
                <CardDescription className="flex flex-col space-y-2">
                  <span>Provide additional information for your article</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={autoGenerateAllFields}
                    disabled={isGeneratingContent || !selectedTitle || !selectedBrand}
                    className="w-full md:w-auto"
                  >
                    Auto-Generate All Fields with AI
                  </Button>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column - keywords and description */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="focus-keyword">Focus Keyword for SEO <span className="text-red-500">*</span></Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAutoGenerateFocusKeyword}
                          disabled={!selectedTitle || isGeneratingContent}
                        >
                          Auto-Generate
                        </Button>
                      </div>
                      <Input
                        id="focus-keyword"
                        placeholder="e.g. sustainable gardening"
                        value={focusKeyword}
                        onChange={(e) => setFocusKeyword(e.target.value)}
                        className="border-orange-300"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This keyword must appear in title, headings, meta, and content for SEO.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="primary-keywords">Primary Keywords (comma separated)</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAutoGeneratePrimaryKeywords}
                          disabled={!selectedTitle || isGeneratingContent}
                        >
                          Auto-Generate
                        </Button>
                      </div>
                      <Input
                        id="primary-keywords"
                        placeholder="e.g. sustainable, eco-friendly, organic"
                        value={primaryKeywords}
                        onChange={(e) => setPrimaryKeywords(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="secondary-keywords">Secondary/Long-Tail Keywords (comma separated)</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAutoGenerateSecondaryKeywords}
                          disabled={!primaryKeywords || isGeneratingContent}
                        >
                          Auto-Generate
                        </Button>
                      </div>
                      <Input
                        id="secondary-keywords"
                        placeholder="e.g. sustainable fashion trends 2023, eco-friendly clothing brands"
                        value={secondaryKeywords}
                        onChange={(e) => setSecondaryKeywords(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="description">Description</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAutoGenerateDescription}
                          disabled={!selectedTitle || !primaryKeywords || isGeneratingContent}
                        >
                          Auto-Generate
                        </Button>
                      </div>
                      <Textarea
                        id="description"
                        placeholder="Brief description of what this article should cover"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Right column - stimulus/input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="stimulus">Stimulus/Input {isScrapingUrls && "(Scraping URLs...)"}</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAutoGenerateStimulus}
                        disabled={!primaryKeywords || isGeneratingContent || isScrapingUrls}
                      >
                        Auto-Generate
                      </Button>
                    </div>
                    <Textarea
                      id="stimulus"
                      placeholder="Provide any inputs, facts, or specific information to include in the article. Paste URLs to automatically scrape their content."
                      rows={18}
                      className="h-full min-h-[400px]"
                      value={stimulus}
                      onChange={handleStimulusChange}
                    />
                    {extractUrls(stimulus).length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {extractUrls(stimulus).length} URL{extractUrls(stimulus).length !== 1 ? 's' : ''} detected. Content will be scraped when generating the article.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleGenerateContent}
                  disabled={isGeneratingContent || !selectedTitle || isScrapingUrls || !focusKeyword}
                  className="w-full md:w-auto"
                >
                  {isGeneratingContent ? 'Generating...' : 'Generate Article Content'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        {/* Tab 2: Article Details with 30/70 split */}
        <TabsContent value="article" className="space-y-6">
          {generatedContent && (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <ArticleDetailsSidebar 
                selectedTitle={selectedTitle}
                setSelectedTitle={setSelectedTitle}
                focusKeyword={focusKeyword}
                setFocusKeyword={setFocusKeyword}
                metaTitle={metaTitle}
                setMetaTitle={setMetaTitle}
                metaDescription={metaDescription}
                setMetaDescription={setMetaDescription}
                urlSlug={urlSlug}
                setUrlSlug={setUrlSlug}
                handleSave={handleSave}
                isSaving={isSaving}
                handleGenerateContent={handleGenerateContent}
                isGeneratingContent={isGeneratingContent}
                setActiveTab={setActiveTab}
              />
              
              {/* Right content area - 70% */}
              <div className="lg:col-span-7">
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Article</CardTitle>
                    <CardDescription>
                      Review and edit the generated article content below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QuillEditor 
                      value={editableContent} 
                      onChange={handleContentChange} 
                      placeholder="Article content will appear here after generation..."
                      className="min-h-[400px] border rounded-md"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {!generatedContent && activeTab === 'article' && (
            <Card>
              <CardHeader>
                <CardTitle>No Article Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Please go back to the &quot;Generate New Article&quot; tab to create an article first.
                </p>
                <Button onClick={() => setActiveTab('generate')} className="mt-4">
                  Go to Generation Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 
