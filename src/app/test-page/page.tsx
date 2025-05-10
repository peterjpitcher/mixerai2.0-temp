'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { useToast } from '@/components/use-toast';

export default function TestPage() {
  const { toast } = useToast();
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    toast({
      title: 'Test Toast',
      description: `Button clicked ${count + 1} times`,
    });
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Simple Test Component</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Counter: {count}</p>
          <Button onClick={handleClick}>Increment Counter</Button>
        </CardContent>
      </Card>
    </div>
  );
} 