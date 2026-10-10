import { Fragment } from "react";

import { cn } from "@/lib/cn";

/*
  Splits a line into masked words for rise-in reveals. Server-rendered, so there is no layout shift
  and no dependency on SplitText. Animate `.word` inside the element with data-title or a ref.
*/
export function Words({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");

  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="word-mask">
            <span className={cn("word", className)}>{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
