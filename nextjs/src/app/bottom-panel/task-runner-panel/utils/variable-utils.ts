/**
 * Extract variables from task instructions
 * Variables are in the format {VARIABLE_NAME}
 */
export function extractVariables(instructions: string[] | null): string[] {
  if (!instructions) return [];
  
  const variables = new Set<string>();
  const variableRegex = /\{([A-Z_][A-Z0-9_]*)\}/g;
  
  instructions.forEach(instruction => {
    let match;
    while ((match = variableRegex.exec(instruction)) !== null) {
      variables.add(match[1]);
    }
  });
  
  return Array.from(variables);
}

/**
 * Extract variables from a single instruction string
 */
export function extractVariablesFromString(instruction: string): string[] {
  const variables = new Set<string>();
  const variableRegex = /\{([A-Z_][A-Z0-9_]*)\}/g;
  
  let match;
  while ((match = variableRegex.exec(instruction)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

/**
 * Interpolate variables in task instructions
 */
export function interpolateVariables(
  instructions: string[] | null, 
  variables: Record<string, string>
): string[] | null {
  if (!instructions) return null;
  
  return instructions.map(instruction => {
    let interpolated = instruction;
    
    // Replace all {VARIABLE_NAME} with actual values
    Object.entries(variables).forEach(([name, value]) => {
      const regex = new RegExp(`\\{${name}\\}`, 'g');
      interpolated = interpolated.replace(regex, value);
    });
    
    return interpolated;
  });
}

/**
 * Interpolate variables in a single instruction string
 */
export function interpolateVariablesInString(
  instruction: string,
  variables: Record<string, string>
): string {
  let interpolated = instruction;
  
  // Replace all {VARIABLE_NAME} with actual values
  Object.entries(variables).forEach(([name, value]) => {
    const regex = new RegExp(`\\{${name}\\}`, 'g');
    interpolated = interpolated.replace(regex, value);
  });
  
  return interpolated;
}

/**
 * Get all unique variables from multiple tasks
 */
export function getAllVariablesFromTasks(tasks: Array<{ 
  instructions: string[] | null;
  tool_use?: {
    tool: string;
    arguments: Record<string, any>;
  };
}>): string[] {
  const allVariables = new Set<string>();
  
  tasks.forEach(task => {
    // Extract variables from instructions
    const instructionVariables = extractVariables(task.instructions);
    instructionVariables.forEach(variable => allVariables.add(variable));
    
    // Extract variables from tool_use arguments
    if (task.tool_use && task.tool_use.arguments) {
      Object.values(task.tool_use.arguments).forEach(value => {
        if (typeof value === 'string') {
          const toolVariables = extractVariablesFromString(value);
          toolVariables.forEach(variable => allVariables.add(variable));
        }
      });
    }
  });
  
  return Array.from(allVariables);
}

/**
 * Check if instructions contain any variables
 */
export function hasVariables(instructions: string[] | null): boolean {
  return extractVariables(instructions).length > 0;
}

/**
 * Validate that all variables in instructions have values
 */
export function validateVariables(
  instructions: string[] | null,
  variables: Record<string, string>
): { isValid: boolean; missingVariables: string[] } {
  const requiredVariables = extractVariables(instructions);
  const missingVariables = requiredVariables.filter(variable => 
    !variables[variable] || variables[variable].trim() === ''
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}