import { type Editor, Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  type EvaluatedSentence,
  reconcileSentences,
} from "./sentence-evaluations";

export interface Sentence {
  id: string;
  text: string;
  from: number;
  to: number;
}

export function getSentences(doc: Node) {
  const sentences: Sentence[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return;

    const text = node.textBetween(0, node.content.size, "", "\n");
    let from = position + 1;
    for (const sentence of text.split(/(?<=[。.．])/u)) {
      const to = from + sentence.length;
      if (sentence.trim()) {
        sentences.push({
          id: `s${sentences.length}`,
          text: sentence,
          from,
          to,
        });
      }
      from = to;
    }
    return false;
  });
  return sentences;
}

type SentenceEvaluation = Pick<Sentence, "id" | "text"> & { score: number };

interface SentenceState {
  sentences: EvaluatedSentence[];
  changed: Sentence[];
  decorations: DecorationSet;
}

const highlightsKey = new PluginKey<SentenceState>("sentenceHighlights");

function createHighlights(doc: Node, sentences: EvaluatedSentence[]) {
  const decorations = sentences.flatMap(({ id, from, to, score }) =>
    score === undefined
      ? []
      : [
          Decoration.inline(from, to, {
            "data-sentence-id": id,
            "data-score": String(score),
            class: "box-decoration-clone rounded-sm py-px mr-[3.5px] last:mr-0",
            style: `background-color: var(--color-blue-${[50, 100, 200][score]})`,
          }),
        ],
  );
  return DecorationSet.create(doc, decorations);
}

export function getSentenceState(editor: Editor) {
  return highlightsKey.getState(editor.state) as SentenceState;
}

export function setSentenceEvaluations(
  editor: Editor,
  evaluations: SentenceEvaluation[],
) {
  editor.view.dispatch(editor.state.tr.setMeta(highlightsKey, evaluations));
}

export const SentenceHighlights = Extension.create({
  name: "sentenceHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin<SentenceState>({
        key: highlightsKey,
        state: {
          init(_, state) {
            return {
              ...reconcileSentences([], getSentences(state.doc)),
              decorations: DecorationSet.empty,
            };
          },
          apply(transaction, previous) {
            const evaluations: SentenceEvaluation[] | undefined =
              transaction.getMeta(highlightsKey);
            if (!transaction.docChanged && !evaluations) return previous;

            let { sentences, changed } = transaction.docChanged
              ? reconcileSentences(
                  previous.sentences,
                  getSentences(transaction.doc),
                )
              : previous;

            if (evaluations) {
              const byId = new Map(
                evaluations.map((sentence) => [sentence.id, sentence]),
              );
              sentences = sentences.map((sentence) => {
                const evaluation = byId.get(sentence.id);
                return evaluation?.text === sentence.text
                  ? {
                      ...sentence,
                      score: evaluation.score,
                      evaluatedText: evaluation.text,
                    }
                  : sentence;
              });
            }

            return {
              sentences,
              changed,
              decorations: createHighlights(transaction.doc, sentences),
            };
          },
        },
        props: {
          decorations(state) {
            return highlightsKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});
