'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegments } from 'next/navigation';
import {
  Home,
  GitBranch,
  BookOpen,
  Building2,
  Users,
  Settings,
  HelpCircle,
  FileText,
  ShoppingBag,
  Store,
  ChevronDown,
  ChevronRight,
  Wrench,
  Code,
  Image,
  Globe,
  MoreVertical,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  segment?: string; // Used for active state calculation with segments
}

interface NavGroupItem {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  segment?: string; // For matching the parent segment
  defaultOpen?: boolean; // Whether the group should be expanded by default
}

// Default templates to show in the navigation - these are system defaults
const defaultTemplates = [
  {
    id: 'article-template',
    name: 'Article',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: 'product-template',
    name: 'Product',
    icon: <ShoppingBag className="h-4 w-4" />
  }
];

// Mock user templates for development mode only
const mockTemplates = [
  {
    id: "mock-template-1",
    name: "Mock Blog Template",
    description: "A template for creating blog posts with introduction, body and conclusion",
    fields: {
      inputFields: [
        { id: "title", name: "Title", type: "shortText", required: true, options: {} },
        { id: "keywords", name: "Keywords", type: "tags", required: false, options: {} },
        { id: "topic", name: "Topic", type: "shortText", required: true, options: {} }
      ],
      outputFields: [
        { 
          id: "content", 
          name: "Blog Content", 
          type: "richText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write a blog post about {{topic}} using the keywords {{keywords}}"
        },
        { 
          id: "meta", 
          name: "Meta Description", 
          type: "plainText", 
          required: false, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write a meta description for a blog about {{topic}}"
        }
      ]
    },
    created_at: "2023-06-15T14:30:00Z",
    created_by: "00000000-0000-0000-0000-000000000000"
  },
  {
    id: "mock-template-2",
    name: "Mock Email Template",
    description: "A template for marketing emails with subject line and body",
    fields: {
      inputFields: [
        { id: "campaign", name: "Campaign Name", type: "shortText", required: true, options: {} },
        { id: "audience", name: "Target Audience", type: "shortText", required: true, options: {} }
      ],
      outputFields: [
        { 
          id: "subject", 
          name: "Email Subject", 
          type: "shortText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write an attention-grabbing email subject line for a {{campaign}} campaign targeting {{audience}}"
        },
        { 
          id: "body", 
          name: "Email Body", 
          type: "richText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write an engaging email body for a {{campaign}} campaign targeting {{audience}}"
        }
      ]
    },
    created_at: "2023-07-22T09:15:00Z",
    created_by: "00000000-0000-0000-0000-000000000000"
  }
];

/**
 * Unified navigation component for MixerAI dashboard
 * Uses Next.js useSelectedLayoutSegments() for accurate active state tracking
 */
export function UnifiedNavigation() {
  const pathname = usePathname() || '';
  const layoutSegments = useSelectedLayoutSegments();
  // Ensure segments is always an array to fix linter errors
  const segments = layoutSegments || [];
  
  // Track expanded state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true, // Content section expanded by default
    tools: true    // Tools section expanded by default
  });

  // State for user templates
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Flag to track if templates have been fetched already
  const templatesFetched = useRef(false);

  // Fetch templates from the API only once when the component mounts or content section is expanded
  useEffect(() => {
    const fetchTemplates = async () => {
      // Avoid multiple fetches
      if (templatesFetched.current || isLoadingTemplates) return;
      
      setIsLoadingTemplates(true);
      templatesFetched.current = true;
      
      try {
        // In development mode, use the mock data directly
        if (process.env.NODE_ENV === 'development') {
          console.log('Navigation: Using mock templates in development mode');
          setUserTemplates(mockTemplates);
          setIsLoadingTemplates(false);
          return;
        }
        
        // In production, fetch from API
        console.log('Navigation: Fetching templates from API');
        const response = await fetch('/api/content-templates');
        const data = await response.json();
        
        if (data.success && data.templates) {
          console.log(`Navigation: Successfully fetched ${data.templates.length} templates`);
          setUserTemplates(data.templates);
        } else {
          console.error('Failed to get templates:', data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    // Only fetch if the content section is expanded and templates haven't been fetched yet
    if (expandedSections.content && !templatesFetched.current) {
      fetchTemplates();
    }
  }, [expandedSections.content, isLoadingTemplates]);

  // Automatically expand sections based on current path
  useEffect(() => {
    // Create new state without referring to previous state
    const newExpandedState = { ...expandedSections };
    
    // Only update if the condition is different from current state
    if (pathname.includes('/content') && !expandedSections.content) {
      newExpandedState.content = true;
    }
    
    if (pathname.includes('/tools') && !expandedSections.tools) {
      newExpandedState.tools = true;
    }
    
    if (pathname.includes('/templates') && !expandedSections.content) {
      newExpandedState.content = true;
    }
    
    // Only update state if there's a change
    if (newExpandedState.content !== expandedSections.content || 
        newExpandedState.tools !== expandedSections.tools) {
      setExpandedSections(newExpandedState);
    }
  }, [pathname]); // Only depend on pathname changes

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  // Content with submenu for creating new content - only include default templates
  const contentItems = [
    // Only include system default templates
    ...defaultTemplates.map(template => ({
      href: `/dashboard/content/new?type=${template.id}`,
      label: `New ${template.name}`,
      icon: template.icon,
      segment: template.id
    }))
  ];
  
  // Primary nav items
  const navItems: (NavItem | NavGroupItem)[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: ''
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows'
    },
    {
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands'
    },
    // Content Templates as a separate top-level item
    {
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <Folder className="h-5 w-5" />,
      segment: 'templates'
    },
    // Content with submenu for creating new content using only system templates
    {
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      segment: 'content',
      defaultOpen: true,
      items: contentItems
    },
    // New Tools section with submenu
    {
      label: 'Tools',
      icon: <Wrench className="h-5 w-5" />,
      segment: 'tools',
      defaultOpen: true,
      items: [
        {
          href: '/dashboard/tools/metadata-generator',
          label: 'Metadata Generator',
          icon: <Code className="h-4 w-4" />,
          segment: 'metadata-generator'
        },
        {
          href: '/dashboard/tools/alt-text-generator',
          label: 'Alt Text Generator',
          icon: <Image className="h-4 w-4" />,
          segment: 'alt-text-generator'
        },
        {
          href: '/dashboard/tools/content-transcreator',
          label: 'Content Trans-Creator',
          icon: <Globe className="h-4 w-4" />,
          segment: 'content-transcreator'
        }
      ]
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users'
    }
  ];
  
  // Bottom nav items (settings, help)
  const bottomNavItems: NavItem[] = [
    {
      href: '/dashboard/account',
      label: 'Account',
      icon: <Settings className="h-5 w-5" />,
      segment: 'account'
    },
    {
      href: '/dashboard/help',
      label: 'Help',
      icon: <HelpCircle className="h-5 w-5" />,
      segment: 'help'
    }
  ];
  
  // Check if a navigation item is active based on the current URL path and segments
  const isActive = (item: NavItem | NavGroupItem) => {
    // For simple nav items
    if ('href' in item) {
      // Exact match for dashboard root
      if (item.href === '/dashboard' && segments.length === 0) {
        return true;
      }
      
      // For other items, check if the segment matches
      if (item.segment && segments.includes(item.segment)) {
        return true;
      }
      
      return false;
    }
    
    // For group items, check if any child item is active
    if ('items' in item) {
      return item.items.some(subItem => 
        segments.includes(subItem.segment || '') || 
        pathname === subItem.href
      );
    }
    
    return false;
  };
  
  return (
    <nav className="bg-side-nav w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
      <div className="space-y-8">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            'items' in item ? (
              // Group with submenu
              <div key={index} className="space-y-1">
                {/* Group header - clickable to expand/collapse */}
                <button 
                  onClick={() => toggleSection(item.label.toLowerCase())}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(item)
                      ? "text-primary bg-primary-50"
                      : "text-neutral-700 hover:text-primary hover:bg-primary-50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {expandedSections[item.label.toLowerCase()] 
                    ? <ChevronDown className="h-4 w-4" /> 
                    : <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {/* Group items - indented, only show if expanded */}
                {expandedSections[item.label.toLowerCase()] && (
                  <div className="pl-6 space-y-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                          (segments.includes(subItem.segment || '') || pathname === subItem.href)
                            ? 'bg-primary text-white'
                            : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
                        )}
                      >
                        {subItem.icon}
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single nav item
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive(item)
                    ? 'bg-primary text-white'
                    : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          ))}
        </div>
        
        {/* Bottom navigation items */}
        <div className="pt-4 border-t border-border">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1',
                segments.includes(item.segment || '')
                  ? 'bg-primary text-white'
                  : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default UnifiedNavigation; 