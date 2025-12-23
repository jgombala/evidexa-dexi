// Check what providers are actually available
import * as ai from 'ai';

console.log('=== All AI SDK Exports ===');
const exports = Object.keys(ai);
console.log('Total exports:', exports.length);

// Look for provider-related exports
const providerExports = exports.filter(exp => 
  exp.toLowerCase().includes('openai') || 
  exp.toLowerCase().includes('anthropic') || 
  exp.toLowerCase().includes('google') ||
  exp.toLowerCase().includes('provider')
);

console.log('\n=== Provider-related exports ===');
providerExports.forEach(exp => {
  console.log(`${exp}:`, typeof ai[exp as keyof typeof ai]);
});

// Look for create functions
const createExports = exports.filter(exp => exp.startsWith('create'));
console.log('\n=== Create functions ===');
createExports.forEach(exp => {
  console.log(`${exp}:`, typeof ai[exp as keyof typeof ai]);
});

// Check experimental features
const experimentalExports = exports.filter(exp => exp.includes('experimental') || exp.includes('Experimental'));
console.log('\n=== Experimental features ===');
experimentalExports.forEach(exp => {
  console.log(`${exp}:`, typeof ai[exp as keyof typeof ai]);
});

export {};