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

// GET /api/v2/test-suites/[id] - Get specific test suite
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('test-suites');
    
    const testSuite = await collection.findOne({ _id: new ObjectId(params.id) });
    
    if (!testSuite) {
      return NextResponse.json(
        { error: 'Test suite not found' },
        { status: 404 }
      );
    }
    
    const serializedSuite = {
      ...testSuite,
      id: testSuite._id.toString(),
      _id: undefined
    };
    
    return NextResponse.json(serializedSuite);
  } catch (error) {
    console.error('Error fetching test suite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test suite' },
      { status: 500 }
    );
  }
}

// PUT /api/v2/test-suites/[id] - Update test suite
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, parent_id } = body;
    
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('test-suites');
    
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(parent_id !== undefined && { parent_id }),
      updated_at: new Date().toISOString()
    };
    
    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Test suite not found' },
        { status: 404 }
      );
    }
    
    const updatedSuite = await collection.findOne({ _id: new ObjectId(params.id) });
    
    return NextResponse.json({
      ...updatedSuite,
      id: updatedSuite?._id.toString(),
      _id: undefined
    });
  } catch (error) {
    console.error('Error updating test suite:', error);
    return NextResponse.json(
      { error: 'Failed to update test suite' },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/test-suites/[id] - Delete test suite
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const suitesCollection = db.collection('test-suites');
    const testsCollection = db.collection('tests');
    
    // Delete all tests in this suite
    await testsCollection.deleteMany({ suite_id: params.id });
    
    // Delete the test suite
    const result = await suitesCollection.deleteOne({ _id: new ObjectId(params.id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Test suite not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Test suite deleted successfully' });
  } catch (error) {
    console.error('Error deleting test suite:', error);
    return NextResponse.json(
      { error: 'Failed to delete test suite' },
      { status: 500 }
    );
  }
}