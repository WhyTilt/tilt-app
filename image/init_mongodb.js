// MongoDB initialization script
// This script sets up the initial database, collection, and loads initial tasks

// Use the signet-demo database
use('signet-demo');

// FORCE COMPLETE RESET - Clear ALL collections and database for ephemeral start
print("Starting complete database reset for ephemeral boot...");

// Drop the entire database if it exists
db.dropDatabase();
print("Dropped entire database for fresh start");

// Recreate database by switching to it
use('signet-demo');
print("Recreated database: signet-demo");

// Create the tasks collection
db.createCollection('tasks');
print("Created tasks collection");

// Create indexes for better performance
db.tasks.createIndex({ "status": 1 });
db.tasks.createIndex({ "created_at": 1 });
db.tasks.createIndex({ "started_at": 1 });
print("Created database indexes");

// Load initial tasks from init_tasks.json (FRESH ON EVERY BOOT)
print("\nLoading fresh tasks from init_tasks.json...");
try {
    // Read and parse the JSON file
    print("Reading JSON file from ./init_tasks.json...");
    const tasksData = fs.readFileSync('./init_tasks.json', 'utf8');
    print(`File content length: ${tasksData.length} characters`);
    print(`File content preview: ${tasksData.substring(0, 200)}...`);
    
    print("Parsing JSON...");
    const tasks = JSON.parse(tasksData);
    print(`Found ${tasks.length} tasks in JSON file`);
    
    // Validate that tasks have instructions
    for (let i = 0; i < tasks.length; i++) {
        if (!tasks[i].instructions || !Array.isArray(tasks[i].instructions)) {
            print(`WARNING: Task ${i} has invalid instructions: ${JSON.stringify(tasks[i].instructions)}`);
        } else {
            print(`Task ${i} has ${tasks[i].instructions.length} instruction steps`);
        }
    }
    
    // Transform tasks to match the expected database schema
    print("Transforming tasks for database insertion...");
    const transformedTasks = tasks.map((task, index) => {
        const firstInstruction = task.instructions && task.instructions.length > 0 ? 
            task.instructions[0].substring(0, 50) + '...' : 'No instructions';
        print(`  Processing task ${index + 1}: ${firstInstruction}`);
        
        const now = new Date();
        const transformedTask = {
            instructions: task.instructions || [],  // Ensure it's always an array
            tool_use: task.tool_use || null,
            status: 'pending',  // ALWAYS START AS PENDING
            created_at: now,
            started_at: null,    // ALWAYS NULL ON FRESH BOOT
            completed_at: null,  // ALWAYS NULL ON FRESH BOOT
            last_run: null,      // ALWAYS NULL ON FRESH BOOT
            result: null,
            error: null,
            metadata: {},
            progress: {},
            progress_history: []
        };
        
        // Double-check the transformation
        print(`    -> Instructions array length: ${transformedTask.instructions.length}`);
        print(`    -> Status: ${transformedTask.status}`);
        print(`    -> Last run: ${transformedTask.last_run}`);
        
        return transformedTask;
    });
    
    // Insert the transformed tasks
    print(`\nInserting ${transformedTasks.length} tasks into database...`);
    const result = db.tasks.insertMany(transformedTasks);
    print(`Successfully inserted ${result.insertedIds.length} tasks into database`);
    
    // Verify insertion
    const verifyCount = db.tasks.countDocuments();
    print(`Database now contains ${verifyCount} total tasks`);
    
    // Show detailed summary of loaded tasks to verify ephemeral setup
    print("\n=== EPHEMERAL TASKS LOADED ===");
    db.tasks.find({}).forEach((task, index) => {
        print(`Task ${index + 1}:`);
        print(`  ID: ${task._id}`);
        print(`  Instructions: ${Array.isArray(task.instructions) ? `[${task.instructions.length} steps]` : 'NULL/INVALID'}`);
        print(`  Status: ${task.status}`);
        print(`  Last Run: ${task.last_run}`);
        print(`  Created: ${task.created_at}`);
        if (task.instructions && task.instructions.length > 0) {
            print(`  First step: ${task.instructions[0].substring(0, 60)}...`);
        }
        print("  ---");
    });
    print("=== END EPHEMERAL TASKS ===");
    
} catch (error) {
    print(`\nERROR loading tasks from init_tasks.json:`);
    print(`Error type: ${error.name}`);
    print(`Error message: ${error.message}`);
    print(`Stack trace: ${error.stack}`);
    print("\nContinuing with empty tasks collection...");
}

print("\nMongoDB database 'signet-demo' initialization completed!");