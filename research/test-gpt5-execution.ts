// Test GPT-5 execution and reasoning capabilities
import { Agent, tool, run } from '@openai/agents';

console.log('=== GPT-5 Execution Test ===');

// Create GPT-5 agent with reasoning-focused tools
const gpt5Agent = new Agent({
  name: 'gpt5-reasoning-agent',
  model: 'gpt-5',
  instructions: `You are a GPT-5 powered agent with advanced reasoning capabilities. 
  You help users with complex multi-step tasks by breaking them down and using available tools.
  Always explain your reasoning process.`,
  tools: [
    tool({
      name: 'analyze_workflow',
      description: 'Analyze a complex workflow and break it into steps',
      parameters: {
        type: 'object',
        properties: {
          workflow: { type: 'string', description: 'Description of the workflow to analyze' },
          context: { type: 'string', description: 'Additional context about the workflow' }
        },
        required: ['workflow']
      },
      execute: async ({ workflow, context }) => {
        console.log(`Analyzing workflow: ${workflow}`);
        return {
          steps: [
            'Step 1: Understand requirements',
            'Step 2: Plan approach', 
            'Step 3: Execute plan',
            'Step 4: Validate results'
          ],
          complexity: 'medium',
          estimatedTime: '30 minutes',
          context: context || 'No additional context provided'
        };
      }
    }),
    tool({
      name: 'search_knowledge',
      description: 'Search knowledge base for relevant information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          domain: { type: 'string', description: 'Knowledge domain to search' }
        },
        required: ['query']
      },
      execute: async ({ query, domain }) => {
        console.log(`Searching knowledge: ${query} in domain: ${domain || 'general'}`);
        return {
          results: [
            `Knowledge result 1 for: ${query}`,
            `Knowledge result 2 for: ${query}`,
            `Knowledge result 3 for: ${query}`
          ],
          confidence: 0.85,
          domain: domain || 'general'
        };
      }
    })
  ]
});

console.log('GPT-5 reasoning agent created');
console.log('Model:', gpt5Agent.model);

// Test the agent's reasoning capabilities
console.log('\n=== Testing GPT-5 Reasoning ===');

// Check if we can see the system prompt
gpt5Agent.getSystemPrompt().then(prompt => {
  console.log('System prompt loaded:', prompt.slice(0, 100) + '...');
}).catch(err => {
  console.log('Error getting system prompt:', err.message);
});

// Check available tools
gpt5Agent.getAllTools().then(tools => {
  console.log('Available tools:', tools.map(t => ({ name: t.name, description: t.description })));
}).catch(err => {
  console.log('Error getting tools:', err.message);
});

// Test if we can convert agent to tool (for multi-agent scenarios)
console.log('\n=== Multi-Agent Capabilities ===');
try {
  const agentAsTool = gpt5Agent.asTool();
  console.log('Agent can be used as tool:', !!agentAsTool);
  console.log('Tool name:', agentAsTool.name);
} catch (error) {
  console.log('Error converting agent to tool:', error.message);
}

export {};