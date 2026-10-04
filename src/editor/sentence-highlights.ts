import { type Editor, Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface Sentence {
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

const highlightsKey = new PluginKey<DecorationSet>("sentenceHighlights");

export function setSentenceHighlights(
  editor: Editor,
  sentences: (Sentence & { score: number })[],
) {
  const decorations = sentences.map(({ id, from, to, score }) =>
    Decoration.inline(from, to, {
      "data-sentence-id": id,
      "data-score": String(score),
      class: "box-decoration-clone rounded-sm py-px mr-[3px] last:mr-0",
      style: `background-color: var(--color-blue-${[50, 100, 200][score]})`,
    }),
  );
  editor.view.dispatch(
    editor.state.tr.setMeta(
      highlightsKey,
      DecorationSet.create(editor.state.doc, decorations),
    ),
  );
}

export const SentenceHighlights = Extension.create({
  name: "sentenceHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: highlightsKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            const highlights: DecorationSet | undefined =
              transaction.getMeta(highlightsKey);
            return (
              highlights ??
              decorations.map(transaction.mapping, transaction.doc)
            );
          },
        },
        props: {
          decorations(state) {
            return highlightsKey.getState(state);
          },
        },
      }),
    ];
  },
});
