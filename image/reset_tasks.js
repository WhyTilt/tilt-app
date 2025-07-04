// Reset Tasks Script
// This script resets all task statuses to pending and sets app run state to idle
// Run on MongoDB startup to ensure clean state

print("Starting task reset script...");

// Use the tilt database
use('tilt');

// Reset all tasks to pending status
print("Resetting all task statuses to pending...");
const taskUpdateResult = db.tasks.updateMany(
    {}, // Match all tasks
    {
        $set: {
            status: 'pending',
            started_at: null,
            completed_at: null,
            result: null,
            error: null
        }
    }
);

print(`Updated ${taskUpdateResult.modifiedCount} tasks to pending status`);

// Create or update app_state collection to set run state to idle
print("Setting app run state to idle...");
const appStateResult = db.app_state.replaceOne(
    { _id: 'global' },
    {
        _id: 'global',
        run_state: 'idle',
        last_reset: new Date(),
        active_task_id: null
    },
    { upsert: true }
);

if (appStateResult.upsertedCount > 0) {
    print("Created new app_state document with idle state");
} else {
    print("Updated existing app_state to idle");
}

// Show summary of reset operation
const totalTasks = db.tasks.countDocuments();
const pendingTasks = db.tasks.countDocuments({ status: 'pending' });
const runningTasks = db.tasks.countDocuments({ status: 'running' });
const completedTasks = db.tasks.countDocuments({ status: 'completed' });
const errorTasks = db.tasks.countDocuments({ status: 'error' });

print("\n=== RESET SUMMARY ===");
print(`Total tasks: ${totalTasks}`);
print(`Pending tasks: ${pendingTasks}`);
print(`Running tasks: ${runningTasks}`);
print(`Completed tasks: ${completedTasks}`);
print(`Error tasks: ${errorTasks}`);
const appState = db.app_state.findOne({ _id: 'global' });
if (appState) {
    print(`App state: ${appState.run_state}`);
} else {
    print("App state: not found");
}
print("=== END RESET ===");

print("Task reset script completed successfully!");