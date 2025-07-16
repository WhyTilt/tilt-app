// Export Tasks to JSON Script
// This script exports all tasks from the tasks collection to a JSON file
// for loading tests on demand

print("Starting export from tasks to JSON...");

// Use the tilt database
use('tilt');

// Get all tasks
const tasks = db.tasks.find({}).toArray();
print(`Found ${tasks.length} tasks to export`);

const exportedTests = [];
let airbnbCount = 0;
let automationCount = 0;

tasks.forEach(task => {
    // Convert task to test format
    const test = {
        name: task.label || task.instructions?.substring(0, 100) + '...' || 'Untitled Test',
        tags: [],
        steps: task.metadata?.original_steps || (task.instructions ? task.instructions.split('\n').filter(line => line.trim()) : []),
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || task.created_at || new Date().toISOString(),
        status: task.status || 'pending',
        lastRun: task.completed_at || null,
        // Preserve original task data for reference
        original_task_id: task._id.toString(),
        metadata: task.metadata
    };
    
    // Check if this is an Airbnb-related test
    const isAirbnb = task.label?.toLowerCase().includes('airbnb') ||
                     task.instructions?.toLowerCase().includes('airbnb') ||
                     task.metadata?.source === 'airbnb';
    
    // Check if this is an automation test
    const isAutomation = task.label?.toLowerCase().includes('automation') ||
                         task.instructions?.toLowerCase().includes('automation');
    
    if (isAirbnb) {
        test.tags.push('airbnb');
        airbnbCount++;
    }
    
    if (isAutomation) {
        test.tags.push('automation');
        automationCount++;
    }
    
    // Add source tag if available
    if (task.metadata?.source && !test.tags.includes(task.metadata.source)) {
        test.tags.push(task.metadata.source);
    }
    
    exportedTests.push(test);
});

// Write to file (this would need to be run outside MongoDB shell)
print("Export data prepared. Use the following command to save to file:");
print("mongosh --eval \"load('migrate_tasks_to_tests.js')\" > exported_tests.json");

print(`Export completed!`);
print(`Total exported: ${exportedTests.length}`);
print(`Airbnb tests: ${airbnbCount}`);
print(`Automation tests: ${automationCount}`);

// Output the JSON (will be captured when redirected to file)
printjson(exportedTests);