// Deep exploration of OpenAI Agents API
import * as agents from '@openai/agents';
import * as ai from 'ai';

console.log('=== OpenAI Agents SDK ===');
console.log('Available exports:', Object.keys(agents));

// Check if there are other classes like ToolNode, Workflow, etc.
const { Agent } = agents;

console.log('\n=== Agent Class Details ===');
console.log('Agent constructor:', Agent.constructor.toString().slice(0, 200));

// Try to create a simple agent to see the API
try {
  const agent = new Agent({
    model: 'gpt-4o',
    instructions: 'You are a helpful assistant'
  });
  console.log('Agent created successfully');
  console.log('Agent methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(agent)));
} catch (error) {
  console.log('Error creating agent:', error.message);
}

console.log('\n=== AI SDK ===');
console.log('AI SDK exports:', Object.keys(ai));

// Check for streaming capabilities
console.log('\n=== Looking for streaming/workflow features ===');
console.log('Agents exports:', agents);

export {};