'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Github, Mail, Loader2, AlertCircle } from 'lucide-react';
import { login } from '@/lib/api'; import { LogoWithTagline } from '@/components/logo'
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle OAuth errors from callback
  const oauthError = searchParams.get('error');
  const existingProvider = searchParams.get('provider');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(email, password);

      if (result.status === 'success' && result.user) {
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('userId', result.user.id);

        // Check if profile is complete
        const isComplete = result.user.income && result.user.taxRegime && result.user.age;

        if (isComplete) {
          // Format and save complete profile for chat page
          const profileData = {
            age: result.user.age || 0,
            gender: result.user.gender || '',
            income: result.user.income || '',
            employmentStatus: result.user.employmentStatus || '',
            taxRegime: result.user.taxRegime || '',
            homeownerStatus: result.user.homeownerStatus || '',
            children: result.user.children || '',
            childrenAges: result.user.childrenAges || '',
            parentsAge: result.user.parentsAge || '',
            investmentCapacity: result.user.investmentCapacity || '',
            riskAppetite: result.user.riskAppetite || '',
            financialGoals: result.user.financialGoals || [],
            existingInvestments: result.user.existingInvestments || [],
            isProfileComplete: true
          };
          localStorage.setItem('userProfile', JSON.stringify(profileData));
          router.push('/chat');
        } else {
          // Profile incomplete, go to setup
          router.push('/profile-setup');
        }
        router.refresh();
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = () => {
    if (error) return error;
    if (oauthError === 'email_exists' && existingProvider) {
      return `This email is already registered with ${existingProvider}. Please sign in with ${existingProvider}.`;
    }
    if (oauthError === 'oauth_cancelled') return 'OAuth sign-in was cancelled';
    if (oauthError) return 'OAuth sign-in failed. Please try again.';
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoWithTagline size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-4">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to Arth-Mitra</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = '/api/auth/google')}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = '/api/auth/github')}
          >
            <Github className="w-5 h-5 mr-2" />
            Continue with GitHub
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Sign in with Email
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
