/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardBody } from '../../../components/card/card-body';
import { SyntaxHighlighter } from '../../../components/syntax-highlighter';
import { configureMarked } from '../../../helper/marked';

describe('CardBody reference highlights', () => {
  beforeAll(() => {
    configureMarked();
  });

  const marks = (body: CardBody): HTMLElement[] => Array.from(body.render.querySelectorAll('mark'));

  it('wraps the reference range of a code block in a mark', () => {
    const code = 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\nconst f = 6;';
    const body = `\`\`\`js\n${code}\n\`\`\`\n\nSome text after the code block so the range is not at the end of the body.`;
    const start = body.indexOf('const b');
    const cardBody = new CardBody({
      body,
      highlightRangeWithTooltip: [ { information: 'ref', recommendationContentSpan: { start, end: start + 'const b = 2;'.length } } ]
    });

    const found = marks(cardBody);
    expect(found).toHaveLength(1);
    expect(found[0].hasAttribute('reference-tracker')).toBe(true);
    expect(found[0].getAttribute('marker-index')).toBe('0');
    expect(found[0].hasAttribute('marker-key')).toBe(false);
    expect(found[0].textContent).toBe('const b = 2;');
  });

  it.each([
    [ 'ends the message', '' ],
    [ 'is followed by a short sentence', '\n\nDone.' ],
  ])('highlights a reference on the last code line when the code block %s', (_, after) => {
    const body = `\`\`\`js\nconst a = 1;\nconst b = 2;\n\`\`\`${after}`;
    const start = body.indexOf('const b');
    const cardBody = new CardBody({
      body,
      highlightRangeWithTooltip: [ { information: 'ref', recommendationContentSpan: { start, end: start + 'const b = 2;'.length } } ]
    });

    const found = marks(cardBody);
    expect(found).toHaveLength(1);
    expect(found[0].textContent).toBe('const b = 2;');
    expect(cardBody.render.textContent).not.toContain('marker-key');
  });

  it('highlights each of several references in one code block', () => {
    const body = '```js\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```';
    const span = (text: string): { start: number; end: number } => {
      const start = body.indexOf(text);
      return { start, end: start + text.length };
    };
    const cardBody = new CardBody({
      body,
      highlightRangeWithTooltip: [
        { information: 'ref a', recommendationContentSpan: span('const a = 1;') },
        { information: 'ref c', recommendationContentSpan: span('const c = 3;') },
      ]
    });

    expect(marks(cardBody).map(mark => [ mark.getAttribute('marker-index'), mark.textContent ])).toEqual([
      [ '0', 'const a = 1;' ],
      [ '1', 'const c = 3;' ],
    ]);
  });

  it.each([
    [ 'inline code', '`<mark onmouseover=alert(1) reference-tracker>x</mark>`' ],
    [ 'a code block', '```\n<mark onmouseover=alert(1) reference-tracker>x</mark>\n```' ],
    [ 'a forged marker', '`<mark marker-index=0 reference-tracker>x</mark>`' ],
  ])('keeps mark markup written in %s as text', (_, body) => {
    const cardBody = new CardBody({ body });

    expect(marks(cardBody)).toHaveLength(0);
    expect(cardBody.render.querySelector('[onmouseover]')).toBeNull();
    expect(cardBody.render.querySelector('code')?.textContent).toContain('<mark');
  });

  it('does not turn mark markup into elements when real references are present', () => {
    const body = '```\nok\n<mark onmouseover=alert(1) reference-tracker>x</mark>\n```\n\nSome text after the code block so the range is not at the end of the body.';
    const start = body.indexOf('ok');
    const cardBody = new CardBody({
      body,
      highlightRangeWithTooltip: [ { information: 'ref', recommendationContentSpan: { start, end: start + 2 } } ]
    });

    const found = marks(cardBody);
    expect(found).toHaveLength(1);
    expect(found[0].textContent).toBe('ok');
    expect(cardBody.render.querySelector('[onmouseover]')).toBeNull();
    expect(cardBody.render.querySelector('code')?.textContent).toContain('<mark onmouseover=alert(1) reference-tracker>x</mark>');
  });
});

describe('SyntaxHighlighter without a reference marker key', () => {
  it('keeps mark markup in the code as text', () => {
    const code = '<mark marker-index=0 reference-tracker>x</mark>';
    const highlighter = new SyntaxHighlighter({ codeStringWithMarkup: code, block: true });

    expect(highlighter.render.querySelector('mark')).toBeNull();
    expect(highlighter.render.querySelector('code')?.textContent).toBe(code);
  });
});
