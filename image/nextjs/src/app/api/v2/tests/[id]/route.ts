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

// GET /api/v2/tests/[id] - Get specific test
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('tests');
    
    const test = await collection.findOne({ _id: new ObjectId(params.id) });
    
    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }
    
    const serializedTest = {
      ...test,
      id: test._id.toString(),
      _id: undefined
    };
    
    return NextResponse.json(serializedTest);
  } catch (error) {
    console.error('Error fetching test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test' },
      { status: 500 }
    );
  }
}

// PUT /api/v2/tests/[id] - Update test
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, tags, steps } = body;
    
    console.log('PUT /api/v2/tests/[id] - Received data:', { name, description, tags, steps });
    
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    
    // First try the tests collection
    let collection = db.collection('tests');
    let result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(tags !== undefined && { tags }),
          ...(steps !== undefined && { steps }),
          updated_at: new Date().toISOString()
        }
      }
    );
    
    let updatedTest = null;
    
    // If not found in tests, try tasks collection
    if (result.matchedCount === 0) {
      collection = db.collection('tasks');
      
      // For tasks collection, update the label and metadata fields
      const taskUpdateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (name !== undefined) {
        taskUpdateData.label = name;
      }
      
      if (tags !== undefined) {
        // Store first tag in metadata.source for compatibility
        if (tags.length > 0) {
          taskUpdateData['metadata.source'] = tags[0];
        }
      }
      
      if (steps !== undefined) {
        taskUpdateData['metadata.original_steps'] = steps;
      }
      
      // Handle tag removal separately
      if (tags !== undefined && tags.length === 0) {
        // Remove the metadata.source field if no tags
        result = await collection.updateOne(
          { _id: new ObjectId(params.id) },
          { 
            $set: taskUpdateData,
            $unset: { 'metadata.source': '' }
          }
        );
      } else {
        // Normal update
        result = await collection.updateOne(
          { _id: new ObjectId(params.id) },
          { $set: taskUpdateData }
        );
      }
      
      if (result.matchedCount > 0) {
        // Get the updated task and convert to test format
        const updatedTask = await collection.findOne({ _id: new ObjectId(params.id) });
        if (updatedTask) {
          updatedTest = {
            id: updatedTask._id.toString(),
            name: updatedTask.label || updatedTask.instructions?.substring(0, 100) + '...' || 'Untitled Task',
            tags: updatedTask.metadata?.source ? [updatedTask.metadata.source] : [],
            steps: updatedTask.metadata?.original_steps || [],
            created_at: updatedTask.created_at || null,
            updated_at: updatedTask.updated_at || null
          };
        }
      }
    } else {
      // Get updated test from tests collection
      updatedTest = await collection.findOne({ _id: new ObjectId(params.id) });
      if (updatedTest) {
        updatedTest = {
          ...updatedTest,
          id: updatedTest._id.toString(),
          _id: undefined
        };
      }
    }
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }
    
    console.log('PUT /api/v2/tests/[id] - Updated test:', updatedTest);
    
    return NextResponse.json(updatedTest);
  } catch (error) {
    console.error('Error updating test:', error);
    return NextResponse.json(
      { error: 'Failed to update test' },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/tests/[id] - Delete test
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('tests');
    
    const result = await collection.deleteOne({ _id: new ObjectId(params.id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    return NextResponse.json(
      { error: 'Failed to delete test' },
      { status: 500 }
    );
  }
}