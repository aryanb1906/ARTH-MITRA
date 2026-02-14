import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByProvider } from '@/lib/users';
import { signToken, createAuthCookie } from '@/lib/auth';

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

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_cancelled`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_code`
      );
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

    // Find or create user
    let user = await getUserByProvider('google', googleUser.id);

    if (!user) {
      // Check if email exists with different provider
      const existingUser = await getUserByEmail(googleUser.email);
      if (existingUser) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=email_exists&provider=${existingUser.provider}`
        );
      }

      // Create new user
      user = await createUser({
        email: googleUser.email,
        name: googleUser.name,
        provider: 'google',
        providerId: googleUser.id,
        avatar: googleUser.picture,
      });
    }

    // Generate JWT
    const token = await signToken({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      provider: 'google',
    });

    // Redirect to chat with auth cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/chat`
    );
    response.headers.set('Set-Cookie', createAuthCookie(token));
    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`
    );
  }
}
