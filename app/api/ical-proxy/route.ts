import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const targetUrl = request.nextUrl.searchParams.get('url')?.trim();

    if (!targetUrl) {
        return NextResponse.json(
            { error: 'Es fehlt die URL zur ICS-Quelle.' },
            { status: 400 },
        );
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(targetUrl);
    } catch {
        return NextResponse.json(
            { error: 'Die angegebene URL ist ungültig.' },
            { status: 400 },
        );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json(
            { error: 'Erlaubt sind nur http- und https-Links.' },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(parsedUrl.toString(), {
            method: 'GET',
            headers: {
                Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
                'User-Agent': 'as-courage-ical-proxy/1.0',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Die Quelle antwortet mit Status ${response.status}.` },
                { status: response.status },
            );
        }

        const icsText = await response.text();

        if (!icsText.trim()) {
            return NextResponse.json(
                { error: 'Die Quelle ist leer.' },
                { status: 422 },
            );
        }

        return new NextResponse(icsText, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch {
        return NextResponse.json(
            {
                error: 'Die Quelle konnte serverseitig nicht geladen werden.',
            },
            { status: 502 },
        );
    }
}