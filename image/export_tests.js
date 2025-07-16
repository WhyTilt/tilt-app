// Export Tasks to Tests JSON
use('tilt');

const tasks = db.tasks.find({}).toArray();
const exportedTests = [];

tasks.forEach(task => {
    const test = {
        name: task.label || task.instructions?.substring(0, 100) + '...' || 'Untitled Test',
        tags: [],
        steps: task.metadata?.original_steps || (task.instructions ? task.instructions.split('\n').filter(line => line.trim()) : []),
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || task.created_at || new Date().toISOString(),
        status: task.status || 'pending',
        lastRun: task.completed_at || null,
        original_task_id: task._id.toString(),
        metadata: task.metadata
    };
    
    const isAirbnb = (task.label && task.label.toLowerCase().includes('airbnb')) ||
                     (task.instructions && task.instructions.toLowerCase().includes('airbnb')) ||
                     (task.metadata && task.metadata.source === 'airbnb');
    
    const isAutomation = (task.label && task.label.toLowerCase().includes('automation')) ||
                         (task.instructions && task.instructions.toLowerCase().includes('automation'));
    
    if (isAirbnb) test.tags.push('airbnb');
    if (isAutomation) test.tags.push('automation');
    if (task.metadata?.source && !test.tags.includes(task.metadata.source)) {
        test.tags.push(task.metadata.source);
    }
    
    exportedTests.push(test);
});

print(JSON.stringify(exportedTests, null, 2));