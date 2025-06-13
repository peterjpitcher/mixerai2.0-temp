'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, HelpCircle, Search, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

/**
 * Custom 404 Not Found page.
 * Aligns with MixerAI design standards for consistency.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" aria-label="Go to homepage">
            <Image 
              src="/Mixerai2.0Logo.png" 
              alt="MixerAI Logo" 
              width={200} 
              height={46} 
              priority 
            />
          </Link>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Search className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Page Not Found</CardTitle>
            <CardDescription className="mt-2">
              We couldn&apos;t find the page you&apos;re looking for. It may have been moved, deleted, or never existed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Code */}
            <div className="text-center">
              <span className="text-6xl font-bold text-muted-foreground/20">404</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/dashboard/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Get Help
                </Link>
              </Button>
            </div>

            {/* Additional Options */}
            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Or try one of these:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link 
                  href="/dashboard/content" 
                  className="text-primary hover:text-primary/80 hover:underline text-center"
                >
                  View Content
                </Link>
                <Link 
                  href="/dashboard/brands" 
                  className="text-primary hover:text-primary/80 hover:underline text-center"
                >
                  Manage Brands
                </Link>
                <Link 
                  href="/dashboard/templates" 
                  className="text-primary hover:text-primary/80 hover:underline text-center"
                >
                  Browse Templates
                </Link>
                <Link 
                  href="/dashboard/workflows" 
                  className="text-primary hover:text-primary/80 hover:underline text-center"
                >
                  View Workflows
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
} 