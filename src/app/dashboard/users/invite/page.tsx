'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useToast } from '@/components/toast-provider';
import { 
  ArrowLeft, 
  Send, 
  Loader2
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

export default function InviteUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    job_title: '',
    company: '',
    role: 'Viewer',
    brand_id: ''
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Fetch brands data
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/brands');
        const data = await response.json();
        
        if (data.success) {
          setBrands(data.brands || []);
        } else {
          throw new Error(data.error || 'Failed to fetch brands');
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast({
          title: 'Error',
          description: 'Failed to load brands. You may not be able to assign the user to a brand.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBrands();
  }, [toast]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle role change
  const handleRoleChange = (value: string) => {
    setForm(prev => ({ ...prev, role: value }));
  };
  
  // Handle brand change
  const handleBrandChange = (value: string) => {
    setForm(prev => ({ ...prev, brand_id: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.email) {
      toast({
        title: 'Error',
        description: 'Email is required.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSending(true);
      
      // Send invitation request
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Invitation Sent',
          description: `Invitation has been sent to ${form.email}.`
        });
        
        // Navigate back to the users list
        router.push('/dashboard/users');
      } else {
        throw new Error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Invite User</h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>New User Invitation</CardTitle>
          <CardDescription>Send an invitation to join the platform</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-right">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="user@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  An invitation will be sent to this email address
                </p>
              </div>
              
              <div>
                <Label htmlFor="full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <Label htmlFor="job_title" className="text-right">
                  Job Title
                </Label>
                <Input
                  id="job_title"
                  name="job_title"
                  value={form.job_title}
                  onChange={handleInputChange}
                  placeholder="Marketing Manager"
                />
              </div>
              
              <div>
                <Label htmlFor="company" className="text-right">
                  Company
                </Label>
                <Input
                  id="company"
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  placeholder="Acme Inc."
                />
              </div>
              
              <div>
                <Label htmlFor="role" className="text-right">
                  User Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.role}
                  onValueChange={handleRoleChange}
                  required
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Editor">Editor</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Admin:</strong> Can manage brands, content, and users.<br />
                  <strong>Editor:</strong> Can create and edit content, but cannot manage users.<br />
                  <strong>Viewer:</strong> Can only view content.
                </p>
              </div>
              
              <div>
                <Label htmlFor="brand" className="text-right">
                  Assign to Brand
                </Label>
                <Select
                  value={form.brand_id}
                  onValueChange={handleBrandChange}
                >
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select a brand (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  You can assign this user to additional brands later
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <Button variant="outline" type="button" asChild>
              <Link href="/dashboard/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 