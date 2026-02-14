import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserById } from '@/lib/users';

export async function GET() {
  try {
    const payload = await getCurrentUser();
    
    if (!payload) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    // Get fresh user data from DB
    const user = await getUserById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { user: null },
      { status: 200 }
    );
  }
}
