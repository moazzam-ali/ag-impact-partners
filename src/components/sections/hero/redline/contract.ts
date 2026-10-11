/*
  The Redline contract, as written in messages (heroStudies.redline.contract). Article bodies carry two
  inline marks, read with t.raw so ICU never sees them:
    <k>word</k>          a word the pen leaves standing; in reading order, the kept words are the
                         headline (one per headline word, FR 5, EN 7)
    <e>before|after</e>  an edit: "before" is struck, "after" is written in above it
*/
export type ContractMessages = {
  title: string;
  draft: string;
  articles: { title: string; body: string }[];
  closing: string;
  signatories: string[];
};

export type Token =
  | { kind: "text"; text: string }
  | { kind: "keep"; text: string }
  | { kind: "edit"; before: string; after: string; index: number };

export type Article = { title: string; tokens: Token[] };

export type Edit = { index: number; article: number; after: string };

const MARKS = /<k>(.*?)<\/k>|<e>(.*?)\|(.*?)<\/e>/g;

export function parseContract(articles: ContractMessages["articles"]) {
  const edits: Edit[] = [];

  const parsed: Article[] = articles.map(({ title, body }, article) => {
    const tokens: Token[] = [];
    let last = 0;
    for (const m of body.matchAll(MARKS)) {
      if (m.index > last) tokens.push({ kind: "text", text: body.slice(last, m.index) });
      if (m[1] !== undefined) {
        tokens.push({ kind: "keep", text: m[1] });
      } else {
        const edit = { index: edits.length, article, after: m[3] ?? "" };
        edits.push(edit);
        tokens.push({ kind: "edit", before: m[2] ?? "", after: edit.after, index: edit.index });
      }
      last = m.index + m[0].length;
    }
    if (last < body.length) tokens.push({ kind: "text", text: body.slice(last) });
    return { title, tokens };
  });

  return { articles: parsed, edits };
}
