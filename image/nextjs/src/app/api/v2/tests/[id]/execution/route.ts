import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'tilt';
const SCREENSHOTS_DIR = '/home/tilt/image/nextjs/public/screenshots';

let client: MongoClient;

async function getClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

interface ExecutionArtifact {
  timestamp: string;
  thought?: string;
  screenshotPath?: string;
}

// PUT /api/v2/tests/[id]/execution - Save execution artifacts
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { artifacts, status } = await request.json() as {
      artifacts: ExecutionArtifact[];
      status: 'running' | 'completed' | 'error';
    };

    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('tests');

    // Ensure screenshots directory exists
    if (!existsSync(SCREENSHOTS_DIR)) {
      await mkdir(SCREENSHOTS_DIR, { recursive: true });
    }

    // Create test-specific directory
    const testDir = join(SCREENSHOTS_DIR, params.id);
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }

    // Clean up old screenshots for this test
    try {
      const existingFiles = await readdir(testDir);
      await Promise.all(
        existingFiles.map(file => unlink(join(testDir, file)))
      );
    } catch (error) {
      // Directory might not exist yet, that's fine
    }

    // Process artifacts and save screenshots
    const processedArtifacts = await Promise.all(
      artifacts.map(async (artifact, index) => {
        if (artifact.screenshotPath && artifact.screenshotPath.startsWith('data:image')) {
          // Convert base64 data URL to file
          const base64Data = artifact.screenshotPath.split(',')[1];
          const filename = `${index}.png`;
          const filePath = join(testDir, filename);
          
          await writeFile(filePath, Buffer.from(base64Data, 'base64'));
          
          return {
            ...artifact,
            screenshotPath: filePath
          };
        }
        return artifact;
      })
    );

    const test = await collection.findOne({ _id: new ObjectId(params.id) });
    
    if (status === 'running' && test?.lastRun?.status === 'running') {
      // REAL-TIME UPDATE: Append new artifacts to existing running test
      const existingArtifacts = test.lastRun.artifacts || [];
      const updatedArtifacts = [...existingArtifacts, ...processedArtifacts];
      
      await collection.updateOne(
        { _id: new ObjectId(params.id) },
        {
          $set: {
            'lastRun.artifacts': updatedArtifacts,
            'lastRun.timestamp': new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      );
      
      console.log(`🔥 REAL-TIME: Appended ${processedArtifacts.length} artifacts to running test ${params.id}`);
    } else {
      // NEW TEST RUN or COMPLETION: Create new history entry
      const historyEntry = {
        id: new ObjectId().toString(),
        timestamp: new Date().toISOString(),
        status,
        artifacts: processedArtifacts
      };

      if (status === 'running') {
        // Starting new test run
        await collection.updateOne(
          { _id: new ObjectId(params.id) },
          {
            $set: {
              lastRun: historyEntry,
              updated_at: new Date().toISOString()
            }
          }
        );
        console.log(`🔥 REAL-TIME: Started new test run ${params.id}`);
      } else {
        // Test completed or errored - add to history
        await collection.updateOne(
          { _id: new ObjectId(params.id) },
          {
            $set: {
              lastRun: historyEntry,
              updated_at: new Date().toISOString()
            },
            $push: {
              history: {
                $each: [historyEntry],
                $slice: -50 // Keep only last 50 runs
              } as any
            }
          }
        );
        console.log(`🔥 REAL-TIME: Completed test run ${params.id} with status ${status}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save execution artifacts:', error);
    return NextResponse.json(
      { error: 'Failed to save execution artifacts' },
      { status: 500 }
    );
  }
}

// GET /api/v2/tests/[id]/execution - Get last run artifacts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('tests');

    const test = await collection.findOne({ _id: new ObjectId(params.id) });
    
    if (!test || !test.lastRun) {
      return NextResponse.json({ artifacts: [], status: null });
    }

    // Convert screenshot file paths to URLs for frontend
    const artifactsWithUrls = test.lastRun.artifacts.map((artifact: ExecutionArtifact, index: number) => {
      if (artifact.screenshotPath && existsSync(artifact.screenshotPath)) {
        const filename = `${index}.png`;
        const screenshotUrl = `/api/v2/screenshots/${params.id}/${filename}`;
        return {
          ...artifact,
          screenshot: screenshotUrl
        };
      }
      return artifact;
    });

    return NextResponse.json({
      artifacts: artifactsWithUrls,
      status: test.lastRun.status,
      timestamp: test.lastRun.timestamp
    });
  } catch (error) {
    console.error('Failed to get execution artifacts:', error);
    return NextResponse.json(
      { error: 'Failed to get execution artifacts' },
      { status: 500 }
    );
  }
}