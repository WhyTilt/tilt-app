import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017/tilt';

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db('tilt');
}

export async function GET() {
  try {
    const db = await getDatabase();
    const settings = await db.collection('settings').findOne({}, { sort: { updated_at: -1 } });
    
    return NextResponse.json({ 
      api_keys: settings?.api_keys || {} 
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ api_keys: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys } = body;

    const db = await getDatabase();
    const settingsCollection = db.collection('settings');
    
    // Get existing settings or create new
    const existingSettings = await settingsCollection.findOne({}, { sort: { updated_at: -1 } }) || {};
    
    // Update with new API keys
    const settingsDoc = {
      ...existingSettings,
      api_keys: keys,
      updated_at: new Date()
    };
    
    // Remove _id if it exists to avoid conflicts
    if (settingsDoc._id) {
      delete settingsDoc._id;
    }
    
    // Replace the existing settings document
    await settingsCollection.replaceOne(
      {},
      settingsDoc,
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}