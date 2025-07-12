import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface PanelPreferences {
  thinking: {
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    isMaximized: boolean;
    isLocked: boolean;
  };
  actions: {
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    isMaximized: boolean;
    isLocked: boolean;
  };
  inspector: {
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    isMaximized: boolean;
    isLocked: boolean;
  };
}

const DEFAULT_PREFERENCES: PanelPreferences = {
  thinking: {
    visible: false,
    position: { x: 20, y: 100 },
    size: { width: 400, height: 300 },
    isMaximized: false,
    isLocked: false,
  },
  actions: {
    visible: false,
    position: { x: 440, y: 100 },
    size: { width: 400, height: 300 },
    isMaximized: false,
    isLocked: false,
  },
  inspector: {
    visible: false,
    position: { x: 860, y: 100 },
    size: { width: 500, height: 400 },
    isMaximized: false,
    isLocked: false,
  },
};

export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/panels`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch panel preferences from backend, using defaults');
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
    }

    const data = await response.json();
    return NextResponse.json({ preferences: data.preferences || DEFAULT_PREFERENCES });
  } catch (error) {
    console.error('Error fetching panel preferences:', error);
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json({ error: 'Missing preferences' }, { status: 400 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/panels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferences }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Failed to save preferences: ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Error saving panel preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}