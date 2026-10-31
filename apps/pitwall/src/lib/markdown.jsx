// A tiny Markdown subset rendered as React elements (never innerHTML): paragraphs, - and 1. lists,
// **bold**, `code`, and [links](https://…) limited to http(s).
import { Fragment } from 'react';

function inline(text, key = 0) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={`${key}-${i++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={`${key}-${i++}`}>{t.slice(1, -1)}</code>);
    else {
      const label = t.slice(1, t.indexOf(']'));
      out.push(<a key={`${key}-${i++}`} href={m[2]} target="_blank" rel="noopener noreferrer">{label}</a>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return blocks.map((b, bi) => {
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*[-*] /.test(l))) {
      return <ul key={bi}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*] /, ''), `${bi}-${i}`)}</li>)}</ul>;
    }
    if (lines.every((l) => /^\s*\d+[.)] /.test(l))) {
      return <ol key={bi}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+[.)] /, ''), `${bi}-${i}`)}</li>)}</ol>;
    }
    return <p key={bi}>{lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l, `${bi}-${i}`)}</Fragment>)}</p>;
  });
}
