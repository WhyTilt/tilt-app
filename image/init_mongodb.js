// MongoDB initialization script
// This script sets up the initial database, collection, and loads initial tasks

// Use the tilt database
use('tilt');

// Initialize database for persistent storage (preserve existing data)
print("Initializing database for persistent storage...");

// Switch to the tilt database
use('tilt');
print("Using database: tilt");

// Check if tasks collection exists, create if it doesn't
const collections = db.getCollectionNames();
if (!collections.includes('tasks')) {
    db.createCollection('tasks');
    print("Created new tasks collection");
} else {
    print("Tasks collection already exists - preserving existing data");
}

// Create indexes for better performance (these are idempotent)
db.tasks.createIndex({ "status": 1 });
db.tasks.createIndex({ "created_at": 1 });
db.tasks.createIndex({ "started_at": 1 });
print("Ensured database indexes exist");

// Show current task count
const taskCount = db.tasks.countDocuments();
print(`Database contains ${taskCount} existing tasks`);

// Load test data from demo-test-steps.json - only once, even if later deleted
try {
    // Check if we've already attempted to load demo data (even if later deleted)
    const demoLoadFlag = db.system_flags.findOne({ _id: 'demo_data_loaded' });
    
    if (!demoLoadFlag) {
        // Read the demo test steps data
        const fs = require('fs');
        const demoDataPath = './image/demo-test-steps.json';
        
        if (fs.existsSync(demoDataPath)) {
            const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));
            
            // Convert test cases to tasks
            if (demoData.tests && Array.isArray(demoData.tests)) {
                print(`Loading ${demoData.tests.length} test cases as tasks...`);
                
                const tasks = demoData.tests.map(test => ({
                    instructions: `Execute the following test steps for: ${test.label}\n\nSteps:\n${test.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`,
                    label: test.label,
                    status: 'pending',
                    created_at: new Date(),
                    metadata: {
                        original_steps: test.steps
                    }
                }));
                
                // Insert tasks into the collection
                const insertResult = db.tasks.insertMany(tasks);
                print(`Successfully inserted ${insertResult.insertedIds.length} test tasks`);
            }
            
            // Set flag to prevent reloading demo data on future restarts
            db.system_flags.insertOne({ _id: 'demo_data_loaded', loaded_at: new Date() });
            print("Demo data load flag set - will not reload on future restarts");
        } else {
            print("Demo test data file not found, skipping test data initialization");
        }
    } else {
        print("Demo data already loaded previously, skipping to prevent re-adding deleted data");
    }
} catch (error) {
    print(`Error loading demo test data: ${error.message}`);
}

// Database initialized 
print("\nDatabase initialization completed");

print("\nMongoDB database 'tilt' initialization completed!");