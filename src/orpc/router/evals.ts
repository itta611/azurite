import { os } from "@orpc/server";
import { score, TypeSafeClient } from "@typesafe-ai/sdk";
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
    const questions = Object.fromEntries(
      targets.map((sentence) => [
        sentence.id,
        score(
          `
    文章全体の文脈を考慮して、
    id="${sentence.id}" の文が読者に新しく与える情報量を評価してください。
    単純な文字数ではなく、新しく提示される事実・概念・関係・条件の量を評価してください。
    `,
          ["情報量が少ない", "普通", "情報量が多い"],
        ),
      ]),
    );
    const response = await jev.systemOne({
      model: "jev-latest",
      state: sentences,
      questions,
    });
    return targets.map((sentence) => ({
      id: sentence.id,
      text: sentence.text,
      score: Math.round(response.answers[sentence.id].score),
    }));
  });
