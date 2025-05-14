'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { 
  ArrowLeft, 
  Send, 
  Loader2
} from 'lucide-react';
import type { Metadata } from 'next';
import { toast } from 'sonner';

// export const metadata: Metadata = {
//   title: 'Invite User | MixerAI 2.0',
//   description: 'Invite a new user to join your MixerAI workspace and assign their role.',
// };

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

/**
 * InviteUserPage provides a form to invite new users to the platform.
 * Administrators can specify the user's email, full name, job title, company,
 * default system role, and optionally assign them to an initial brand.
 * On submission, an invitation is sent to the specified email address.
 */
export default function InviteUserPage() {
  const router = useRouter();
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
        toast.error('Failed to load brands. You may not be able to assign the user to a brand.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBrands();
  }, []);
  
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
    setForm(prev => ({ ...prev, brand_id: value === 'none' ? '' : value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.email) {
      toast.error('Email is required.');
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
        if (data.data?.warning) {
          // Handle partial success (e.g., invite sent, brand assignment failed)
          toast.warning(data.data.message || 'Invitation sent with warnings', {
            description: data.data.warning,
          });
        } else {
          // Handle full success
          toast.success(data.data?.message || `Invitation has been sent to ${form.email}.`);
        }
        
        // Navigate back to the users list
        router.push('/dashboard/users');
      } else {
        throw new Error(data.error || 'Failed to send invitation.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.');
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invite User</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the details below to send an invitation to a new user.
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>New User Invitation</CardTitle>
          <CardDescription>Send an invitation to join the platform.</CardDescription>
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
                  An invitation will be sent to this email address.
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
                  placeholder="General Mills"
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
                <Label htmlFor="brand_id" className="text-right">
                  Assign to Brand
                </Label>
                <Select
                  value={form.brand_id || 'none'}
                  onValueChange={handleBrandChange}
                >
                  <SelectTrigger id="brand_id">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Brand</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  You can assign this user to additional brands later.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSending} className="flex items-center gap-2">
              {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 