import { diffChars } from "diff";
import type { Sentence } from "./sentence-highlights";

export type EvaluatedSentence = Sentence & {
  score?: number;
  evaluatedText?: string;
};

export function reconcileSentences(
  before: EvaluatedSentence[],
  after: Sentence[],
) {
  const changes = diffChars(
    before.map(({ text }) => text).join(""),
    after.map(({ text }) => text).join(""),
  );
  const beforeOwners = before.flatMap((sentence, index) =>
    Array<number>(sentence.text.length).fill(index),
  );
  const afterOwners: (number | undefined)[] = [];
  let beforeOffset = 0;
  let editOffset: number | undefined;
  let mergedOwner: number | undefined;

  for (const change of changes) {
    if (change.removed) {
      editOffset ??= beforeOffset;
      if (/^[。.．]+$/u.test(change.value)) {
        mergedOwner ??= beforeOwners[beforeOffset];
      }
      beforeOffset += change.value.length;
    } else if (change.added) {
      const owner =
        editOffset !== undefined
          ? beforeOwners[editOffset]
          : /^[。.．]+$/u.test(change.value)
            ? beforeOwners[beforeOffset]
            : undefined;
      for (let index = 0; index < change.value.length; index++) {
        afterOwners.push(owner);
      }
    } else {
      for (let index = 0; index < change.value.length; index++) {
        afterOwners.push(mergedOwner ?? beforeOwners[beforeOffset]);
        beforeOffset++;
        mergedOwner = undefined;
      }
      editOffset = undefined;
    }
  }

  const sentences: EvaluatedSentence[] = [];
  const changed: Sentence[] = [];
  const used = new Set<number>();
  let afterOffset = 0;

  for (const sentence of after) {
    const owners = afterOwners.slice(
      afterOffset,
      afterOffset + sentence.text.length,
    );
    afterOffset += sentence.text.length;
    const owner = owners.find((index) => index !== undefined);
    const original = owner === undefined ? undefined : before[owner];
    const previous =
      owner === undefined || used.has(owner) ? undefined : original;
    const next = {
      ...sentence,
      id: previous?.id ?? crypto.randomUUID(),
      score: original?.score,
      evaluatedText: previous?.evaluatedText,
    };
    sentences.push(next);
    if (previous?.text !== sentence.text) changed.push(next);
    for (const index of owners) {
      if (index !== undefined) used.add(index);
    }
  }
  return { sentences, changed };
}
