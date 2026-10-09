import { os } from "@orpc/server";
import { type ScoreQuestion, score, TypeSafeClient } from "@typesafe-ai/sdk";
import * as z from "zod";

export const evalSentences = os
  .input(
    z.object({
      sentences: z.array(z.object({ id: z.string(), text: z.string() })),
      targetIds: z.array(z.string()),
    }),
  )
  .handler(async ({ input: { sentences, targetIds } }) => {
    const targets = sentences.filter(
      ({ id }) => targetIds.length === 0 || targetIds.includes(id),
    );
    if (targets.length === 0) return [];

    const jev = new TypeSafeClient({ apiKey: process.env.JEV_API_KEY });
    const questions = Object.fromEntries<ScoreQuestion>(
      targets.flatMap(({ id }) => [
        [
          `interpretability:${id}`,
          score(
            `文章全体の文脈を考慮し、id="${id}" の文の解釈のしやすさを評価してください。一読して意味を理解できるか、構文の複雑さ、指示対象の曖昧さ、関係の読み取りに必要な認知負荷を考慮してください。文字数や情報量だけで判断しないでください。`,
            ["解釈が難しく、認知負荷が高い", "解釈しやすく、認知負荷が低い"],
          ),
        ] as const,
        [
          `information:${id}`,
          score(
            `文章全体の文脈を考慮し、id="${id}" の文が読者に新しく与える情報量を評価してください。単純な文字数ではなく、新しく提示される事実・概念・関係・条件の量を評価してください。同じ情報の繰り返しは新しい情報として数えないでください。`,
            ["情報量が少ない", "情報量が多い"],
          ),
        ] as const,
      ]),
    );
    const response = await jev.systemOne({
      model: "jev-latest",
      state: sentences,
      questions,
    });
    return targets.map((sentence) => ({
      ...sentence,
      interpretability:
        response.answers[`interpretability:${sentence.id}`].score,
      information: response.answers[`information:${sentence.id}`].score,
    }));
  });
