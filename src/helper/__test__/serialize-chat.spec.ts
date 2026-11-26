import fs from 'fs';
import path from 'path';
import { ChatItemType, MynahUI } from '../../main';
import { ChatItemCard } from '../../components/chat-item/chat-item-card';

// Passes through to the real card by default; individual tests replace the rendered element.
jest.mock('../../components/chat-item/chat-item-card', () => {
  const actual = jest.requireActual('../../components/chat-item/chat-item-card');
  return {
    ...actual,
    ChatItemCard: jest.fn(props => new actual.ChatItemCard(props))
  };
});

const ActualChatItemCard = jest.requireActual('../../components/chat-item/chat-item-card').ChatItemCard;
const mockedChatItemCard = ChatItemCard as unknown as jest.Mock;

const testTabId = 'tab-1';
const expectedPolicy = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
let testMynahUI: MynahUI;

const parseExport = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');

// Serializes a chat whose card renders the given markup as is, as if it had reached the rendered card.
const exportRenderedMarkup = (markup: string): Document => {
  mockedChatItemCard.mockImplementation(() => {
    const render = document.createElement('div');
    render.className = 'mynah-chat-item-card';
    render.innerHTML = markup;
    return { render };
  });
  testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'content' });
  return parseExport(testMynahUI.serializeChat(testTabId, 'html'));
};

const exportedCard = (exported: Document): Element => exported.querySelector('.mynah-chat-items-container > .mynah-chat-item-card') as Element;

// Serializes a chat whose card is built with DOM calls, for content which parsing markup cannot produce.
const exportBuiltCard = (build: (render: HTMLElement) => void): string => {
  testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'content' });
  // Replaced after the chat item is shown, so only the exported card has the content.
  mockedChatItemCard.mockImplementation(() => {
    const render = document.createElement('div');
    render.className = 'mynah-chat-item-card';
    build(render);
    return { render };
  });
  return testMynahUI.serializeChat(testTabId, 'html');
};

const withText = (tagName: string, text: string): HTMLElement => Object.assign(document.createElement(tagName), { textContent: text });

const refreshMeta = '<meta http-equiv="refresh" content="0;url=https://remote.example/">';
const escapedRefreshMeta = refreshMeta.replace(/</g, '&lt;').replace(/>/g, '&gt;');
// The form the browser runs used, inside double quoted attribute values.
const unquotedRefreshMeta = "<meta http-equiv=refresh content='1;url=https://remote.example/'>";
const svgNamespace = 'http://www.w3.org/2000/svg';
const customIconSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJyZWQiLz48L3N2Zz4=';
const legitRichBody = [
  '# Heading one', '## Heading two', 'Some **bold**, *italic*, ~~struck~~ and `inline code` text.',
  '- item one\n- item two\n  - nested', '3. third\n4. fourth', '- [x] done\n- [ ] todo',
  '| a | b |\n|:---|---:|\n| 1 | 2 |', '> a quote',
  '[secure](https://example.com/docs?a=1#top) and [plain](http://example.com/) and [fragment](#heading-one)',
  '```typescript\nconst greet = (name: string): string => `hello` + name;\n// comment\n```',
  '```\nplain block\n```', '---', 'Line one  \nline two with <span style="color: red;">markup</span>.',
].join('\n\n');

// The class holding the generated card id differs per render
const withoutGeneratedId = (value: string): string => value.replace(/typewriter-card-[a-z0-9]+/g, 'typewriter-card-id');

// Elements and attributes of an export, recorded from exports of the example and ui-test chats with the default config and config.test.
const allowedBodyAttributes: Record<string, string[]> = {
  a: [ 'href', 'target' ],
  blockquote: [],
  br: [],
  button: [ 'tabindex', 'title', 'data-testid' ],
  code: [ 'data-highlighted' ],
  del: [],
  div: [ 'messageid', 'style', 'data-testid' ],
  em: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  hr: [],
  i: [],
  input: [ 'type', 'disabled', 'checked' ],
  li: [],
  ol: [ 'start' ],
  p: [],
  pre: [ 'data-testid' ],
  span: [ 'data-testid' ],
  strong: [],
  style: [ 'type' ],
  table: [],
  tbody: [],
  td: [ 'align' ],
  th: [ 'align' ],
  thead: [],
  tr: [],
  ul: [],
};
const commonBodyAttributes = [ 'class', 'render-index', 'index' ];

const isAbsoluteWebOrFragmentLink = (href: string): boolean => {
  if (/^[ \t\n\f\r]*#/.test(href)) {
    return true;
  }
  try {
    return [ 'http:', 'https:' ].includes(new URL(href).protocol);
  } catch (e) {
    return false;
  }
};

// Lists everything in a parsed export which a legitimate export does not contain.
const outsideAllowlist = (exported: Document): string[] => {
  const found: string[] = [];
  Array.from(exported.childNodes).filter(node => node !== exported.documentElement).forEach(node => found.push(`document ${node.nodeName}`));
  [ exported.documentElement, exported.body ].forEach(element => Array.from(element.attributes).forEach(attribute => found.push(`${element.localName}@${attribute.name}`)));
  Array.from(exported.documentElement.childNodes).filter(node => node !== exported.head && node !== exported.body && (node.textContent ?? '').trim() !== '').forEach(node => found.push(`html ${node.nodeName}`));
  Array.from(exported.head.childNodes).filter(node => (node.textContent ?? '').trim() !== '' || node.nodeType !== Node.TEXT_NODE).forEach((node, index) => {
    const element = node as Element;
    if (index === 0 && element.localName === 'meta' && element.attributes.length === 1 && element.getAttribute('charset') === 'utf-8') {
      return;
    }
    if (index === 1 && element.localName === 'meta' && element.attributes.length === 2 && element.getAttribute('http-equiv') === 'Content-Security-Policy' && element.getAttribute('content') === expectedPolicy) {
      return;
    }
    if (index === 2 && element.localName === 'style' && element.attributes.length === 0) {
      return;
    }
    found.push(`head ${node.nodeName}`);
  });
  const walker = exported.createTreeWalker(exported.body, NodeFilter.SHOW_ALL);
  while (walker.nextNode() != null) {
    const node = walker.currentNode;
    if (node.nodeType === Node.TEXT_NODE) {
      continue;
    }
    const element = node as Element;
    const allowed = Object.prototype.hasOwnProperty.call(allowedBodyAttributes, element.localName) ? allowedBodyAttributes[element.localName] : undefined;
    if (node.nodeType !== Node.ELEMENT_NODE || element.namespaceURI !== 'http://www.w3.org/1999/xhtml' || allowed == null) {
      found.push(`body ${node.nodeName}`);
      continue;
    }
    Array.from(element.attributes).forEach(attribute => {
      if (
        (!allowed.includes(attribute.name) && !commonBodyAttributes.includes(attribute.name)) ||
        (attribute.name === 'href' && !isAbsoluteWebOrFragmentLink(attribute.value)) ||
        (attribute.name === 'class' && !/^[A-Za-z0-9_+#. -]*$/.test(attribute.value)) ||
        (attribute.name === 'data-testid' && !/^[a-z0-9-]+$/.test(attribute.value)) ||
        (attribute.name === 'messageid' && !/^[A-Za-z0-9_-]*$/.test(attribute.value)) ||
        (attribute.name === 'style' && /\\|(?:url|src|image|image-set)\(/i.test(attribute.value))
      ) {
        found.push(`${element.localName}@${attribute.name}=${attribute.value}`);
      }
    });
    if (element.localName === 'style' && /<[a-z/!?]/i.test(element.textContent ?? '')) {
      found.push('style text with a tag opener');
    }
  }
  return found;
};

// True when the chat body is the text only form: every card holds one block of plain text.
const isTextOnly = (exported: Document): boolean => {
  const cards = Array.from(exported.querySelectorAll('.mynah-chat-items-container > *'));
  return cards.length > 0 && cards.every(card => card.className === 'mynah-chat-item-card' && card.children.length === 1 &&
    card.children[0].getAttribute('style') === 'white-space: pre-wrap;' && card.children[0].children.length === 0);
};

describe('serialize-chat', () => {
  beforeEach(() => {
    testMynahUI = new MynahUI({
      tabs: {
        [testTabId]: {
          isSelected: true,
          store: {
            loadingChat: false,
          }
        }
      }
    });
  });

  afterEach(() => {
    mockedChatItemCard.mockImplementation(props => new ActualChatItemCard(props));
    document.head.querySelectorAll('style[data-test-style]').forEach(element => element.remove());
    document.body.innerHTML = '';
    testMynahUI.updateStore(testTabId, {
      loadingChat: false,
      chatItems: [],
    });
  });

  describe('markdown', () => {
    it('joins the non-empty bodies as they were provided', () => {
      const answerBody = '# Title\n\n<span onclick="run()" style="background:url(https://remote.example/a.png)">text</span>\n\n[link](javascript:run())';
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.PROMPT, body: 'What is a react hook' });
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: '  ' });
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: answerBody });

      expect(testMynahUI.serializeChat(testTabId, 'markdown')).toBe(`What is a react hook\n\n---\n\n${answerBody}`);
    });
  });

  describe('html document', () => {
    it('declares the character encoding and a content policy before any other content', () => {
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'Just a function.' });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);

      const policies = exported.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      expect(policies).toHaveLength(1);
      expect(policies[0].getAttribute('content')).toBe(expectedPolicy);
      expect(exported.head.firstElementChild?.outerHTML).toBe('<meta charset="utf-8">');
      expect(exported.head.firstElementChild?.nextElementSibling).toBe(policies[0]);
      expect(html.indexOf('<meta charset="utf-8">')).toBeLessThan(html.indexOf('<meta http-equiv="Content-Security-Policy"'));
      expect(html.indexOf('<meta charset="utf-8">')).toBeLessThan(100);
      expect(html.indexOf('<meta http-equiv="Content-Security-Policy"')).toBeLessThan(html.indexOf('<style>'));
    });

    it.each([
      [ 'missing', (charset: Element) => charset.remove() ],
      [ 'another encoding', (charset: Element) => charset.setAttribute('charset', 'iso-2022-jp') ],
      [ 'another attribute', (charset: Element) => charset.setAttribute('content', 'x') ],
      [ 'after the policy', (charset: Element) => charset.parentElement?.appendChild(charset) ],
    ])('does not return a document whose character encoding declaration is %s', (_, change) => {
      const parseFromString = DOMParser.prototype.parseFromString;
      const parseSpy = jest.spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(function (this: DOMParser, markup: string, type: DOMParserSupportedType) {
        const parsed = parseFromString.call(this, markup, type);
        change(parsed.head.querySelector('meta[charset]') as Element);
        return parsed;
      });
      try {
        testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'content' });
        expect(() => testMynahUI.serializeChat(testTabId, 'html')).toThrow('Could not build a self-contained chat export');
      } finally {
        parseSpy.mockRestore();
      }
    });

    it('does not allow script, remote resources, base changes or form submissions in the policy', () => {
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'Just a function.' });
      const policy = parseExport(testMynahUI.serializeChat(testTabId, 'html')).querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '';
      const directives = Object.fromEntries(policy.split(';').map(directive => {
        const [ name, ...values ] = directive.trim().split(/\s+/);
        return [ name, values ];
      }));

      expect(directives).toEqual({
        'default-src': [ "'none'" ],
        // Needed for the embedded stylesheet and the wrapper's own inline styles
        'style-src': [ "'unsafe-inline'" ],
        // Needed for the icons, which are embedded as data URLs
        'img-src': [ 'data:' ],
        'base-uri': [ "'none'" ],
        'form-action': [ "'none'" ]
      });
      expect(directives['script-src']).toBeUndefined();
      expect(policy).not.toMatch(/https?:|\*/);
    });

    it('keeps the wrapper, its inline styles and the document stylesheets', () => {
      const style = document.createElement('style');
      style.setAttribute('data-test-style', 'true');
      style.textContent = '.mynah-test-rule { color: red; }';
      document.head.appendChild(style);
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'Just a function.' });
      const exported = parseExport(testMynahUI.serializeChat(testTabId, 'html'));

      expect(exported.querySelector('.mynah-chat-wrapper')?.getAttribute('style')).toBe('max-width: 600px; margin: auto; border: 1px solid gray;');
      expect(exported.querySelector('.mynah-chat-items-container')?.getAttribute('style')).toBe('padding: 10px;');
      expect(exported.querySelectorAll('head > style')).toHaveLength(1);
      expect(exported.querySelector('head > style')?.textContent).toContain('.mynah-test-rule');
      expect(exported.querySelector('head > style')?.textContent).toContain('.mynah-ui-icon-ok');
    });

    it('keeps stylesheet text inside the style element', () => {
      const style = document.createElement('style');
      style.setAttribute('data-test-style', 'true');
      style.textContent = [
        '@import url("https://remote.example/sheet.css");',
        '.mynah-test-remote { background-image: url("https://remote.example/pixel.png"); }',
        '.mynah-test-close::after { content: "</style><script>window.ran = true</script><p id=\'escaped\'>"; }',
        '.mynah-test-close-upper::after { content: "</STYLE><img src=\'https://remote.example/pixel.png\'>"; }'
      ].join('\n');
      document.head.appendChild(style);
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'Just a function.' });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);

      expect(html.match(/<\/style/gi)).toHaveLength(1);
      expect(exported.querySelectorAll('script, img, #escaped')).toHaveLength(0);
      expect(exported.querySelectorAll('style')).toHaveLength(1);
      // The rules stay in the copy as text; the policy is what keeps them from loading.
      expect(exported.querySelector('style')?.textContent).toContain('.mynah-test-close::after');
      expect(exported.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toBe(expectedPolicy);
    });
  });

  describe('html content from chat bodies', () => {
    it('exports markup written in a body as text', () => {
      testMynahUI.addChatItem(testTabId, {
        type: ChatItemType.ANSWER,
        body: [
          '<span onclick="run()" style="background-image:url(https://remote.example/a.png)">text</span>',
          '<script>window.ran = true</script>',
          '<link rel="stylesheet" href="https://remote.example/sheet.css">',
          '[link](javascript:run())',
          '```js\n<mark onclick=run() reference-tracker>const a = 1;</mark>\n```',
        ].join('\n\n')
      });
      const exported = parseExport(testMynahUI.serializeChat(testTabId, 'html'));
      const card = exportedCard(exported);

      expect(exported.querySelectorAll('script, link, mark')).toHaveLength(0);
      expect(card.querySelectorAll('[onclick], [style], [href^="javascript"]')).toHaveLength(0);
      expect(card.textContent).toContain('<span onclick="run()" style="background-image:url(https://remote.example/a.png)">text</span>');
      expect(card.textContent).toContain('<mark onclick=run() reference-tracker>const a = 1;</mark>');
    });

    it('keeps only absolute http(s) and fragment link targets from a body', () => {
      testMynahUI.addChatItem(testTabId, {
        type: ChatItemType.ANSWER,
        body: [
          '[share](//remote.example/share/file)',
          '[backslash](/\\remote.example/share/file)',
          '[relative](./file.md)',
          '[rooted](/file.md)',
          '[fragment](#section)',
          '[web](https://example.com/)',
        ].join(' ')
      });
      const links = Array.from(exportedCard(parseExport(testMynahUI.serializeChat(testTabId, 'html'))).querySelectorAll('a'));

      expect(links.map(link => [ link.textContent, link.getAttribute('href') ])).toEqual([
        [ 'share', null ],
        [ 'backslash', null ],
        [ 'relative', null ],
        [ 'rooted', null ],
        [ 'fragment', '#section' ],
        [ 'web', 'https://example.com/' ],
      ]);
    });

    it('keeps headings, lists, tables, links and highlighted code blocks', () => {
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.PROMPT, body: 'What is a **react** hook' });
      testMynahUI.addChatItem(testTabId, {
        type: ChatItemType.ANSWER,
        messageId: 'message-1',
        body: [
          '# Title',
          '- one\n- two',
          '1. first',
          '- [x] done',
          '| a | b |\n|---|---|\n| 1 | 2 |',
          '[secure](https://example.com/docs?a=1#top) and [plain](http://example.com/) and `inline`',
          '```js\nconst a = 1;\n```',
        ].join('\n\n')
      });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);
      const cards = exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card');

      expect(cards).toHaveLength(2);
      expect(cards[0].classList.contains('mynah-chat-item-prompt')).toBe(true);
      expect(cards[0].querySelector('strong')?.textContent).toBe('react');
      const answer = cards[1];
      expect(answer.getAttribute('messageid')).toBe('message-1');
      expect(answer.querySelector('h1')?.textContent).toBe('Title');
      expect(Array.from(answer.querySelectorAll('ul > li')).map(item => item.textContent?.trim())).toEqual([ 'one', 'two', 'done' ]);
      expect(answer.querySelector('ol > li')?.textContent?.trim()).toBe('first');
      expect(answer.querySelector('input[type="checkbox"][disabled][checked]')).not.toBeNull();
      expect(Array.from(answer.querySelectorAll('table th, table td')).map(cell => cell.textContent)).toEqual([ 'a', 'b', '1', '2' ]);
      const links = answer.querySelectorAll('a');
      expect(Array.from(links).map(link => link.getAttribute('href'))).toEqual([ 'https://example.com/docs?a=1#top', 'http://example.com/' ]);
      expect(links[0].getAttribute('target')).toBe('_blank');
      expect(links[0].classList.contains('mynah-ui-clickable-item')).toBe(true);
      expect(answer.querySelector('.mynah-inline-code code')?.textContent).toBe('inline');
      const codeBlock = answer.querySelector('.mynah-syntax-highlighter:not(.mynah-inline-code) code');
      expect(codeBlock?.classList.contains('language-js')).toBe(true);
      expect(codeBlock?.classList.contains('hljs')).toBe(true);
      expect(codeBlock?.querySelector('span.hljs-keyword')?.textContent).toBe('const');
      expect(codeBlock?.querySelector('span.hljs-number')?.textContent).toBe('1');
      expect(answer.querySelector('i.mynah-ui-icon')).not.toBeNull();
    });

    it('exports the rendered cards without changing them', () => {
      // The inline code renders as a block inside a paragraph, which a parser would move out of it
      const body = '# Title\n\n- one\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n[secure](https://example.com/) and `inline` and [fragment](#title)\n\n```js\nconst a = 1;\n```';
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, messageId: 'message-1', body });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const rendered = new ActualChatItemCard({ chatItem: { type: ChatItemType.ANSWER, messageId: 'message-1', body }, tabId: testTabId }).render.outerHTML;

      expect(rendered).toContain('</a> and <div class="mynah-syntax-highlighter mynah-inline-code">');
      expect(withoutGeneratedId(html)).toContain(`<div class="mynah-chat-items-container" style="padding: 10px;">${withoutGeneratedId(rendered)}</div>`);
    });
  });

  describe('legitimate chats', () => {
    const sampleBodies = (): string[] => [ '../../../example/src/samples', '../../../ui-tests/src/mocks' ].flatMap(folder => {
      const directory = path.join(__dirname, folder);
      return fs.readdirSync(directory).filter(file => file.endsWith('.md')).sort().map(file => fs.readFileSync(path.join(directory, file), 'utf8'));
    }).filter(body => body.trim() !== '');

    it('exports the example and test chats as rendered, without falling back to text', () => {
      const bodies = sampleBodies();
      const statuses = [ undefined, 'success', 'warning', 'error', 'info' ] as const;
      bodies.forEach((body, index) => {
        testMynahUI.addChatItem(testTabId, {
          type: index % 2 === 0 ? ChatItemType.ANSWER : ChatItemType.PROMPT,
          messageId: `message-${index}`,
          status: statuses[index % statuses.length],
          icon: index % 3 === 0 ? 'ok-circled' : undefined,
          body
        });
      });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card')).toHaveLength(bodies.length);
      expect(exported.querySelectorAll('.mynah-card-body').length).toBeGreaterThanOrEqual(bodies.length);
    });

    it('exports every chat item type, status and icon without falling back to text', () => {
      const statuses = [ undefined, 'success', 'warning', 'error', 'info' ] as const;
      Object.values(ChatItemType).forEach(type => statuses.forEach(status => {
        testMynahUI.addChatItem(testTabId, { type, status, icon: 'warning', body: `**${type}** [link](https://example.com/) and \`code\`` });
      }));
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, icon: { name: 'custom-icon', base64Svg: customIconSvg }, body: 'custom icon' });
      const exported = parseExport(testMynahUI.serializeChat(testTabId, 'html'));

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
    });

    it('exports a rich chat exactly as the cleaned cards were rendered', () => {
      const bodies = [ ...sampleBodies(), legitRichBody ].filter(body => !/\]\((?!https?:|#)/.test(body));
      const html = bodies.map((body, index) => {
        testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, messageId: `message-${index}`, body });
        return withoutGeneratedId(new ActualChatItemCard({ chatItem: { type: ChatItemType.ANSWER, messageId: `message-${index}`, body }, tabId: testTabId }).render.outerHTML);
      });
      const exported = withoutGeneratedId(testMynahUI.serializeChat(testTabId, 'html'));

      expect(bodies.length).toBeGreaterThan(10);
      expect(exported).toContain(`<div class="mynah-chat-items-container" style="padding: 10px;">${html.join('\n')}</div>`);
    });
  });

  describe('html content reaching the rendered card', () => {
    it('removes event handler attributes', () => {
      const exported = exportRenderedMarkup([
        '<p onclick="run()" ONMOUSEOVER="run()">text</p>',
        '<button class="mynah-button" tabindex="0" onfocus="run()">button</button>',
      ].join(''));
      const card = exportedCard(exported);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(card.innerHTML).toBe('<p>text</p><button class="mynah-button" tabindex="0">button</button>');
    });

    it('removes event handler attributes from the card element itself', () => {
      mockedChatItemCard.mockImplementation(() => {
        const render = document.createElement('div');
        render.className = 'mynah-chat-item-card';
        render.setAttribute('onclick', 'run()');
        return { render };
      });
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'content' });
      const card = exportedCard(parseExport(testMynahUI.serializeChat(testTabId, 'html')));

      expect(card.hasAttribute('onclick')).toBe(false);
      expect(card.className).toBe('mynah-chat-item-card');
    });

    it.each([
      [ 'background-image:url(https://remote.example/a.png)' ],
      [ 'background-image: URL( "https://remote.example/a.png" )' ],
      [ 'background:url(//remote.example/a.png)' ],
      [ 'background-image:\\75 rl(https://remote.example/a.png)' ],
      [ 'background-image:image-set("https://remote.example/a.png" 1x)' ],
      [ 'background-image:-webkit-image-set("https://remote.example/a.png" 1x)' ],
      [ 'background-image:image("https://remote.example/a.png")' ],
      [ 'list-style:url(data:image/png;base64,AAAA)' ],
      [ '--source:url(https://remote.example/a.png);background:var(--source)' ],
    ])('removes a style attribute referencing a resource: %s', (style) => {
      const element = document.createElement('div');
      element.setAttribute('style', style);
      element.textContent = 'text';
      const exported = exportRenderedMarkup(element.outerHTML);
      const card = exportedCard(exported);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(card.querySelector('div')?.hasAttribute('style')).toBe(false);
      expect(card.querySelector('div')?.textContent).toBe('text');
      expect(card.innerHTML).not.toContain('remote.example');
    });

    it.each([
      [ 'color: red; font-weight: bold;' ],
      [ 'width: calc(100% - 10px); transform: translate3d(0px, 10px, 0px);' ],
      [ 'color: var(--mynah-color-text-default); background: rgb(0, 0, 0);' ],
    ])('keeps a style attribute without resources: %s', (style) => {
      const exported = exportRenderedMarkup(`<div style="${style}">text</div>`);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exportedCard(exported).querySelector('div')?.getAttribute('style')).toBe(style);
    });

    it.each([
      [ 'javascript:run()' ],
      [ 'JaVaScRiPt:run()' ],
      [ ' javascript:run()' ],
      [ 'java\tscript:run()' ],
      [ 'java\nscript:run()' ],
      [ '\u0001javascript:run()' ],
      [ 'vbscript:run()' ],
      [ 'data:text/html,<script>run()</script>' ],
      [ 'file:///etc/hosts' ],
      [ 'https://exa mple.com:port/' ],
      [ '//remote.example/share/file' ],
      [ '\\\\remote.example\\share\\file' ],
      [ '/\\remote.example/share/file' ],
      [ '\\/remote.example/share/file' ],
      [ './relative/file.md' ],
      [ '../relative/file.md' ],
      [ 'relative/file.md' ],
      [ '/absolute/path' ],
      [ '?query=1' ],
      [ '' ],
      [ '\u00a0#section' ],
      [ '\u0001#section' ],
    ])('removes a link target which is not absolute http(s) or a fragment: %j', (href) => {
      const link = document.createElement('a');
      link.setAttribute('href', href);
      link.setAttribute('target', '_blank');
      link.textContent = 'link';
      const exported = exportRenderedMarkup(link.outerHTML);
      const exportedLink = exportedCard(exported).querySelector('a');

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exportedLink?.hasAttribute('href')).toBe(false);
      expect(exportedLink?.textContent).toBe('link');
    });

    it.each([
      [ 'https://example.com/docs?a=1&b=2#top' ],
      [ 'http://example.com/' ],
      [ 'HTTPS://EXAMPLE.COM/' ],
      [ ' https://example.com/' ],
      [ '#section' ],
      [ '#' ],
      [ ' #section' ],
    ])('keeps an absolute http(s) or fragment link target: %j', (href) => {
      const link = document.createElement('a');
      link.setAttribute('href', href);
      link.textContent = 'link';
      const exported = exportRenderedMarkup(link.outerHTML);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exportedCard(exported).querySelector('a')?.getAttribute('href')).toBe(href);
    });

    it('removes attributes whose name was set in another case', () => {
      const exported = parseExport(exportBuiltCard(render => {
        const paragraph = document.createElement('p');
        paragraph.setAttributeNS(null, 'onClick', 'run()');
        paragraph.setAttributeNS(null, 'SRC', 'https://remote.example/a.png');
        paragraph.setAttributeNS(null, 'Class', 'kept');
        paragraph.textContent = 'text';
        const block = document.createElement('div');
        block.setAttributeNS(null, 'STYLE', 'background:url(https://remote.example/a.png)');
        const link = document.createElement('a');
        link.setAttributeNS(null, 'HREF', 'javascript:run()');
        link.textContent = 'link';
        render.append(paragraph, block, link);
      }));
      const card = exportedCard(exported);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(Array.from(card.querySelector('p')?.attributes ?? []).map(attribute => attribute.name)).toEqual([ 'class' ]);
      expect(card.querySelector('div')?.attributes).toHaveLength(0);
      expect(card.querySelector('a')?.attributes).toHaveLength(0);
    });

    it('keeps the attributes and inline style element of a rendered card', () => {
      const markup = [
        '<div class="mynah-card-body" render-index="0">',
        '<pre class=""><code class="language-js hljs" data-highlighted="yes"><span class="hljs-keyword">const</span> a = 1;</code></pre>',
        '<ol start="3" render-index="2"><li><input type="checkbox" disabled="disabled" checked=""> done</li></ol>',
        '<table render-index="4"><thead><tr><th align="left">a</th></tr></thead><tbody><tr><td align="right">1</td></tr></tbody></table>',
        '<button class="mynah-button" tabindex="0" title=""><i class="mynah-ui-icon mynah-ui-icon-copy"></i><span class="mynah-button-label">Copy</span></button>',
        '<span class="typewriter-part" index="0">part</span>',
        '<style type="text/css" class="">.typewriter-card-id .typewriter-part[index="0"] { opacity: 1; }</style>',
        '</div>',
      ].join('');
      const exported = exportRenderedMarkup(markup);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exportedCard(exported).innerHTML).toBe(markup);
    });

    it('keeps the text of an exported style element', () => {
      const exported = parseExport(exportBuiltCard(render => {
        render.appendChild(withText('style', '.a::after { content: "</style>"; } @media (width < 600px) { .a { color: red; } }'));
      }));

      expect(outsideAllowlist(exported)).toEqual([]);
      // An escaped character in a string is the same text for a stylesheet
      expect(exportedCard(exported).querySelector('style')?.textContent).toBe('.a::after { content: "\\3c /style>"; } @media (width < 600px) { .a { color: red; } }');
    });

    // Shapes from the browser runs: each one either exports cleaned or as text only, never with markup outside the allowlist.
    it.each([
      // Removed by the card cleaning
      [ 'cleaned', 'elements which run or load content', (render: HTMLElement) => {
        render.innerHTML = [
          '<script>window.ran = true</script>', '<script src="https://remote.example/a.js"></script>', '<iframe src="https://remote.example/"></iframe>',
          '<iframe srcdoc="<p>x</p>"></iframe>', '<object data="https://remote.example/a.swf"></object>', '<embed src="https://remote.example/a.swf">',
          '<link rel="stylesheet" href="https://remote.example/sheet.css">', refreshMeta, '<base href="https://remote.example/">', '<template><p onclick="run()">x</p></template>',
        ].join('');
      } ],
      [ 'cleaned', 'a meta refresh in the card', (render: HTMLElement) => { render.innerHTML = refreshMeta; } ],
      [ 'cleaned', 'a comment closing early', (render: HTMLElement) => render.appendChild(document.createComment(`-->${refreshMeta}<!--`)) ],
      [ 'cleaned', 'a processing instruction closing early', (render: HTMLElement) => render.appendChild(document.createProcessingInstruction('target', `>${refreshMeta}`)) ],
      [ 'cleaned', 'style text ending the element', (render: HTMLElement) => render.appendChild(withText('style', `.a {}</style>${refreshMeta}`)) ],
      [ 'cleaned', 'style text ending the element in another case', (render: HTMLElement) => {
        [ '</STYLE >', '</style/>', '</sTyLe\n>', '</style\t>' ].forEach(end => render.appendChild(withText('style', `.a {}${end}${refreshMeta}`)));
      } ],
      [ 'cleaned', 'xmp text ending the element', (render: HTMLElement) => render.appendChild(withText('xmp', `</xmp>${refreshMeta}`)) ],
      [ 'cleaned', 'noembed text ending the element', (render: HTMLElement) => render.appendChild(withText('noembed', `</noembed>${refreshMeta}`)) ],
      [ 'cleaned', 'noframes text ending the element', (render: HTMLElement) => render.appendChild(withText('noframes', `</noframes>${refreshMeta}`)) ],
      [ 'cleaned', 'plaintext content', (render: HTMLElement) => render.appendChild(withText('plaintext', refreshMeta)) ],
      [ 'cleaned', 'script text', (render: HTMLElement) => render.appendChild(withText('script', `</script>${refreshMeta}`)) ],
      [ 'cleaned', 'iframe text', (render: HTMLElement) => render.appendChild(withText('iframe', `</iframe>${refreshMeta}`)) ],
      [ 'cleaned', 'noscript content', (render: HTMLElement) => { render.innerHTML = `<noscript><p title="</noscript>${refreshMeta}"></p></noscript>`; } ],
      [ 'cleaned', 'svg content', (render: HTMLElement) => { render.innerHTML = `<svg></p><style><a id="</style>${refreshMeta}"></a></style></svg>`; } ],
      [ 'cleaned', 'math content', (render: HTMLElement) => { render.innerHTML = `<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;/mglyph&gt;${escapedRefreshMeta}"></mglyph></table></mtext></math>`; } ],
      [ 'cleaned', 'a frameset', (render: HTMLElement) => { render.appendChild(document.createElement('frameset')).appendChild(document.createElement('frame')).setAttribute('src', 'https://remote.example/'); } ],
      // Outside the allowlist after cleaning, so only text is exported
      [ 'text only', 'svg and math elements built without a root', (render: HTMLElement) => {
        render.appendChild(document.createElementNS(svgNamespace, 'style')).textContent = `</style>${refreshMeta}`;
        render.appendChild(document.createElementNS(svgNamespace, 'a')).setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', 'javascript:run()');
        render.appendChild(document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mtext')).textContent = 'mtext';
      } ],
      [ 'text only', 'elements a legitimate export has no use for', (render: HTMLElement) => {
        render.innerHTML = '<img alt="picture"><video></video><details open><summary>more</summary></details><mark reference-tracker>m</mark>';
      } ],
      [ 'text only', 'math content between forms', (render: HTMLElement) => { render.innerHTML = `<form><math><mtext></form><form><mglyph><style></math>${refreshMeta}`; } ],
      [ 'text only', 'math, table and mglyph nesting', (render: HTMLElement) => {
        render.innerHTML = [
          `<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;/mglyph&gt;${unquotedRefreshMeta.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"></mglyph></table></mtext></math>`,
          `<svg></p><style><a id="</style>${unquotedRefreshMeta}"></a></style></svg>`,
          `<form><math><mtext></form><form><mglyph><style></math>${unquotedRefreshMeta}`,
          `<noscript><p title="</noscript>${unquotedRefreshMeta}"></noscript>`,
          `<xmp>${unquotedRefreshMeta}</xmp><textarea>${unquotedRefreshMeta}</textarea>`,
        ].join('');
      } ],
      [ 'text only', 'mixed case handler, style text, comment and xmp text together', (render: HTMLElement) => {
        const paragraph = render.appendChild(withText('p', 'mixed case attr'));
        paragraph.setAttributeNS(null, 'onClick', 'run()');
        render.appendChild(withText('style', `.x{}</style>${refreshMeta}`));
        render.appendChild(document.createComment(`-->${refreshMeta}<!--`));
        render.appendChild(withText('xmp', `</xmp>${refreshMeta}`));
        render.appendChild(document.createElement('textarea')).textContent = `</textarea>${refreshMeta}`;
      } ],
      [ 'text only', 'style text inside a select', (render: HTMLElement) => {
        render.appendChild(document.createElement('select')).appendChild(withText('style', `<input>${refreshMeta}<!-- --></select>`));
      } ],
      [ 'text only', 'body, html and head elements with attributes', (render: HTMLElement) => {
        [ 'body', 'html', 'head' ].forEach(tagName => {
          const element = render.appendChild(withText(tagName, tagName));
          element.setAttribute('background', 'https://remote.example/a.png');
          element.setAttributeNS(null, 'onPageShow', 'run()');
          element.setAttribute('class', 'kept');
        });
      } ],
      [ 'text only', 'a title element closing early', (render: HTMLElement) => render.appendChild(withText('title', `</title>${refreshMeta}`)) ],
      [ 'text only', 'nested links and forms', (render: HTMLElement) => {
        const link = render.appendChild(document.createElement('a'));
        link.setAttribute('href', 'https://example.com/');
        link.appendChild(withText('a', 'nested')).setAttribute('href', 'https://example.com/nested');
        render.appendChild(document.createElement('form')).appendChild(document.createElement('form')).appendChild(withText('button', 'submit'));
      } ],
      [ 'text only', 'attributes a legitimate export has no use for', (render: HTMLElement) => {
        render.innerHTML = '<div class="mynah-card-body" tabindex="0" title="title" lang="en" role="note" aria-label="x" data-state="kept"><span once="true">text</span></div>';
      } ],
      [ 'text only', 'names of object properties', (render: HTMLElement) => {
        render.innerHTML = '<p constructor="x" tostring="y">text</p>';
      } ],
    ])('exports %s: %s', (outcome, _, build) => {
      const html = exportBuiltCard(render => {
        build(render);
        render.appendChild(withText('p', 'text')).className = 'kept';
      });
      const exported = parseExport(html);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exported.querySelectorAll('meta')).toHaveLength(2);
      expect(exported.querySelectorAll('body meta')).toHaveLength(0);
      expect(html).not.toMatch(/<!--|<\?/);
      expect(isTextOnly(exported)).toBe(outcome === 'text only');
      if (outcome === 'text only') {
        expect(exported.querySelector('.mynah-chat-item-card')?.textContent).toBe('content');
      } else {
        expect(exportedCard(exported).querySelector('p.kept')?.textContent).toBe('text');
      }
    });

    it('removes class names with characters a legitimate export does not write and keeps the others', () => {
      const exported = parseExport(exportBuiltCard(render => {
        const code = render.appendChild(withText('code', 'x'));
        const escape = '\u001b';
        code.setAttribute('class', `language-x${escape}(B<meta/http-equiv='refresh'/content='0;url=https://remote.example/'> hljs\tlanguage-js "quoted" a&b`);
        render.appendChild(withText('p', 'text')).setAttribute('class', '<');
      }));
      const card = exportedCard(exported);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(card.querySelector('code')?.getAttribute('class')).toBe('hljs language-js');
      expect(card.querySelector('p')?.getAttribute('class')).toBe('');
      expect(exported.querySelectorAll('meta[http-equiv="refresh" i]')).toHaveLength(0);
    });

    it('keeps class names a legitimate export writes as they are', () => {
      const markup = '<pre class="mynah-syntax-highlighter  line-numbers"><code class="language-c++ language-c# language-asp.net language-TypeScript hljs-title class_ hljs-built_in">x</code></pre>';
      const exported = exportRenderedMarkup(markup);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exportedCard(exported).innerHTML).toBe(markup);
    });

    it('exports a code block whose language name holds markup without anything active', () => {
      const escape = '\u001b';
      const refresh = `${escape}(B<meta/http-equiv='refresh'/content='0;url=https://remote.example/'>`;
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: `Some text ${escape}$B\n\n\`\`\`${refresh}\nx\n\`\`\`\n\n\`\`\`js\nconst a = 1;\n\`\`\`` });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);
      const codeBlocks = Array.from(exportedCard(exported).querySelectorAll('pre > code'));

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(html).not.toContain('<meta/http-equiv');
      expect(exported.querySelectorAll('body meta')).toHaveLength(0);
      expect(Array.from(exported.querySelectorAll('[class]')).filter(element => /[^A-Za-z0-9_+#. -]/.test(element.getAttribute('class') ?? ''))).toHaveLength(0);
      expect(codeBlocks[0]?.textContent?.trim()).toBe('x');
      expect(codeBlocks[0]?.classList.contains('hljs')).toBe(true);
      expect(codeBlocks[0]?.closest('.mynah-syntax-highlighter')).not.toBeNull();
      expect(codeBlocks[1]?.classList.contains('language-js')).toBe(true);
      expect(codeBlocks[1]?.classList.contains('hljs')).toBe(true);
    });

    // Message ids as mynah-ui and the language-servers chat client and server create them.
    const legitMessageIds = [
      '3f2b8c1e-9d4a-4c7e-8b21-5a6f0e9d7c13', 'tooluse_Qb2BGxl3TtGVwYC4R2Gjvg', 'tooluse_Qb2BGxl3TtGVwYC4R2Gjvg_permission',
      'progress_tooluse_Qb2BGxl3TtGVwYC4R2Gjvg_explanation', 'tooluse_x-1_codeReviewFindings', 'tooluse_x-1_displayFindings', 'tooluse_x-1_undoall',
      'reject-message-tooluse_x-1', 'loading-3f2b8c1e-9d4a-4c7e-8b21-5a6f0e9d7c13', 'error-message-id-3f2b8c1e-9d4a-4c7e-8b21-5a6f0e9d7c13',
      '3f2b8c1e-9d4a-4c7e-8b21-5a6f0e9d7c13_compact', 'stopped1764072000000', 'TEMP_0a1b2c', '0a1b2c', 'amazonq-disclaimer-card',
      'modelUnavailable', 'monthly-usage-limit', '',
    ];

    it('keeps the message ids legitimate chats write', () => {
      legitMessageIds.forEach(messageId => testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, messageId, body: `message ${messageId}` }));
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'no message id' });
      const exported = parseExport(testMynahUI.serializeChat(testTabId, 'html'));
      const cards = Array.from(exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card'));

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(cards.map(card => card.getAttribute('messageid'))).toEqual([ ...legitMessageIds, 'unknown' ]);
    });

    it.each([
      [ `m" ${refreshMeta}` ],
      [ `id\u001b$B"\u001b(B${unquotedRefreshMeta}` ],
      [ "a'b" ],
      [ 'a<b' ],
      [ 'a&amp;b' ],
      [ 'two words' ],
      [ 'line\nbreak' ],
      [ 'id\u0000' ],
      [ 'name:with.dots' ],
      [ 'caf\u00e9' ],
    ])('removes a message id with characters its sources do not write and keeps the card: %j', (messageId) => {
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, messageId, body: 'other id' });
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, messageId: 'neighbour-1', body: 'legit **neighbour**' });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);
      const cards = Array.from(exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card'));

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(cards).toHaveLength(2);
      expect(cards[0].hasAttribute('messageid')).toBe(false);
      expect(cards[0].querySelector('.mynah-card-body')?.textContent?.trim()).toBe('other id');
      expect(cards[1].getAttribute('messageid')).toBe('neighbour-1');
      expect(cards[1].querySelector('strong')?.textContent).toBe('neighbour');
      expect(exported.querySelectorAll('body meta')).toHaveLength(0);
      expect(html).not.toContain('remote.example');
    });

    it.each([
      [ '<span messageid="ok-1">extra</span>', '<span>extra</span>' ],
      [ '<p data-testid="ok-id">extra</p>', '<p>extra</p>' ],
      [ '<pre messageid="ok-1" data-testid="ok-id">extra</pre>', '<pre data-testid="ok-id">extra</pre>' ],
      [ '<a href="https://example.com/" data-testid="ok-id" messageid="ok-1">link</a>', '<a href="https://example.com/">link</a>' ],
      [ '<div messageid="ok-1" data-testid="ok-id">extra</div>', '<div messageid="ok-1" data-testid="ok-id">extra</div>' ],
    ])('removes a message id or test id from an element legitimate exports do not put it on and keeps the card: %j', (markup, expected) => {
      const exported = exportRenderedMarkup(markup);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(exportedCard(exported).innerHTML).toBe(expected);
    });

    it('removes message ids and test ids in a namespace or on an unlisted element set with another case and keeps the card', () => {
      const html = exportBuiltCard(render => {
        render.setAttribute('messageid', 'm-1');
        render.setAttributeNS('urn:x', 'x:messageid', 'ok');
        render.setAttributeNS('urn:x', 'x:data-testid', 'ok-id');
        const span = render.appendChild(withText('span', 'text'));
        span.setAttributeNS(null, 'MessageId', 'ok');
        span.setAttributeNS('urn:x', 'x:data-testid', 'ok-id');
      });
      const exported = parseExport(html);
      const card = exportedCard(exported);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(isTextOnly(exported)).toBe(false);
      expect(Array.from(card.attributes).map(attribute => attribute.name)).toEqual([ 'class', 'messageid' ]);
      expect(card.getAttribute('messageid')).toBe('m-1');
      expect(card.innerHTML).toBe('<span>text</span>');
    });

    it('exports style text without anything a parser could read as a tag', () => {
      const html = exportBuiltCard(render => {
        render.appendChild(withText('style', `<input>${refreshMeta}<!-- --></select>`));
      });
      const exported = parseExport(html);

      expect(outsideAllowlist(exported)).toEqual([]);
      expect(html).toContain('<style>\\3c input>\\3c meta http-equiv="refresh" content="0;url=https://remote.example/">\\3c !-- -->\\3c /select></style>');
    });
  });

  describe('text only export', () => {
    it('exports the message text of every item with the same head', () => {
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.PROMPT, body: 'question with <b>markup</b> & "quotes"' });
      const regularHead = parseExport(testMynahUI.serializeChat(testTabId, 'html')).head.innerHTML;
      testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: '# answer\n\n```js\nconst a = 1;\n```' });
      mockedChatItemCard.mockImplementation(() => {
        const render = document.createElement('div');
        render.innerHTML = '<img alt="not exported">';
        return { render };
      });
      const html = testMynahUI.serializeChat(testTabId, 'html');
      const exported = parseExport(html);
      const cards = exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card');

      expect(isTextOnly(exported)).toBe(true);
      expect(outsideAllowlist(exported)).toEqual([]);
      expect(exported.head.innerHTML).toBe(regularHead);
      expect(exported.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toBe(expectedPolicy);
      expect(Array.from(cards).map(card => card.textContent)).toEqual([ 'question with <b>markup</b> & "quotes"', '# answer\n\n```js\nconst a = 1;\n```' ]);
      expect(exported.querySelectorAll('b, img')).toHaveLength(0);
      expect(testMynahUI.serializeChat(testTabId, 'markdown')).toBe('question with <b>markup</b> & "quotes"\n\n---\n\n# answer\n\n```js\nconst a = 1;\n```');
    });

    it('checks the document it returns, as the browser parses it', () => {
      const parseFromString = DOMParser.prototype.parseFromString;
      const parsedMarkup: string[] = [];
      const parseSpy = jest.spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(function (this: DOMParser, markup: string, type: DOMParserSupportedType) {
        parsedMarkup.push(markup);
        const parsed = parseFromString.call(this, markup, type);
        // Only the first document parses into something the markup does not show
        if (parsedMarkup.length === 1) {
          parsed.body.appendChild(parsed.createElement('meta')).setAttribute('http-equiv', 'refresh');
        }
        return parsed;
      });
      let html = '';
      try {
        html = exportBuiltCard(render => render.appendChild(withText('p', 'text')));
      } finally {
        parseSpy.mockRestore();
      }

      expect(parsedMarkup).toHaveLength(2);
      expect(parsedMarkup[1]).toBe(html);
      expect(isTextOnly(parseExport(html))).toBe(true);
      expect(parsedMarkup[0]).toContain('<p>text</p>');
    });

    it.each([
      [ 'messageid', 'm" x' ],
      [ 'messageid', 'name:with.dots' ],
      [ 'data-testid', 'Chat-Item' ],
      [ 'data-testid', '' ],
    ])('exports only text when the returned document has a %s outside its pattern: %j', (attributeName, value) => {
      const parseFromString = DOMParser.prototype.parseFromString;
      let parseCount = 0;
      const parseSpy = jest.spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(function (this: DOMParser, markup: string, type: DOMParserSupportedType) {
        const parsed = parseFromString.call(this, markup, type);
        parseCount++;
        // Only the first document holds the value, as if the parser had produced it from the cleaned cards
        if (parseCount === 1) {
          parsed.querySelector('.mynah-chat-item-card')?.setAttribute(attributeName, value);
        }
        return parsed;
      });
      let html = '';
      try {
        testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, messageId: 'message-1', body: 'content' });
        html = testMynahUI.serializeChat(testTabId, 'html');
      } finally {
        parseSpy.mockRestore();
      }

      expect(parseCount).toBe(2);
      expect(isTextOnly(parseExport(html))).toBe(true);
    });

    it('throws instead of returning a document which does not pass the check', () => {
      const parseFromString = DOMParser.prototype.parseFromString;
      const parseSpy = jest.spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(function (this: DOMParser, markup: string, type: DOMParserSupportedType) {
        const parsed = parseFromString.call(this, markup, type);
        parsed.body.appendChild(parsed.createElement('script'));
        return parsed;
      });
      try {
        testMynahUI.addChatItem(testTabId, { type: ChatItemType.ANSWER, body: 'content' });
        expect(() => testMynahUI.serializeChat(testTabId, 'html')).toThrow('Could not build a self-contained chat export');
        expect(testMynahUI.serializeChat(testTabId, 'markdown')).toBe('content');
      } finally {
        parseSpy.mockRestore();
      }
    });
  });
});

// Texts and config as the language-servers chat client passes them to MynahUI (chat-client/src/client/mynahUi.ts), in agentic mode on macOS.
const chatClientTexts = {
  mainTitle: 'Amazon Q (Preview)',
  copy: 'Copy',
  insertAtCursorLabel: 'Insert at cursor',
  feedbackFormTitle: 'Report an issue',
  feedbackFormOptionsLabel: 'What type of issue would you like to report?',
  feedbackFormCommentLabel: 'Description of issue (optional):',
  feedbackThanks: 'Thanks for your feedback!',
  feedbackReportButtonLabel: 'Report an issue',
  codeSuggestions: 'Code suggestions',
  files: 'file(s)',
  clickFileToViewDiff: 'Click on a file to view diff.',
  showMore: 'Show more',
  save: 'Save',
  cancel: 'Cancel',
  submit: 'Submit',
  stopGenerating: 'Stop',
  copyToClipboard: 'Copied to clipboard',
  noMoreTabsTooltip: 'You can only open ten conversation tabs at a time.',
  codeSuggestionWithReferenceTitle: 'Some suggestions contain code with references.',
  spinnerText: 'Working...',
  macStopButtonShortcut: '&#8679; &#8984; &#9003;',
  windowStopButtonShortcut: 'Ctrl + &#8679; + &#9003;',
};

// Config is a singleton taken from the first MynahUI, so these tests load the modules again and start with the chat client config.
// Its config.test adds data-testid attributes to the rendered elements.
describe('serialize-chat with the chat client config', () => {
  let main: typeof import('../../main');
  let testConfigMynahUI: InstanceType<typeof main.MynahUI>;
  let ActualTestConfigChatItemCard: typeof ActualChatItemCard;
  let testConfigChatItemCard: jest.Mock;

  beforeAll(async () => {
    await jest.isolateModulesAsync(async () => {
      main = await import('../../main');
      ActualTestConfigChatItemCard = jest.requireActual('../../components/chat-item/chat-item-card').ChatItemCard;
      testConfigChatItemCard = (await import('../../components/chat-item/chat-item-card')).ChatItemCard as unknown as jest.Mock;
    });
  });

  beforeEach(() => {
    // The module mock is shared with the first module registry, so it is pointed at the cards of this one.
    testConfigChatItemCard.mockImplementation(props => new ActualTestConfigChatItemCard(props));
    testConfigMynahUI = new main.MynahUI({
      config: {
        maxTabs: 10,
        test: true,
        dragOverlayIcon: main.MynahIcons.IMAGE,
        texts: {
          ...chatClientTexts,
          dragOverlayText: 'Add image to context',
          stopGenerating: chatClientTexts.stopGenerating,
          stopGeneratingTooltip: `Stop:  ${chatClientTexts.macStopButtonShortcut}`,
          spinnerText: chatClientTexts.spinnerText,
        },
        maxUserInput: 500096,
        userInputLengthWarningThreshold: 450000,
        disableTypewriterAnimation: true,
      },
      tabs: { [testTabId]: { isSelected: true, store: { loadingChat: false } } }
    });
  });

  afterEach(() => {
    testConfigChatItemCard.mockImplementation(props => new ActualChatItemCard(props));
    document.body.innerHTML = '';
    testConfigMynahUI.updateStore(testTabId, { loadingChat: false, chatItems: [] });
  });

  const sampleBodies = (): string[] => [ '../../../example/src/samples', '../../../ui-tests/src/mocks' ].flatMap(folder => {
    const directory = path.join(__dirname, folder);
    return fs.readdirSync(directory).filter(file => file.endsWith('.md')).sort().map(file => fs.readFileSync(path.join(directory, file), 'utf8'));
  }).filter(body => body.trim() !== '');

  it('exports legitimate chats as rendered cards with their test ids', () => {
    const bodies = [ ...sampleBodies(), legitRichBody ];
    const types = Object.values(main.ChatItemType);
    bodies.forEach((body, index) => {
      testConfigMynahUI.addChatItem(testTabId, { type: types[index % types.length], messageId: `message-${index}`, icon: index % 3 === 0 ? 'ok-circled' : undefined, body });
    });
    const html = testConfigMynahUI.serializeChat(testTabId, 'html');
    const exported = parseExport(html);

    expect(outsideAllowlist(exported)).toEqual([]);
    expect(isTextOnly(exported)).toBe(false);
    expect(exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card')).toHaveLength(bodies.length);
    expect(exported.querySelectorAll('[data-testid="chat-item-card"]')).toHaveLength(bodies.length);
    expect(exported.querySelectorAll('pre[data-testid]').length).toBeGreaterThan(0);
  });

  it('exports the rendered cards with their test ids unchanged', () => {
    const bodies = [ ...sampleBodies(), legitRichBody ].filter(body => !/\]\((?!https?:|#)/.test(body));
    const rendered = bodies.map((body, index) => {
      testConfigMynahUI.addChatItem(testTabId, { type: main.ChatItemType.ANSWER, messageId: `message-${index}`, body });
      return withoutGeneratedId(new ActualTestConfigChatItemCard({ chatItem: { type: main.ChatItemType.ANSWER, messageId: `message-${index}`, body }, tabId: testTabId }).render.outerHTML);
    });
    const exported = withoutGeneratedId(testConfigMynahUI.serializeChat(testTabId, 'html'));

    expect(rendered.join('\n')).toContain('data-testid="chat-item-answer"');
    expect(exported).toContain(`<div class="mynah-chat-items-container" style="padding: 10px;">${rendered.join('\n')}</div>`);
  });

  it('renders the cards with the chat client config', () => {
    testConfigMynahUI.addChatItem(testTabId, { type: main.ChatItemType.ANSWER_STREAM, messageId: 'stream-1', body: 'streaming **text**\n\n```js\nconst a = 1;\n```' });
    const exported = parseExport(testConfigMynahUI.serializeChat(testTabId, 'html'));
    const card = exportedCard(exported);

    expect(outsideAllowlist(exported)).toEqual([]);
    expect(isTextOnly(exported)).toBe(false);
    expect(card.getAttribute('data-testid')).toBe('chat-item-answer-stream');
    expect(card.querySelector('pre[data-testid]')).not.toBeNull();
    // With the typewriter animation disabled, a streaming card has no animation style element
    expect(card.querySelectorAll('style')).toHaveLength(0);
  });

  it.each([
    [ `chat-item-answer" ${refreshMeta}` ],
    [ 'Chat-Item' ],
    [ 'chat item' ],
    [ '' ],
  ])('removes a test id which is not a lowercase token and keeps the card: %j', (testId) => {
    testConfigMynahUI.addChatItem(testTabId, { type: main.ChatItemType.ANSWER, body: 'content' });
    const html = testConfigMynahUI.serializeChat(testTabId, 'html');
    const rendered = exportedCard(parseExport(html));
    const testIdCount = rendered.querySelectorAll('[data-testid]').length;
    rendered.querySelector('[data-testid="chat-item-card"]')?.setAttribute('data-testid', testId);
    const markup = rendered.outerHTML;
    testConfigChatItemCard.mockImplementationOnce(() => {
      const render = document.createElement('div');
      render.innerHTML = markup;
      return { render: render.firstElementChild };
    });
    const exported = parseExport(testConfigMynahUI.serializeChat(testTabId, 'html'));
    const card = exportedCard(exported);

    expect(isTextOnly(exported)).toBe(false);
    expect(outsideAllowlist(exported)).toEqual([]);
    expect(exported.querySelectorAll('body meta')).toHaveLength(0);
    expect(card.getAttribute('data-testid')).toBe('chat-item-answer');
    expect(card.querySelectorAll('[data-testid]')).toHaveLength(testIdCount - 1);
    expect(card.querySelectorAll('[data-testid="chat-item-card"]')).toHaveLength(0);
    expect(card.querySelector('.mynah-card-body')?.textContent?.trim()).toBe('content');
  });

  it('removes only the test id an item type outside the enum writes and keeps the other cards', () => {
    testConfigMynahUI.addChatItem(testTabId, { type: 'answer"/><meta/http-equiv=refresh/content=0;url=https://remote.example/>' as unknown as typeof main.ChatItemType.ANSWER, messageId: 'unlisted-type', body: 'content' });
    testConfigMynahUI.addChatItem(testTabId, { type: main.ChatItemType.ANSWER, messageId: 'neighbour-1', body: 'legit **neighbour**\n\n```js\nconst a = 1;\n```' });
    const html = testConfigMynahUI.serializeChat(testTabId, 'html');
    const exported = parseExport(html);
    const cards = Array.from(exported.querySelectorAll('.mynah-chat-items-container > .mynah-chat-item-card'));

    expect(outsideAllowlist(exported)).toEqual([]);
    expect(isTextOnly(exported)).toBe(false);
    expect(exported.querySelectorAll('body meta')).toHaveLength(0);
    expect(html).not.toContain('remote.example');
    expect(cards.map(card => card.getAttribute('messageid'))).toEqual([ 'unlisted-type', 'neighbour-1' ]);
    expect(cards[0].hasAttribute('data-testid')).toBe(false);
    expect(cards[0].querySelector('.mynah-card-body')?.textContent?.trim()).toBe('content');
    expect(cards[1].getAttribute('data-testid')).toBe('chat-item-answer');
    expect(cards[1].querySelector('strong')?.textContent).toBe('neighbour');
    expect(cards[1].querySelector('pre[data-testid] code.language-js')).not.toBeNull();
  });
});
