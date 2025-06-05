'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

function ResetPasswordTestContent() {
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'complete' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  useEffect(() => {
    if (!searchParams) {
      // searchParams is not available yet, wait for the next render.
      return;
    }
    const code = searchParams.get('code');

    if (!code) {
      // This might happen on initial load before the redirect with the code
      // We'll give it a moment, but if it's still not there, it's an issue.
      const timer = setTimeout(() => {
        if (!searchParams.get('code')) {
            setStatus('error');
            setErrorMsg('No authorization code found in URL. Please try the reset link again.');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    const exchangeCode = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus('error');
        setErrorMsg(`Failed to exchange code for session: ${error.message}`);
      } else {
        // Session is now set, user can update their password
        setStatus('ready');
      }
    };

    exchangeCode();
  }, [searchParams, supabase]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    setErrorMsg(null);
    setStatus('submitting');
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setStatus('error');
      setErrorMsg(`Failed to update password: ${error.message}`);
    } else {
      setStatus('complete');
    }
  };
  
  if (status === 'loading') {
    return <p>Verifying code...</p>;
  }
  if (status === 'error') {
    return <p style={{ color: 'red' }}>Error: {errorMsg}</p>;
  }
  if (status === 'submitting') {
    return <p>Updating password...</p>;
  }
  if (status === 'complete') {
    return <p>Password updated successfully! You can now log in.</p>;
  }

  return (
    <div>
      <h3>Set a New Password</h3>
      <form onSubmit={handlePasswordUpdate}>
        <input 
          type="password" 
          id="new-password" 
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter your new password" 
          style={{ display: 'block', margin: '0.5rem 0' }} 
          required 
          minLength={6} 
        />
        {errorMsg && <p style={{ color: 'red', fontSize: '12px' }}>{errorMsg}</p>}
        <button type="submit">Update Password</button>
      </form>
    </div>
  );
}

export default function ResetPasswordTestPage() {
  // Suspense is needed because we use useSearchParams
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <h2>Supabase Password-Reset Test</h2>
        <p>This is a diagnostic page. It should be replaced with a styled component once the flow is confirmed to work.</p>
        <ResetPasswordTestContent />
      </div>
    </Suspense>
  );
} 