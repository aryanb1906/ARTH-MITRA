import { NextRequest, NextResponse } from 'next/server';
import { signToken, createAuthCookie } from '@/lib/auth';
import crypto from 'crypto';

// HMAC-derived OAuth password: provider user IDs are publicly discoverable,
// so deriving the password from a server-only secret (rather than the raw ID)
// prevents anyone from computing it and logging in as that user.
const OAUTH_PASSWORD_SECRET = process.env.OAUTH_PASSWORD_SECRET!;
function deriveOAuthPassword(provider: string, providerId: string): string {
  return crypto.createHmac('sha256', OAUTH_PASSWORD_SECRET).update(`${provider}:${providerId}`).digest('hex');
}

const CLEAR_OAUTH_STATE_COOKIE = `oauth_state=; HttpOnly; Path=/; Max-Age=0`;

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const error = req.nextUrl.searchParams.get('error');
    const state = req.nextUrl.searchParams.get('state');
    const storedState = req.cookies.get('oauth_state')?.value;

    if (!state || !storedState || state !== storedState) {
      const mismatchResponse = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_state_mismatch`
      );
      mismatchResponse.headers.set('Set-Cookie', CLEAR_OAUTH_STATE_COOKIE);
      return mismatchResponse;
    }

    if (error) {
      const errResponse = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_cancelled`
      );
      errResponse.headers.set('Set-Cookie', CLEAR_OAUTH_STATE_COOKIE);
      return errResponse;
    }

    if (!code) {
      const noCodeResponse = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_code`
      );
      noCodeResponse.headers.set('Set-Cookie', CLEAR_OAUTH_STATE_COOKIE);
      return noCodeResponse;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Google token error:', await tokenResponse.text());
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=token_exchange_failed`
      );
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=userinfo_failed`
      );
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    // Try to login with existing account
    const loginResponse = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleUser.email,
        password: deriveOAuthPassword('google', googleUser.id),
      }),
    });

    let user;
    if (loginResponse.ok) {
      // User exists, login successful
      const data = await loginResponse.json();
      user = data.user;
    } else {
      // User doesn't exist with OAuth password, try to create new account
      // Generate a unique username
      const baseUsername = googleUser.name?.replace(/[^a-zA-Z0-9]/g, '') || googleUser.email.split('@')[0];
      const uniqueUsername = `${baseUsername}_${Date.now().toString(36)}`;
      
      const registerResponse = await fetch(`${API_BASE}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          username: uniqueUsername,
          password: deriveOAuthPassword('google', googleUser.id),
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        console.error('Google OAuth registration failed:', errorData);
        
        // Check if email already exists (registered with password)
        if (errorData.detail?.includes('Email already registered')) {
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/login?error=email_exists&provider=email%2Fpassword`
          );
        }
        
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=registration_failed`
        );
      }

      const data = await registerResponse.json();
      user = data.user;
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.username,
      provider: 'google',
    });

    // Check if user has a complete profile
    let redirectPath = '/profile-setup'; // Default to profile setup for new users
    try {
      const profileResponse = await fetch(`${API_BASE}/api/users/${user.id}/profile`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        // If profile has all required fields, redirect to chat
        if (profileData.income && profileData.taxRegime && profileData.age) {
          redirectPath = '/chat';
        }
      }
    } catch (error) {
      console.error('Failed to check profile:', error);
      // If check fails, default to profile-setup
    }

    // Create redirect response with auth cookie
    const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}`);
    if (redirectPath === '/profile-setup') {
      redirectUrl.searchParams.set('oauth_success', 'true');
    }

    const response = NextResponse.redirect(redirectUrl.toString());
    response.headers.append('Set-Cookie', createAuthCookie(token));
    response.headers.append('Set-Cookie', CLEAR_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    const failResponse = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`
    );
    failResponse.headers.set('Set-Cookie', CLEAR_OAUTH_STATE_COOKIE);
    return failResponse;
  }
}
