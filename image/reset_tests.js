// Reset Tests Script
// This script resets all test statuses to pending and sets app run state to idle
// Run on MongoDB startup to ensure clean state

print("Starting test reset script...");

// Use the tilt database
use('tilt');

// Reset all tests to pending status
print("Resetting all test statuses to pending...");
const testUpdateResult = db.tests.updateMany(
    {}, // Match all tests
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

print(`Updated ${testUpdateResult.modifiedCount} tests to pending status`);

// Create or update app_state collection to set run state to idle
print("Setting app run state to idle...");
const appStateResult = db.app_state.replaceOne(
    { _id: 'global' },
    {
        _id: 'global',
        run_state: 'idle',
        last_reset: new Date(),
        active_test_id: null
    },
    { upsert: true }
);

if (appStateResult.upsertedCount > 0) {
    print("Created new app_state document with idle state");
} else {
    print("Updated existing app_state to idle");
}

// Show summary of reset operation
const totalTests = db.tests.countDocuments();
const pendingTests = db.tests.countDocuments({ status: 'pending' });
const runningTests = db.tests.countDocuments({ status: 'running' });
const completedTests = db.tests.countDocuments({ status: 'completed' });
const errorTests = db.tests.countDocuments({ status: 'error' });

print("\n=== RESET SUMMARY ===");
print(`Total tests: ${totalTests}`);
print(`Pending tests: ${pendingTests}`);
print(`Running tests: ${runningTests}`);
print(`Completed tests: ${completedTests}`);
print(`Error tests: ${errorTests}`);
const appState = db.app_state.findOne({ _id: 'global' });
if (appState) {
    print(`App state: ${appState.run_state}`);
} else {
    print("App state: not found");
}
print("=== END RESET ===");

print("Test reset script completed successfully!");