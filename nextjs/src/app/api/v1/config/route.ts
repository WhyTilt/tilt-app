import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'tilt';

interface ConfigDocument {
  key: string;
  value: string;
  updated_at: Date;
}

async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
}

export async function GET() {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const config = db.collection<ConfigDocument>('config');

    // Get API key configuration
    const apiKeyDoc = await config.findOne({ key: 'anthropic_api_key' });
    const modelDoc = await config.findOne({ key: 'anthropic_model' });

    await client.close();

    return NextResponse.json({
      is_configured: !!apiKeyDoc?.value,
      model: modelDoc?.value || 'claude-sonnet-4-20250514',
      has_api_key: !!apiKeyDoc?.value
    });
  } catch (error) {
    console.error('Error getting config:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, model } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Basic validation for Anthropic API key format
    if (!api_key.startsWith('sk-ant-api03-')) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key format' },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const config = db.collection<ConfigDocument>('config');

    // Store API key
    await config.updateOne(
      { key: 'anthropic_api_key' },
      {
        $set: {
          key: 'anthropic_api_key',
          value: api_key,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    // Store model if provided
    if (model) {
      await config.updateOne(
        { key: 'anthropic_model' },
        {
          $set: {
            key: 'anthropic_model',
            value: model,
            updated_at: new Date()
          }
        },
        { upsert: true }
      );
    }

    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}