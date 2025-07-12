import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'tilt';
const SCREENSHOTS_DIR = '/tmp/tilt-screenshots';

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

    // Update test with last run artifacts
    await collection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          lastRun: {
            timestamp: new Date().toISOString(),
            status,
            artifacts: processedArtifacts
          },
          updated_at: new Date().toISOString()
        }
      }
    );

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

    // Convert screenshot file paths to base64 data URLs for frontend
    const artifactsWithImages = await Promise.all(
      test.lastRun.artifacts.map(async (artifact: ExecutionArtifact) => {
        if (artifact.screenshotPath && existsSync(artifact.screenshotPath)) {
          try {
            const imageBuffer = await import('fs').then(fs => 
              fs.promises.readFile(artifact.screenshotPath!)
            );
            const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            return {
              ...artifact,
              screenshot: base64Image
            };
          } catch (error) {
            console.warn('Failed to load screenshot:', artifact.screenshotPath);
            return artifact;
          }
        }
        return artifact;
      })
    );

    return NextResponse.json({
      artifacts: artifactsWithImages,
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