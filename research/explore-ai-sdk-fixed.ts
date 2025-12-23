// Explore AI SDK capabilities - fixed imports
import { generateText, streamText, tool as aiTool, Experimental_Agent } from 'ai';

console.log('=== AI SDK Capabilities ===');

// Check the Experimental_Agent
console.log('Experimental_Agent:', Experimental_Agent);

// Test basic AI SDK functionality
console.log('\n=== AI SDK Tools ===');
const testTool = aiTool({
  description: 'Test tool for AI SDK',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    }
  },
  execute: async ({ query }) => `AI SDK result: ${query}`
});

console.log('AI SDK tool created:', testTool);

// Check streaming capabilities
console.log('\n=== AI SDK Streaming ===');
console.log('streamText function available');
console.log('generateText function available');

// Let's also check what providers are available
console.log('\n=== Available AI SDK Features ===');
import * as ai from 'ai';
console.log('AI SDK exports (first 20):', Object.keys(ai).slice(0, 20));

export {};