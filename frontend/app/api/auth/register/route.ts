import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/users';
import { signToken, createAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({
      email,
      password,
      name,
      provider: 'credentials',
    });

    // Generate JWT
    const token = await signToken({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      provider: 'credentials',
    });

    // Return response with cookie
    const response = NextResponse.json({
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
      },
    });

    response.headers.set('Set-Cookie', createAuthCookie(token));
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
