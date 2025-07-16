import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'tilt';

export async function POST(
  request: NextRequest,
  { params }: { params: { tag: string } }
) {
  try {
    const tag = decodeURIComponent(params.tag);
    const body = await request.json().catch(() => ({}));
    const { color = '#3b82f6' } = body;
    console.log('CREATE TAG API CALLED FOR:', tag, 'with color:', color);
    
    // Validate tag name
    if (!tag || tag.trim().length === 0) {
      console.error('Invalid tag name: empty or whitespace');
      return NextResponse.json(
        { error: 'Tag name cannot be empty' },
        { status: 400 }
      );
    }
    
    if (tag.length > 100) {
      console.error('Invalid tag name: too long');
      return NextResponse.json(
        { error: 'Tag name cannot be longer than 100 characters' },
        { status: 400 }
      );
    }
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('MongoDB connected successfully');
    
    const db = client.db(DB_NAME);
    
    // Create the tag in the tags collection if it doesn't exist
    const result = await db.collection('tags').updateOne(
      { name: tag },
      { 
        $setOnInsert: { 
          name: tag, 
          created_at: new Date(),
          description: '',
          color: color
        } 
      },
      { upsert: true }
    );
    
    console.log('TAG CREATION RESULT:', result);
    await client.close();
    
    return NextResponse.json({ success: true, created: result.upsertedCount > 0 });
  } catch (error) {
    console.error('Error creating tag:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: `Failed to create tag: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tag: string } }
) {
  try {
    const tag = decodeURIComponent(params.tag);
    console.log('DELETE TAG API CALLED FOR:', tag);
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Remove the tag from all tests that have it  
    const result1 = await db.collection('tasks').updateMany(
      { 'metadata.source': tag },
      { $unset: { 'metadata.source': "" } }
    );
    
    // Also check if there are any in the tests collection
    const result2 = await db.collection('tests').updateMany(
      { tags: tag },
      { $pull: { tags: tag } }
    );
    
    // Remove the tag from the tags collection
    const result3 = await db.collection('tags').deleteOne(
      { name: tag }
    );
    
    console.log('MONGODB UPDATE RESULT tasks:', result1);
    console.log('MONGODB UPDATE RESULT tests:', result2);
    console.log('MONGODB DELETE RESULT tags:', result3);
    await client.close();
    
    return NextResponse.json({ 
      success: true, 
      modifiedTasks: result1.modifiedCount, 
      modifiedTests: result2.modifiedCount,
      deletedTag: result3.deletedCount > 0
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}