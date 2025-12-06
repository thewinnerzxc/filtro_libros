import { NextResponse } from 'next/server';

export function middleware(request) {
    const authCookie = request.cookies.get('authorized');
    const { pathname } = request.nextUrl;

    // Allow public assets
    if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/favicon.ico')) {
        return NextResponse.next();
    }

    // Allow login page and auth api
    if (pathname === '/login' || pathname === '/api/auth') {
        return NextResponse.next();
    }

    // Check auth
    if (authCookie?.value !== 'true') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
