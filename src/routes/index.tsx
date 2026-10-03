import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { client } from "#/orpc/client";

export const Route = createFileRoute("/")({ component: App });

const initialText =
  "山路を登りながら、こう考えた。\n智に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。とかくに人の世は住みにくい。\n住みにくさが高じると、安い所へ引き越したくなる。どこへ越しても住みにくいと悟った時、詩が生れて、画が出来る。\n人の世を作ったものは神でもなければ鬼でもない。やはり向う三軒両隣りにちらちらするただの人である。ただの人が作った人の世が住みにくいからとて、越す国はあるまい。あれば人でなしの国へ行くばかりだ。人でなしの国は人の世よりもなお住みにくかろう。\n越す事のならぬ世が住みにくければ、住みにくい所をどれほどか、寛容て、束の間の命を、束の間でも住みよくせねばならぬ。ここに詩人という天職が出来て、ここに画家という使命が降る。あらゆる芸術の士は人の世を長閑にし、人の心を豊かにするが故に尊とい。\n住みにくき世から、住みにくき煩いを引き抜いて、ありがたい世界をまのあたりに写すのが詩である、画である。あるは音楽と彫刻である。こまかに云えば写さないでもよい。ただまのあたりに見れば、そこに詩も生き、歌も湧く。着想を紙に落さぬとも鏘の音は胸裏に起る。丹青は画架に向って塗抹せんでも五彩の絢爛は自から心眼に映る。";

function splitSentences(text: string) {
  return text
    .split(/(?<=[。.．])/u)
    .filter(Boolean)
    .map((sentence, index) => {
      return {
        id: `s${index}`,
        text: sentence,
        score: null,
      };
    });
}

function colorSentence(element: HTMLDivElement | null, score: number | null) {
  if (element && score !== null) {
    element.style.backgroundColor = `var(--color-blue-${[50, 100, 200][score]})`;
  }
}

interface Sentence {
  id: string;
  text: string;
  score: number | null;
}

function App() {
  const [sentences, setSentences] = useState<Sentence[]>(() =>
    splitSentences(initialText),
  );
  const [textContent, setTextContent] = useState<string>(initialText);

  useEffect(() => {
    if (textContent.trim() === "") {
      setSentences([]);
      return;
    }
    const splitted = splitSentences(textContent);
    (async () => {
      setSentences(await client.evalSentences({ sentences: splitted }));
    })();
  }, [textContent]);

  return (
    <main className="mx-auto w-190 flex flex-col pt-20 min-h-screen">
      <div className="relative rounded-t-2xl bg-white shadow-2xl/3 grow text-lg leading-8">
        <div
          aria-hidden="true"
          className="pointer-events-none whitespace-pre-wrap wrap-break-word text-transparent p-16 pt-10"
        >
          {sentences.map((sentence) => (
            <div
              key={sentence.id}
              ref={(e) => colorSentence(e, sentence.score)}
              className="inline box-decoration-clone rounded-sm py-px shadow-[inset_1px_0_white,inset_-1px_0_white] first:shadow-[inset_-1px_0_white] last:shadow-[inset_1px_0_white] only:shadow-none"
            >
              {sentence.text}
            </div>
          ))}
          {"\n"}
        </div>
        <textarea
          aria-label="本文"
          value={textContent}
          onChange={(event) => setTextContent(event.target.value)}
          className="absolute inset-0 w-full h-full resize-none overflow-hidden whitespace-pre-wrap wrap-break-word bg-transparent focus:outline-none p-16 pt-10"
        />
      </div>
    </main>
  );
}
