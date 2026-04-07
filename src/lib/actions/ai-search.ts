'use server';

import { searchDashboard } from '@/ai/flows/genai-search-dashboard';

export async function getAiSuggestion(query: string) {
  try {
    if (!query) {
      return { suggestion: null, error: null };
    }
    const result = await searchDashboard({ query });
    return { suggestion: result.suggestedAction, error: null };
  } catch (error) {
    console.error('Error getting AI suggestion:', error);
    return { suggestion: null, error: 'Failed to get suggestion from AI.' };
  }
}
