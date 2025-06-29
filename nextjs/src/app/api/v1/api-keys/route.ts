import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ api_keys: {} });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/api-keys`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ api_keys: {} });
    }

    const data = await response.json();
    return NextResponse.json({ api_keys: data.api_keys || {} });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ api_keys: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys } = body;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ success: true, message: 'No MongoDB configured' });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keys }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Failed to save API keys: ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Error saving API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}