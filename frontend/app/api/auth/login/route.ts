import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/users';
import { signToken, createAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user signed up with OAuth
    if (user.provider !== 'credentials' || !user.password) {
      return NextResponse.json(
        { error: `Please sign in with ${user.provider}` },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

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
        avatar: user.avatar,
      },
    });

    response.headers.set('Set-Cookie', createAuthCookie(token));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
