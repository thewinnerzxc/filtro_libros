import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        console.log('Auth attempt:', body); // Debug log

        // Robust parsing
        const password = String(body.password || '').trim();

        if (password === '4147') {
            // Create response
            const response = NextResponse.json({ success: true });

            // Set cookie on the response object
            response.cookies.set('authorized', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ success: false }, { status: 401 });
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
