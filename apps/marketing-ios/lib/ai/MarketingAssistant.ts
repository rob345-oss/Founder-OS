/**
 * Future AI Marketing Assistant (Phase 8) — interface only.
 * No network calls to paid APIs in this build.
 */
export interface AssistantInsight {
  id: string;
  title: string;
  body: string;
  basedOn: string[];
}

export interface MarketingAssistant {
  summarizeWeeklyPerformance(workspaceId: string): Promise<AssistantInsight[]>;
  suggestContentIdeas(workspaceId: string): Promise<AssistantInsight[]>;
}

export const assistantStub: MarketingAssistant = {
  async summarizeWeeklyPerformance() {
    return [
      {
        id: 'stub-1',
        title: 'Assistant offline',
        body: 'Connect metrics and complete weekly reviews; a future AI assistant will summarize from this local data.',
        basedOn: ['roadmap'],
      },
    ];
  },
  async suggestContentIdeas() {
    return [
      {
        id: 'stub-2',
        title: 'Ideation placeholder',
        body: 'Use the Content Planner; model-based ideation is not enabled in this local-only prototype.',
        basedOn: ['roadmap'],
      },
    ];
  },
};
