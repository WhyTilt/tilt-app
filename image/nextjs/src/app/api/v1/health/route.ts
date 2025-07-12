import { NextRequest } from 'next/server';

const BACKEND_URL = 'http://localhost:8000/api/v1/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(BACKEND_URL);
    const data = await response.json();
    
    return Response.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Backend service unavailable' }, 
      { status: 503 }
    );
  }
}