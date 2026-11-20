import { ChatItemCard } from '../components/chat-item/chat-item-card';
import { MynahUITabsStore } from './tabs-store';
import { ChatItem } from '../static';
import escapeHTML from 'escape-html';

/**
 * Serialize all (non-empty) chat messages in a tab to a markdown string
 * @param tabId Corresponding tab ID.
 * @returns The bodies of chat cards in markdown format, separated by \n\n---\n\n
 */
export const serializeMarkdown = (tabId: string): string => {
  return (MynahUITabsStore.getInstance().getTabDataStore(tabId).getValue('chatItems') as ChatItem[]).map(chatItem => chatItem.body ?? '').filter(chatItem => chatItem.trim() !== '').join('\n\n---\n\n') ?? '';
};

// The exported file is opened outside the host webview, so it must not run script or load anything remote.
const EXPORT_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
// Raw text containers, SVG and MathML are removed too: their serialized form can parse into different markup.
const EXPORT_REMOVED_ELEMENTS = 'script, iframe, frame, frameset, object, embed, applet, link, meta, base, template, noscript, noembed, noframes, xmp, plaintext, svg, math';
const EXPORT_REMOVED_ATTRIBUTES = [ 'src', 'srcset', 'srcdoc', 'poster', 'data', 'background', 'ping', 'action', 'formaction' ];
const EXPORT_LINK_PROTOCOLS = [ 'http:', 'https:' ];
// Backslashes are matched too, since CSS escapes can spell these function names.
const EXPORT_STYLE_RESOURCE_PATTERN = /\\|(?:url|src|image|image-set)\(/i;
// Only the leading whitespace a browser ignores as well; other whitespace would make the target a relative path.
const EXPORT_FRAGMENT_LINK_PATTERN = /^[ \t\n\f\r]*#/;
const EXPORT_HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
// Class tokens and test ids as legitimate exports write them, so no attribute value holds markup or control characters.
const EXPORT_CLASS_TOKEN_PATTERN = /^[A-Za-z0-9_+#.-]+$/;
const EXPORT_CLASS_PATTERN = /^[A-Za-z0-9_+#. -]*$/;
const EXPORT_TEST_ID_PATTERN = /^[a-z0-9-]+$/;
// Message ids as mynah-ui and its chat clients create them: uuids, tool use ids and fixed names with suffixes.
const EXPORT_MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]*$/;

// Stylesheet text must not be able to end the style element it is embedded in.
const escapeStyleEnd = (css: string): string => css.replace(/<\/(style)/gi, '<\\/$1');

// Style text inside the content is written with no tag opener at all, so it stays text wherever a parser places it.
const EXPORT_TAG_OPENER_PATTERN = /<(?=[a-z/!?])/i;
const escapeStyleMarkup = (css: string): string => css.replace(/<(?=[a-z/!?])/gi, '\\3c ');

// Relative targets are dropped: once the file is opened from disk they resolve to local or network file paths.
const isExportableLink = (href: string): boolean => {
  if (EXPORT_FRAGMENT_LINK_PATTERN.test(href)) {
    return true;
  }
  try {
    return EXPORT_LINK_PROTOCOLS.includes(new URL(href).protocol);
  } catch (e) {
    return false;
  }
};

const EXPORT_ID_ATTRIBUTES = [ 'messageid', 'data-testid' ];

// Message and test ids are kept only where the final check accepts them: on the same elements, without a namespace.
// Only EXPORT_ALLOWED_ELEMENTS is consulted, so these ids must not be added to EXPORT_ALLOWED_COMMON_ATTRIBUTES.
const isExportableIdAttribute = (element: Element, attribute: Attr): boolean => {
  const rule = getOwn(getOwn(EXPORT_ALLOWED_ELEMENTS, element.localName.toLowerCase()) ?? {}, attribute.localName.toLowerCase());
  return attribute.namespaceURI == null && rule != null && rule(attribute.value);
};

/**
 * Removes everything which would be active in a standalone document: event handler attributes,
 * resource references and links other than http(s) or same-document fragments. Message and test ids
 * with characters their sources do not write, or on elements legitimate exports do not put them on,
 * are removed as well, so only that attribute is lost.
 */
const cleanForExport = (root: Element): void => {
  const removedNodes: Node[] = Array.from(root.querySelectorAll(EXPORT_REMOVED_ELEMENTS));
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_PROCESSING_INSTRUCTION);
  while (walker.nextNode() != null) {
    removedNodes.push(walker.currentNode);
  }
  removedNodes.forEach(node => node.parentNode?.removeChild(node));

  root.querySelectorAll('style').forEach(style => {
    style.textContent = escapeStyleMarkup(style.textContent ?? '');
  });

  [ root, ...Array.from(root.querySelectorAll('*')) ].forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const attributeName = attribute.name.toLowerCase();
      if (attribute.name === 'class' && !EXPORT_CLASS_PATTERN.test(attribute.value)) {
        attribute.value = attribute.value.split(/[ \t\n\f\r]+/).filter(token => EXPORT_CLASS_TOKEN_PATTERN.test(token)).join(' ');
      }
      if (
        attributeName.startsWith('on') ||
        EXPORT_REMOVED_ATTRIBUTES.includes(attributeName) ||
        (attributeName === 'style' && EXPORT_STYLE_RESOURCE_PATTERN.test(attribute.value)) ||
        (EXPORT_ID_ATTRIBUTES.includes(attribute.localName.toLowerCase()) && !isExportableIdAttribute(element, attribute)) ||
        ((attributeName === 'href' || attributeName === 'xlink:href') && !isExportableLink(attribute.value))
      ) {
        // By node, since removeAttribute lowercases the name and misses attributes set with another case.
        element.removeAttributeNode(attribute);
      }
    });
  });
};

const getExportDocument = (head: string, body: string): string => `
    <html>
      <head>${head}</head>
      <body>${body}</body>
    </html>
  `;

const getExportHead = (styles: string): string => `
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="${EXPORT_CONTENT_SECURITY_POLICY}">
        <style>
          ${styles}
        </style>
      `;

const getExportBody = (cards: string): string => `
      <div class="mynah-chat-wrapper" style="max-width: 600px; margin: auto; border: 1px solid gray;">
        <div class="mynah-chat-items-container" style="padding: 10px;">${cards}</div>
        </div>
      `;

const isNumber = (value: string): boolean => /^\d+$/.test(value);
const isAny = (): boolean => true;
const isTestId = (value: string): boolean => EXPORT_TEST_ID_PATTERN.test(value);
const isMessageId = (value: string): boolean => EXPORT_MESSAGE_ID_PATTERN.test(value);
type AttributeRule = (value: string) => boolean;

// Elements and attributes an export of rendered chat bodies contains, recorded from the example and ui-test chats
// with the default config and with config.test, which adds data-testid.
const EXPORT_ALLOWED_COMMON_ATTRIBUTES: Record<string, AttributeRule> = {
  class: value => EXPORT_CLASS_PATTERN.test(value),
  'render-index': isNumber,
  index: isNumber,
};
const EXPORT_ALLOWED_ELEMENTS: Record<string, Record<string, AttributeRule>> = {
  a: { href: isExportableLink, target: value => value === '_blank' },
  blockquote: {},
  br: {},
  button: { tabindex: isNumber, title: isAny, 'data-testid': isTestId },
  code: { 'data-highlighted': isAny },
  del: {},
  div: { messageid: isMessageId, style: value => !EXPORT_STYLE_RESOURCE_PATTERN.test(value), 'data-testid': isTestId },
  em: {},
  h1: {},
  h2: {},
  h3: {},
  h4: {},
  h5: {},
  h6: {},
  hr: {},
  i: {},
  input: { type: value => value === 'checkbox', disabled: isAny, checked: isAny },
  li: {},
  ol: { start: isNumber },
  p: {},
  pre: { 'data-testid': isTestId },
  span: { 'data-testid': isTestId },
  strong: {},
  style: { type: value => value === 'text/css' },
  table: {},
  tbody: {},
  td: { align: value => [ 'left', 'center', 'right' ].includes(value) },
  th: { align: value => [ 'left', 'center', 'right' ].includes(value) },
  thead: {},
  tr: {},
  ul: {},
};

// Own entries only, so names such as constructor do not match inherited object properties.
const getOwn = <T>(record: Record<string, T>, key: string): T | undefined => Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

const isWhitespaceText = (node: Node): boolean => node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? '').trim() === '';

const isAllowedBodyElement = (element: Element): boolean => {
  const allowedAttributes = getOwn(EXPORT_ALLOWED_ELEMENTS, element.localName);
  if (element.namespaceURI !== EXPORT_HTML_NAMESPACE || allowedAttributes == null) {
    return false;
  }
  // Style text without a tag opener reads the same in parsers that disagree on where style elements hold text.
  if (element.localName === 'style' && EXPORT_TAG_OPENER_PATTERN.test(element.textContent ?? '')) {
    return false;
  }
  return Array.from(element.attributes).every(attribute => {
    const rule = getOwn(allowedAttributes, attribute.name) ?? getOwn(EXPORT_ALLOWED_COMMON_ATTRIBUTES, attribute.name);
    return attribute.namespaceURI == null && rule != null && rule(attribute.value);
  });
};

const isAllowedHead = (head: HTMLHeadElement, styles: string): boolean => {
  const [ charset, policy, style, ...rest ] = Array.from(head.childNodes).filter(node => !isWhitespaceText(node)) as Element[];
  // The parser normalizes line breaks and replaces NUL characters in the style text.
  const expectedStyleText = `\n          ${styles}\n        `.replace(/\r\n?/g, '\n').replace(/\0/g, '\uFFFD');
  return rest.length === 0 &&
    charset?.localName === 'meta' && charset.attributes.length === 1 && charset.getAttribute('charset') === 'utf-8' &&
    policy?.localName === 'meta' && policy.attributes.length === 2 &&
    policy.getAttribute('http-equiv') === 'Content-Security-Policy' && policy.getAttribute('content') === EXPORT_CONTENT_SECURITY_POLICY &&
    style?.localName === 'style' && style.attributes.length === 0 && style.childNodes.length === 1 && style.textContent === expectedStyleText;
};

/**
 * Parses the exact export string the way a browser parses the saved file and checks that it only
 * contains what a legitimate export contains.
 */
const isAllowedExport = (exportDocument: string, styles: string): boolean => {
  const parsed = new DOMParser().parseFromString(exportDocument, 'text/html');
  const html = parsed.documentElement;
  if (
    parsed.childNodes.length !== 1 ||
    html.attributes.length > 0 ||
    parsed.body.attributes.length > 0 ||
    Array.from(html.childNodes).some(node => node !== parsed.head && node !== parsed.body && !isWhitespaceText(node)) ||
    !isAllowedHead(parsed.head, styles)
  ) {
    return false;
  }
  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_ALL);
  while (walker.nextNode() != null) {
    const node = walker.currentNode;
    if (node.nodeType !== Node.TEXT_NODE && !(node.nodeType === Node.ELEMENT_NODE && isAllowedBodyElement(node as Element))) {
      return false;
    }
  }
  return true;
};

const getTextOnlyCards = (chatItems: ChatItem[]): string => chatItems
  .map(chatItem => `<div class="mynah-chat-item-card"><div style="white-space: pre-wrap;">${escapeHTML(chatItem.body ?? '')}</div></div>`)
  .join('\n');

/**
 * Serialize all (non-empty) chat messages in a tab to an HTML string
 * @param tabId Corresponding tab ID.
 * @returns The bodies of chat cards in HTML format
 */
export const serializeHtml = (tabId: string): string => {
  const chatItems = (MynahUITabsStore.getInstance().getTabDataStore(tabId).getValue('chatItems') as ChatItem[]).filter((chatItem): chatItem is ChatItem =>
    chatItem?.body != null && chatItem.body.trim() !== ''
  );
  const chatItemCardDivs = chatItems.map(chatItem => {
    const card = new ChatItemCard({
      chatItem: {
        type: chatItem.type,
        body: chatItem.body,
        messageId: chatItem.messageId,
        status: chatItem.status,
        icon: chatItem.icon
      },
      tabId,
    }).render;
    cleanForExport(card);
    return card.outerHTML;
  }).join('\n');

  // Get all relevant styles from the document
  const styleSheets = Array.from(document.styleSheets);
  const relevantStyles = escapeStyleEnd(styleSheets
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => {
            let ruleText = rule.cssText;

            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText === '.mynah-chat-wrapper') {
                ruleText = `.mynah-chat-wrapper { visibility: visible !important; position: relative !important; left: initial !important; opacity: 1 !important; ${rule.style.cssText} }`;
              }
              if (rule.selectorText.includes('.mynah-chat-item-card')) {
                ruleText = rule.cssText.replace('opacity: 0', 'opacity: 1').replace('transform: translate3d(0px, min(30%, 10vh), 0px) scale(0.99)', 'transform: none');
              }
              if (rule.selectorText.includes('.mynah-syntax-highlighter-copy-buttons')) {
                ruleText = rule.cssText.replace('display: flex', 'display: none');
              }
            }

            return ruleText;
          })
          .join('\n');
      } catch (e) {
        console.warn('Could not read stylesheet rules', e);
        return '';
      }
    })
    .join('\n'));

  const head = getExportHead(relevantStyles);
  const exportDocument = getExportDocument(head, getExportBody(chatItemCardDivs));
  if (isAllowedExport(exportDocument, relevantStyles)) {
    return exportDocument;
  }
  // The cleaned cards parse into something a legitimate export does not contain, so only the message text is exported.
  const textOnlyDocument = getExportDocument(head, getExportBody(getTextOnlyCards(chatItems)));
  // That document is fixed markup around escaped text; failing the check means it cannot be trusted either.
  if (!isAllowedExport(textOnlyDocument, relevantStyles)) {
    throw new Error('Could not build a self-contained chat export');
  }
  return textOnlyDocument;
};
