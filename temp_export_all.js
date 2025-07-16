use('tilt');
const tasks = db.tasks.find({}).toArray();
const allTests = [];
tasks.forEach(task => {
    const test = {
        name: task.label || task.instructions?.substring(0, 100) + '...' || 'Untitled Test',
        steps: task.metadata?.original_steps || (task.instructions ? task.instructions.split('\n').filter(line => line.trim()) : []),
        tags: [],
        _original_label: task.label,
        _original_instructions: task.instructions ? task.instructions.substring(0, 200) : null,
        _original_source: task.metadata?.source
    };
    allTests.push(test);
});
print(JSON.stringify(allTests, null, 2));