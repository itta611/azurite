import { type Editor, Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  type EvaluatedSentence,
  reconcileSentences,
  type Sentence,
} from "./sentence-evaluations";

type SentenceEvaluation = Pick<Sentence, "id" | "text"> & {
  interpretability: number;
  information: number;
};

interface EvaluationState {
  sentences: EvaluatedSentence[];
  changed: Sentence[];
  decorations: DecorationSet;
}

function getSentences(doc: Node) {
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

const highlightsKey = new PluginKey<EvaluationState>("sentenceHighlights");

function createHighlights(doc: Node, sentences: EvaluatedSentence[]) {
  const decorations = sentences.flatMap(
    ({ id, from, to, interpretability, information }) => {
      if (interpretability === undefined || information === undefined)
        return [];
      const hue = 205 + 50 * (1 - interpretability);
      const lightness = 100 - 20 * information;
      return [
        Decoration.inline(from, to, {
          "data-sentence-id": id,
          "data-interpretability": String(interpretability),
          "data-information": String(information),
          class:
            "box-decoration-clone rounded-sm py-px mr-[3.5px] last:mr-0 text-black",
          style: `background-color: hsl(${hue} 100% ${lightness}%)`,
        }),
      ];
    },
  );
  return DecorationSet.create(doc, decorations);
}

export function getEvaluationState(editor: Editor) {
  return highlightsKey.getState(editor.state) as EvaluationState;
}

export function setEvaluations(
  editor: Editor,
  evaluations: SentenceEvaluation[],
) {
  editor.view.dispatch(editor.state.tr.setMeta(highlightsKey, evaluations));
}

export const SentenceHighlights = Extension.create({
  name: "sentenceHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin<EvaluationState>({
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
                      interpretability: evaluation.interpretability,
                      information: evaluation.information,
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
