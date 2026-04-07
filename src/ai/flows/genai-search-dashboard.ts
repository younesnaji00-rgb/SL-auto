'use server';
/**
 * @fileOverview A GenAI flow for intelligent global search within the admin dashboard.
 *
 * - searchDashboard - A function that interprets natural language queries for dashboard navigation and data retrieval.
 * - GenAISearchDashboardInput - The input type for the searchDashboard function.
 * - GenAISearchDashboardOutput - The return type for the searchDashboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenAISearchDashboardInputSchema = z.object({
  query: z.string().describe('The natural language query from the user.'),
});
export type GenAISearchDashboardInput = z.infer<typeof GenAISearchDashboardInputSchema>;

const GenAISearchDashboardOutputSchema = z.object({
  suggestedAction: z.string().describe(
    'A natural language suggestion or instruction based on the query. ' +
    'This could be a navigation suggestion (e.g., "Navigate to the Users section") ' +
    'or a summary of what would be searched (e.g., "Searching for recent invoices across all companies").'
  ),
});
export type GenAISearchDashboardOutput = z.infer<typeof GenAISearchDashboardOutputSchema>;

export async function searchDashboard(input: GenAISearchDashboardInput): Promise<GenAISearchDashboardOutput> {
  return genAISearchDashboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'genAISearchDashboardPrompt',
  input: {schema: GenAISearchDashboardInputSchema},
  output: {schema: GenAISearchDashboardOutputSchema},
  prompt: `You are an intelligent assistant for an admin dashboard called DashFlow Admin.
Your goal is to interpret natural language queries from an administrator and suggest the most relevant action or information within the dashboard.
The dashboard has the following main sections:
- "Tableau de bord" (Dashboard): For an overview of metrics and general status.
- "Dossiers" (Folders): For managing documents, projects, or organized data.
- "Utilisateurs" (Users): For managing user accounts, permissions, and profiles.
- "Compagnies" (Companies): For managing client companies.
  - Specific companies include: Allianz, RMA, Sanlam, Wafa, ATLANTA, CP, Fès RMA, Fès ATLANTASANAD, Fès Sanlam.

Based on the user's query, provide a clear, concise natural language suggestion for the most relevant action.
If the query clearly points to a specific section or company, suggest navigating there.
If the query implies a search for data, describe what would be searched.

Here are some examples:
User Query: "Show me all active users"
Suggested Action: "Navigate to the Users section to view and manage active users."

User Query: "Where can I find reports for Sanlam?"
Suggested Action: "Navigate to the Companies section, then select Sanlam to view its specific reports."

User Query: "Dashboard overview"
Suggested Action: "Navigate to the Tableau de bord section for a general overview."

User Query: "Help me find invoices"
Suggested Action: "Searching for invoices across all accessible sections. Consider refining your query for specific companies or date ranges."

User Query: "I need to add a new client"
Suggested Action: "Navigate to the Companies section to add a new client."

User Query: "What's the status of ATLANTA's accounts?"
Suggested Action: "Navigate to the Companies section, then select ATLANTA to review its account status."

Now, interpret the following query:

User Query: "{{{query}}}"
Suggested Action:`,
});

const genAISearchDashboardFlow = ai.defineFlow(
  {
    name: 'genAISearchDashboardFlow',
    inputSchema: GenAISearchDashboardInputSchema,
    outputSchema: GenAISearchDashboardOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);