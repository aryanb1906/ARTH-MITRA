import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByProvider } from '@/lib/users';
import { signToken, createAuthCookie } from '@/lib/auth';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
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

    // Exchange code for token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=token_exchange_failed`
      );
    }

    const tokens: GitHubTokenResponse = await tokenResponse.json();

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_access_token`
      );
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=userinfo_failed`
      );
    }

    const githubUser: GitHubUser = await userResponse.json();

    // Get user email if not public
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails: GitHubEmail[] = await emailsResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }

    if (!email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_email`
      );
    }

    // Find or create user
    let user = await getUserByProvider('github', githubUser.id.toString());

    if (!user) {
      // Check if email exists with different provider
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=email_exists&provider=${existingUser.provider}`
        );
      }

      // Create new user
      user = await createUser({
        email,
        name: githubUser.name || githubUser.login,
        provider: 'github',
        providerId: githubUser.id.toString(),
        avatar: githubUser.avatar_url,
      });
    }

    // Generate JWT
    const token = await signToken({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      provider: 'github',
    });

    // Redirect to chat with auth cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/chat`
    );
    response.headers.set('Set-Cookie', createAuthCookie(token));
    return response;
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`
    );
  }
}
