import { createFileRoute } from "@tanstack/react-router";
import type { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  getEvaluationState,
  SentenceHighlights,
  setEvaluations,
} from "#/editor/sentence-highlights";
import { client } from "#/orpc/client";

export const Route = createFileRoute("/")({ component: App });

const initialText =
  "山路を登りながら、こう考えた。\n智に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。とかくに人の世は住みにくい。\n住みにくさが高じると、安い所へ引き越したくなる。どこへ越しても住みにくいと悟った時、詩が生れて、画が出来る。\n人の世を作ったものは神でもなければ鬼でもない。やはり向う三軒両隣りにちらちらするただの人である。ただの人が作った人の世が住みにくいからとて、越す国はあるまい。あれば人でなしの国へ行くばかりだ。人でなしの国は人の世よりもなお住みにくかろう。\n越す事のならぬ世が住みにくければ、住みにくい所をどれほどか、寛容て、束の間の命を、束の間でも住みよくせねばならぬ。ここに詩人という天職が出来て、ここに画家という使命が降る。あらゆる芸術の士は人の世を長閑にし、人の心を豊かにするが故に尊とい。\n住みにくき世から、住みにくき煩いを引き抜いて、ありがたい世界をまのあたりに写すのが詩である、画である。あるは音楽と彫刻である。こまかに云えば写さないでもよい。ただまのあたりに見れば、そこに詩も生き、歌も湧く。着想を紙に落さぬとも鏘の音は胸裏に起る。丹青は画架に向って塗抹せんでも五彩の絢爛は自から心眼に映る。";

async function sendEvaluation(editor: Editor) {
  const { sentences } = getEvaluationState(editor);
  const targetIds = sentences
    .filter(({ evaluatedText, text }) => evaluatedText !== text)
    .map(({ id }) => id);
  if (targetIds.length === 0) return;

  const texts = sentences.map(({ id, text }) => ({ id, text }));
  const evaluated = await client.evalSentences({ sentences: texts, targetIds });
  if (editor.isDestroyed) return;

  setEvaluations(editor, evaluated);
}

function App() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      UndoRedo,
      SentenceHighlights,
    ],
    content: {
      type: "doc",
      content: initialText.split("\n").map((text) => ({
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      })),
    },
    editorProps: {
      attributes: {
        "aria-label": "本文",
        "aria-multiline": "true",
        role: "textbox",
        class:
          "min-h-[calc(100dvh-2.5rem)] whitespace-pre-wrap wrap-break-word p-6 pt-8 focus:outline-none sm:min-h-[calc(100dvh-5rem)] sm:p-16 sm:pt-10",
      },
    },
    onCreate({ editor }) {
      void sendEvaluation(editor);
    },
    onUpdate({ editor }) {
      console.log(getEvaluationState(editor).changed);
      void sendEvaluation(editor);
    },
  });

  return (
    <main className="flex min-h-dvh flex-col px-4 pt-10 sm:px-6 sm:pt-20">
      <EditorContent
        editor={editor}
        className="mx-auto w-full max-w-190 rounded-t-2xl bg-white shadow-2xl/3 grow text-lg leading-[28.5px]"
      />
    </main>
  );
}
