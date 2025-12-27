import { promptManager } from './prompts/promptManager.js';

export async function getActivePrompt(agentId: string) {
  const filePrompt = promptManager.getPrompt(agentId);
  if (filePrompt?.instructions) {
    return filePrompt.instructions;
  }
  throw new Error(`Prompt not found for agent: ${agentId}`);
}

export async function getPromptTemplate(agentId: string) {
  const filePrompt = promptManager.getPrompt(agentId);
  if (filePrompt) {
    return filePrompt;
  }
  throw new Error(`Prompt not found for agent: ${agentId}`);
}
