import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    // Validate Anthropic API key by sending a test message
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Hi'
            }
          ]
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // If we get a successful response with content, the key is valid
        const isValid = result && result.content && result.content.length > 0;
        return NextResponse.json({ valid: isValid, provider });
      } else {
        // Check specific error types
        const errorText = await response.text();
        let errorMessage = 'Invalid API key';
        
        if (response.status === 401) {
          errorMessage = 'Invalid API key - authentication failed';
        } else if (response.status === 403) {
          errorMessage = 'API key lacks required permissions or insufficient credits';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded - API key is valid but being throttled';
          // Rate limit means the key is technically valid
          return NextResponse.json({ valid: true, provider, warning: 'Rate limited' });
        }
        
        return NextResponse.json({ valid: false, provider, error: errorMessage });
      }
    }

    return NextResponse.json(
      { error: `Validation not implemented for provider: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed due to network or server error' },
      { status: 500 }
    );
  }
}