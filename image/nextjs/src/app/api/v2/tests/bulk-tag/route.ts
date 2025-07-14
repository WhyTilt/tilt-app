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

// POST /api/v2/tests/bulk-tag - Bulk add/remove tags from multiple tests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testIds, tag, action } = body; // action: 'add' or 'remove'
    
    console.log(`Bulk ${action} tag "${tag}" for ${testIds.length} tests`);
    
    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return NextResponse.json(
        { error: 'testIds array is required' },
        { status: 400 }
      );
    }
    
    if (!tag || !tag.trim()) {
      return NextResponse.json(
        { error: 'tag is required' },
        { status: 400 }
      );
    }
    
    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "add" or "remove"' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    
    const objectIds = testIds.map(id => new ObjectId(id));
    let testsResult = null;
    let tasksResult = null;
    
    if (action === 'add') {
      // Add tag to tests collection
      testsResult = await db.collection('tests').updateMany(
        { _id: { $in: objectIds } },
        { 
          $addToSet: { tags: tag },
          $set: { updated_at: new Date().toISOString() }
        }
      );
      
      // Add tag to tasks collection (using metadata.source)
      tasksResult = await db.collection('tasks').updateMany(
        { _id: { $in: objectIds } },
        { 
          $set: { 
            'metadata.source': tag,
            updated_at: new Date().toISOString()
          }
        }
      );
    } else {
      // Remove tag from tests collection
      testsResult = await db.collection('tests').updateMany(
        { _id: { $in: objectIds } },
        { 
          $pull: { tags: tag },
          $set: { updated_at: new Date().toISOString() }
        }
      );
      
      // Remove tag from tasks collection
      tasksResult = await db.collection('tasks').updateMany(
        { _id: { $in: objectIds } },
        { 
          $unset: { 'metadata.source': '' },
          $set: { updated_at: new Date().toISOString() }
        }
      );
    }
    
    console.log(`Bulk ${action} results - tests:`, testsResult.modifiedCount, 'tasks:', tasksResult.modifiedCount);
    
    // Get the updated tests to return to client
    const updatedTests = await Promise.all([
      // Get from tests collection
      db.collection('tests').find({ _id: { $in: objectIds } }).toArray(),
      // Get from tasks collection  
      db.collection('tasks').find({ _id: { $in: objectIds } }).toArray()
    ]);
    
    // Combine and format the updated tests
    const allUpdatedTests = [
      // Tests collection format
      ...updatedTests[0].map(test => ({
        id: test._id.toString(),
        name: test.name,
        tags: test.tags || [],
        steps: test.steps || [],
        created_at: test.created_at,
        updated_at: test.updated_at
      })),
      // Tasks collection format
      ...updatedTests[1].map(task => ({
        id: task._id.toString(),
        name: task.label || task.instructions?.substring(0, 100) + '...' || 'Untitled Task',
        tags: task.metadata?.source ? [task.metadata.source] : [],
        steps: task.metadata?.original_steps || [],
        created_at: task.created_at,
        updated_at: task.updated_at
      }))
    ];
    
    return NextResponse.json({ 
      success: true,
      action,
      tag,
      testsModified: testsResult.modifiedCount,
      tasksModified: tasksResult.modifiedCount,
      totalModified: testsResult.modifiedCount + tasksResult.modifiedCount,
      updatedTests: allUpdatedTests
    });

  } catch (error) {
    console.error('Error in bulk tag operation:', error);
    return NextResponse.json(
      { error: `Failed to ${body?.action || 'update'} tags: ${error.message}` },
      { status: 500 }
    );
  }
}