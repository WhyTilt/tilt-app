// Export only tagged tests (airbnb and automation)
use('tilt');

const tasks = db.tasks.find({}).toArray();
const taggedTests = [];

tasks.forEach(task => {
    const isAirbnb = (task.label && task.label.toLowerCase().includes('airbnb')) ||
                     (task.instructions && task.instructions.toLowerCase().includes('airbnb')) ||
                     (task.metadata && task.metadata.source === 'airbnb');
    
    const isAutomation = (task.label && task.label.toLowerCase().includes('automation')) ||
                         (task.instructions && task.instructions.toLowerCase().includes('automation'));
    
    // Only include tests that have airbnb or automation tags
    if (isAirbnb || isAutomation) {
        const test = {
            name: task.label || task.instructions?.substring(0, 100) + '...' || 'Untitled Test',
            steps: task.metadata?.original_steps || (task.instructions ? task.instructions.split('\n').filter(line => line.trim()) : []),
            tags: []
        };
        
        if (isAirbnb) test.tags.push('airbnb');
        if (isAutomation) test.tags.push('automation');
        taggedTests.push(test);
    }
});

print(JSON.stringify(taggedTests, null, 2));