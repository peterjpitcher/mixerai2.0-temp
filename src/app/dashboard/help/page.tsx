import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { HelpCircle, BookOpen, LifeBuoy, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/button";
import { requireAuth } from '@/lib/auth/server';

export const metadata = {
  title: 'Help & Support | MixerAI',
  description: 'Get help with using MixerAI. Find FAQs, documentation, tutorials, and contact support.',
};

// Placeholder Breadcrumbs component - replace with actual implementation later
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

/**
 * HelpPage component.
 * Displays help and support information for MixerAI users, including links to documentation,
 * FAQs, contact methods, training materials, and release notes.
 */
export default async function HelpPage() {
  await requireAuth();
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Help & Support" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and get support when you need it.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>
                Browse our comprehensive documentation
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Our documentation covers everything from getting started to advanced topics. Find guides, tutorials, and reference materials.
            </p>
            <Button variant="outline" asChild>
              <Link href="https://docs.mixerai.com" target="_blank" rel="noopener noreferrer">
                View Documentation
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <HelpCircle className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>FAQ</CardTitle>
              <CardDescription>
                Frequently asked questions
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Find answers to the most common questions about MixerAI features, account management, and troubleshooting.
            </p>
            <Button variant="outline" asChild>
              <Link href="https://docs.mixerai.com/faq" target="_blank" rel="noopener noreferrer">
                Browse FAQ
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Get help from our team
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Need personalised help? Our support team is ready to assist with any questions or issues you may have.
            </p>
            <Button variant="outline" asChild>
              <Link href="mailto:support@mixerai.com">
                Contact Support
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <LifeBuoy className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Training & Tutorials</CardTitle>
              <CardDescription>
                Learn how to use MixerAI effectively
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access our training materials and video tutorials to get the most out of MixerAI's features.
            </p>
            <Button variant="outline" asChild>
              <Link href="https://docs.mixerai.com/tutorials" target="_blank" rel="noopener noreferrer">
                View Tutorials
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Release Notes</CardTitle>
          <CardDescription>
            Stay up to date with the latest features and improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            See what's new in MixerAI and learn about recent updates, bug fixes, and feature enhancements.
          </p>
          <Button asChild>
            <Link href="/release-notes">
              View Release Notes
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 