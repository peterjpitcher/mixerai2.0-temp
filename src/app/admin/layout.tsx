import { ReactNode } from 'react';
import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin - MixerAI 2.0',
  description: 'Administrator controls for MixerAI 2.0',
};

// This simply validates admin access and forwards to dashboard layout
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    // Ensure only admins can access this layout
    await requireAdmin();
    
    // Wrap with dashboard layout
    return <>{children}</>;
  } catch (error) {
    console.error('Admin access error:', error);
    redirect('/dashboard?error=admin_required');
  }
} 