import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const body = await request.json();
    const { password } = body;

    if (password === '4147') {
        // Set cookie
        cookies().set('authorized', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
}
