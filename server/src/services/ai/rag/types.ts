export interface Strategy {
  id: string;
  name: string;
  description: string;
  rules: StrategyRules;
  confirmationTf: string;
}

export interface StrategyRules {
  entry: RuleSet;
  exit: RuleSet;
  indicators: Record<string, number | string>;
  type?: string;
  market_conditions?: string[];
}

export interface RuleSet {
  conditions: string[];
  filters?: string[];
}

export interface RAGEmbedding {
  id: string;
  strategyId: string;
  embedding: number[];
  createdAt: Date;
}

export interface SimilarStrategy {
  strategy: {
    name: string;
    description: string;
    rules: StrategyRules;
    confirmationTf: string;
  };
  similarity: number;
}

export interface EmbeddingResult {
  embedding: number[];
}

export interface PromptEnhancementResult {
  enhancedPrompt: string;
  relevantStrategies: Strategy[];
}

export interface ResponseRefinementResult {
  originalResponse: string;
  refinedResponse: string;
  appliedRules: string[];
}
