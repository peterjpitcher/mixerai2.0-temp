'use client';

import React from 'react';
import { colors } from '@/lib/constants/colors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Component to showcase the new UI color system
 */
export function UIShowcase() {
  return (
    <div className="space-y-10 p-6">
      <section>
        <h2 className="text-2xl font-bold mb-4">Color System</h2>
        
        <div className="space-y-6">
          {/* Primary colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Primary (Blue)</h3>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(colors.primary)
                .filter(([key]) => key !== 'DEFAULT')
                .map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div 
                      className="h-16 rounded-md mb-1" 
                      style={{ backgroundColor: value as string }}
                    />
                    <div className="text-xs font-mono">
                      {key}
                      <div className="text-neutral-500">{value as string}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
          
          {/* Accent colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Accent (Red)</h3>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(colors.accent)
                .filter(([key]) => key !== 'DEFAULT')
                .map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div 
                      className="h-16 rounded-md mb-1" 
                      style={{ backgroundColor: value as string }}
                    />
                    <div className="text-xs font-mono">
                      {key}
                      <div className="text-neutral-500">{value as string}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
          
          {/* Neutral colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Neutral</h3>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(colors.neutral).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="h-16 rounded-md mb-1" 
                    style={{ backgroundColor: value as string }}
                  />
                  <div className="text-xs font-mono">
                    {key}
                    <div className="text-neutral-500">{value as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Semantic colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Semantic</h3>
            <div className="grid grid-cols-4 gap-2">
              {['success', 'warning', 'error', 'info'].map((key) => (
                <div key={key} className="text-center">
                  <div 
                    className="h-16 rounded-md mb-1" 
                    style={{ backgroundColor: colors[key as keyof typeof colors] as string }}
                  />
                  <div className="text-xs font-mono">
                    {key}
                    <div className="text-neutral-500">{colors[key as keyof typeof colors] as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">Button System</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button className="bg-accent hover:bg-accent-600 text-white">Accent Button</Button>
          </div>
          
          <div className="flex gap-4 items-center">
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">Card System</h2>
        
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader className="bg-primary-50">
              <CardTitle>Primary Card</CardTitle>
              <CardDescription>With primary styling</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p>This card uses the primary color for its header.</p>
            </CardContent>
            <CardFooter className="bg-primary-50 border-t">
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="bg-accent-50">
              <CardTitle>Accent Card</CardTitle>
              <CardDescription>With accent styling</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p>This card uses the accent color for its header.</p>
            </CardContent>
            <CardFooter className="bg-accent-50 border-t">
              <Button className="bg-accent hover:bg-accent-600" size="sm">Action</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="bg-neutral-50">
              <CardTitle>Neutral Card</CardTitle>
              <CardDescription>With neutral styling</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p>This card uses the neutral color for its header.</p>
            </CardContent>
            <CardFooter className="bg-neutral-50 border-t">
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">Badge System</h2>
        
        <div className="flex gap-4 flex-wrap">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge className="bg-primary">Primary</Badge>
          <Badge className="bg-accent">Accent</Badge>
          <Badge className="bg-success text-white">Success</Badge>
          <Badge className="bg-warning text-white">Warning</Badge>
          <Badge className="bg-error text-white">Error</Badge>
          <Badge className="bg-info text-white">Info</Badge>
        </div>
      </section>
    </div>
  );
}

export default UIShowcase; 