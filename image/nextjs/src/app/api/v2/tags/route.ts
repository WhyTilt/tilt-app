import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'tilt';

export async function GET() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Get all tags from the dedicated tags collection
    const tagsFromCollection = await db.collection('tags').find({}).toArray();
    const collectionTags = tagsFromCollection.map(tag => tag.name);
    
    // Get all tags from existing tests
    const tests = await db.collection('tasks').find({}).toArray();
    const testTags = tests
      .filter(test => test.metadata?.source)
      .map(test => test.metadata.source);
    
    // Also check the tests collection
    const testsFromTestsCollection = await db.collection('tests').find({}).toArray();
    const testsCollectionTags = testsFromTestsCollection
      .flatMap(test => test.tags || []);
    
    // Combine and deduplicate all tags
    const allTags = [...new Set([...collectionTags, ...testTags, ...testsCollectionTags])];
    
    await client.close();
    
    return NextResponse.json(allTags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}