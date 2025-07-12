import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'tilt';

let client: MongoClient;

async function getClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

// GET /api/v2/test-suites - Get all test suites
export async function GET() {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('test-suites');
    
    const testSuites = await collection.find({}).toArray();
    
    // Convert ObjectId to string for JSON serialization
    const serializedSuites = testSuites.map(suite => ({
      ...suite,
      id: suite._id.toString(),
      _id: undefined
    }));
    
    return NextResponse.json(serializedSuites);
  } catch (error) {
    console.error('Error fetching test suites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test suites' },
      { status: 500 }
    );
  }
}

// POST /api/v2/test-suites - Create new test suite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, parent_id } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('test-suites');
    
    const testSuite = {
      name,
      description: description || '',
      parent_id: parent_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await collection.insertOne(testSuite);
    
    const createdSuite = {
      ...testSuite,
      id: result.insertedId.toString()
    };
    
    return NextResponse.json(createdSuite, { status: 201 });
  } catch (error) {
    console.error('Error creating test suite:', error);
    return NextResponse.json(
      { error: 'Failed to create test suite' },
      { status: 500 }
    );
  }
}