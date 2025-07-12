import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const dynamic = 'force-dynamic';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'tilt';
const COLLECTION_NAME = 'settings';

let client: MongoClient | null = null;

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

async function testAnthropicApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5,
        messages: [
          {
            role: 'user',
            content: 'Hi'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', response.status, errorData);
    }

    return response.ok;
  } catch (error) {
    console.error('Error testing Anthropic API key:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 });
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const setting = await collection.findOne({ key });
    const value = setting ? setting.value : null;
    
    return NextResponse.json({ value }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error retrieving setting:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve setting' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    // Validate API key format for Anthropic
    if (key === 'anthropic_key') {
      if (!value.startsWith('sk-ant-')) {
        return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
      }

      // Test the API key with Anthropic using Sonnet 4
      const isValid = await testAnthropicApiKey(value);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid API key - failed to authenticate with Anthropic' }, { status: 400 });
      }
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Upsert the setting
    await collection.updateOne(
      { key },
      { $set: { key, value, updatedAt: new Date() } },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { error: 'Failed to save setting' }, 
      { status: 500 }
    );
  }
}