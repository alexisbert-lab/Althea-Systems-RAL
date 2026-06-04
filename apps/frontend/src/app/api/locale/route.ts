import { NextRequest, NextResponse } from 'next/server';
import { isValidLocale } from '@/lib/locale';

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!isValidLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set locale' }, { status: 500 });
  }
}
