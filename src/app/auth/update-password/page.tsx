import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { UpdatePasswordForm } from './update-password-form';

export default async function UpdatePasswordPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?error=reset_session');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link href="/" aria-label="Go to homepage">
            <Image
              src="/Mixerai2.0Logo.png"
              alt="MixerAI 2.0 Logo"
              width={250}
              height={58}
              priority
            />
          </Link>
        </div>
        <Card className="shadow-lg w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <UpdatePasswordForm />
          </CardContent>
          <CardFooter className="pt-4">
            <div className="text-center w-full text-sm">
              <Link href="/auth/login" className="font-medium text-primary-foreground/80 hover:text-primary-foreground hover:underline">
                Back to Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
