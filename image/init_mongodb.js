// MongoDB initialization script
// This script sets up the initial database, collection, and loads initial tasks

// Use the automator database
use('automator');

// Initialize database for persistent storage (preserve existing data)
print("Initializing database for persistent storage...");

// Switch to the automator database
use('automator');
print("Using database: automator");

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

// Database initialized with empty tasks collection for persistent storage
print("\nDatabase initialized with empty tasks collection for persistent storage");

print("\nMongoDB database 'automator' initialization completed!");