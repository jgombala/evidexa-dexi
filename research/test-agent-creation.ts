// Test actual Agent creation and capabilities
import { Agent, tool, run, handoff } from '@openai/agents';
import { generateText } from 'ai';

console.log('=== Testing Agent Creation ===');

// Create a simple agent with proper parameters
try {
  const guideAgent = new Agent({
    name: 'guide-agent',
    model: 'gpt-4o',
    instructions: 'You are a helpful guide agent for Evidexa Nexus Console.',
    tools: [
      tool({
        name: 'search_docs',
        description: 'Search documentation for help topics',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        },
        execute: async ({ query }) => {
          return `Found documentation for: ${query}`;
        }
      })
    ]
  });

  console.log('Guide Agent created successfully!');
  console.log('Agent name:', guideAgent.name);
  console.log('Agent methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(guideAgent)));

  // Test running the agent
  console.log('\n=== Testing Agent Execution ===');
  
  // This might require API key, so let's just test the structure
  console.log('Agent tools:', guideAgent.getAllTools());
  
} catch (error) {
  console.log('Error:', error.message);
}

// Check what the run function provides
console.log('\n=== Run Function Capabilities ===');
console.log('Run function:', run.toString().slice(0, 200));

// Check handoff capabilities
console.log('\n=== Handoff Capabilities ===');
console.log('Handoff function:', handoff.toString().slice(0, 200));

export {};