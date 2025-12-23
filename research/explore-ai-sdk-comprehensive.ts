// Comprehensive AI SDK exploration
import { 
  generateText, 
  streamText, 
  generateObject,
  streamObject,
  tool,
  Experimental_Agent,
  embed,
  embedMany,
  createOpenAI,
  openai,
  anthropic,
  google
} from 'ai';

console.log('=== AI SDK Core Features ===');

// Check providers
console.log('OpenAI provider:', typeof openai);
console.log('Anthropic provider:', typeof anthropic);  
console.log('Google provider:', typeof google);

// Test multi-modal capabilities
console.log('\n=== Multi-Modal & Advanced Features ===');
console.log('generateObject available:', typeof generateObject);
console.log('streamObject available:', typeof streamObject);
console.log('embed available:', typeof embed);
console.log('embedMany available:', typeof embedMany);

// Check the Experimental_Agent capabilities
console.log('\n=== Experimental Agent ===');
console.log('Agent class methods:', Object.getOwnPropertyNames(Experimental_Agent.prototype));

// Try to create an AI SDK agent
try {
  const aiAgent = new Experimental_Agent({
    name: 'test-ai-agent',
    model: openai('gpt-4o'),
    instructions: 'You are a test agent using AI SDK',
    tools: {
      searchDocs: tool({
        description: 'Search documentation',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        },
        execute: async ({ query }) => `Found docs for: ${query}`
      })
    }
  });
  
  console.log('AI SDK Agent created:', aiAgent.name);
  console.log('AI SDK Agent model:', aiAgent.model);
} catch (error) {
  console.log('AI SDK Agent error:', error.message);
}

// Check streaming capabilities
console.log('\n=== Streaming Features ===');
console.log('Available streaming types:');
console.log('- streamText for text generation');
console.log('- streamObject for structured output');

// Check tool system
console.log('\n=== Tool System ===');
const exampleTool = tool({
  description: 'Example multi-LLM tool',
  parameters: {
    type: 'object',
    properties: {
      task: { type: 'string', enum: ['summarize', 'generate', 'search'] },
      content: { type: 'string' }
    }
  },
  execute: async ({ task, content }) => {
    // This could route to different LLMs based on task
    switch (task) {
      case 'summarize':
        return `[Claude would summarize]: ${content}`;
      case 'generate':
        return `[Gemini would generate]: ${content}`;
      case 'search':
        return `[Perplexity would search]: ${content}`;
      default:
        return `[GPT-4o default]: ${content}`;
    }
  }
});

console.log('Multi-LLM tool created:', exampleTool.description);

export {};