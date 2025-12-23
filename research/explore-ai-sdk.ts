// Explore AI SDK capabilities
import { generateText, streamText, tool as aiTool, Experimental_Agent } from 'ai';
import { openai } from 'ai/openai';

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

// Check OpenAI provider
console.log('\n=== OpenAI Provider ===');
console.log('OpenAI provider:', openai);

export {};