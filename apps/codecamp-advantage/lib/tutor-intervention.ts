import type { AIGenerationProvenance, AIClientWithProvenance } from "@reading-advantage/ai";
import {
  generateTutorIntervention,
  type TutorContext,
} from "@reading-advantage/domain/codecamp";

/**
 * Generates a Codecamp intervention through the public AI adapter and keeps provider metadata separate from learner text.
 * @param input Authorized activity context, learner message, model policy, and provenance-capable adapter.
 * @returns A validated intervention or a safe fallback with adapter provenance.
 */
export async function generateCodecampTutorIntervention(input: {
  context: TutorContext;
  learnerMessage: string;
  modelAlias: string;
  client: Pick<AIClientWithProvenance, "generateObjectWithProvenance">;
}) {
  const adapterProvenance: { current: AIGenerationProvenance | null } = { current: null };

  const result = await generateTutorIntervention({
    context: input.context,
    learnerMessage: input.learnerMessage,
    generate: async ({ prompt, schema }) => {
      const result = await input.client.generateObjectWithProvenance({
        prompt,
        schema,
        model: input.modelAlias,
        temperature: 0.2,
        maxTokens: 800,
      });
      adapterProvenance.current = result.provenance;
      return result.object;
    },
    provenance: {
      modelAlias: input.modelAlias,
      resolvedModel: input.modelAlias,
    },
  });

  return {
    ...result,
    provenance: {
      ...result.provenance,
      resolvedModel: adapterProvenance.current?.resolvedModel ?? input.modelAlias,
      provider: adapterProvenance.current?.provider ?? null,
      providerRequestId: adapterProvenance.current?.requestId ?? null,
      responseId: adapterProvenance.current?.responseId ?? null,
      latencyMs: adapterProvenance.current?.latencyMs ?? null,
    },
  };
}
