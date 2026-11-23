import escapeHTML from 'escape-html';
import unescapeHTML from 'unescape-html';
import { DetailedListItem, DetailedListItemGroup, QuickActionCommand, QuickActionCommandGroup } from '../static';
import { MynahIcons } from '../main';

/**
 * Maximum number of filter results returned for display.
 * Caps the output to avoid massive DOM rebuilds and sort overhead
 * when filtering large context command lists (e.g., 100k+ items in large repos).
 */
const MAX_FILTER_RESULTS = 1000;

export const filterQuickPickItems = (commands: QuickActionCommandGroup[], searchTerm: string, hideSearchGroup?: boolean): QuickActionCommandGroup[] => {
  if (searchTerm.trim() === '') {
    return commands;
  }

  const matchedCommands: Array<{score: number; command: QuickActionCommand}> = [];

  const findMatches = (cmd: QuickActionCommand): void => {
    if (matchedCommands.length >= MAX_FILTER_RESULTS) return;

    const score = calculateItemScore(cmd.command, searchTerm);
    if (score > 0) {
      matchedCommands.push({
        score,
        command: {
          ...cmd,
          command: highlightMatch(cmd.command, searchTerm)
        }
      });
    }

    if (matchedCommands.length < MAX_FILTER_RESULTS) {
      cmd.children?.forEach(childGroup => {
        if (matchedCommands.length >= MAX_FILTER_RESULTS) return;
        childGroup.commands.forEach(childCmd => {
          if (matchedCommands.length >= MAX_FILTER_RESULTS) return;
          findMatches(childCmd);
        });
      });
    }
  };

  for (const group of commands) {
    if (matchedCommands.length >= MAX_FILTER_RESULTS) break;
    for (const cmd of group.commands) {
      if (matchedCommands.length >= MAX_FILTER_RESULTS) break;
      findMatches(cmd);
    }
  }

  const returnGroup: QuickActionCommandGroup = {
    icon: MynahIcons.SEARCH,
    commands: []
  };
  if (matchedCommands.length > 0) {
    returnGroup.commands = matchedCommands.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((item) => item.command);
  }
  if (hideSearchGroup !== true) { returnGroup.groupName = `### ${searchTerm}: (${returnGroup.commands.length})`; }
  return [ returnGroup ];
};

// Search highlight markers. Private-use characters rather than HTML, so a command name that
// contains the text <mark> is not treated as a highlight; they become <mark> tags only when the
// list item title is built.
export const MARK_OPEN = '\uE000';
export const MARK_CLOSE = '\uE001';

const HIGHLIGHT_TAGS = /<\/?mark>/g;
const TITLE_SPECIAL_CHARS = new RegExp(`[&<>"'${MARK_OPEN}${MARK_CLOSE}]`);

/**
 * Builds the list item title, which is rendered as HTML, from a plain-text command that may
 * contain search highlight markers.
 */
const toQuickPickTitle = (command: string): string =>
  command == null || !TITLE_SPECIAL_CHARS.test(command)
    ? command
    : escapeHTML(command).split(MARK_OPEN).join('<mark>').split(MARK_CLOSE).join('</mark>');

/**
 * Inverse of toQuickPickTitle: recovers the plain-text command from a list item title, so a
 * selection carries the original name rather than its HTML form.
 */
const fromQuickPickTitle = (title: string): string => unescapeHTML(title.replace(HIGHLIGHT_TAGS, ''));

const highlightMatch = (text: string, searchTerm: string): string => {
  const textToCompare = text.toLowerCase();
  const searchTermToCompare = searchTerm.toLowerCase();

  // Exact
  if (textToCompare === searchTermToCompare) {
    return `${MARK_OPEN}${text}${MARK_CLOSE}`;
  }

  // Prefix
  if (textToCompare.startsWith(searchTermToCompare)) {
    const matchLength = searchTerm.length;
    const matchedPart = text.slice(0, matchLength);
    const restPart = text.slice(matchLength);
    return `${MARK_OPEN}${matchedPart}${MARK_CLOSE}${restPart}`;
  }

  // Contains
  const startIndex = textToCompare.indexOf(searchTermToCompare);
  if (startIndex !== -1) {
    const before = text.slice(0, startIndex);
    const match = text.slice(startIndex, startIndex + searchTerm.length);
    const after = text.slice(startIndex + searchTerm.length);
    return `${before}${MARK_OPEN}${match}${MARK_CLOSE}${after}`;
  }

  // Words
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (word.includes(searchTermToCompare)) {
      const startIdx = word.indexOf(searchTermToCompare);
      const originalWord = words[i];
      words[i] =
              originalWord.slice(0, startIdx) +
              `${MARK_OPEN}${originalWord.slice(startIdx, startIdx + searchTerm.length)}${MARK_CLOSE}` +
              originalWord.slice(startIdx + searchTerm.length);
      return words.join(' ');
    }
  }

  // Partial
  let result = '';
  let lastIndex = 0;
  let termIndex = 0;

  for (let i = 0; i < text.length && termIndex < searchTerm.length; i++) {
    if (text[i].toLowerCase() === searchTerm[termIndex].toLowerCase()) {
      result += text.slice(lastIndex, i);
      result += `${MARK_OPEN}${text[i]}${MARK_CLOSE}`;
      lastIndex = i + 1;
      termIndex++;
    }
  }
  result += text.slice(lastIndex);

  return termIndex === searchTerm.length ? result : text;
};

const calculateItemScore = (text: string, searchTerm: string): number => {
  const normalizedText = text.toLowerCase();
  const normalizedTerm = searchTerm.toLowerCase();

  const isExactMatch = normalizedText === normalizedTerm;
  const isPrefixMatch = normalizedText.startsWith(normalizedTerm);
  const isWordStartMatch = normalizedText.split(' ').some(word => word.startsWith(normalizedTerm));
  const isContainsMatch = normalizedText.includes(normalizedTerm);

  if (isExactMatch) return 100;
  if (isPrefixMatch) return 80;
  if (isWordStartMatch) return 60;
  if (isContainsMatch) return 40;

  return 0;
};

export const convertDetailedListGroupsToQuickActionCommandGroups = (detailedListItemGroups: DetailedListItemGroup[]): QuickActionCommandGroup[] => {
  return detailedListItemGroups.map(detailedListItemGroup => ({
    commands: detailedListItemGroup.children?.map(detailedListItem => convertDetailedListItemToQuickActionCommand(detailedListItem)) as QuickActionCommand[],
    actions: detailedListItemGroup.actions,
    groupName: detailedListItemGroup.groupName,
    icon: detailedListItemGroup.icon
  }));
};

export const convertDetailedListItemToQuickActionCommand = (detailedListItem: DetailedListItem): QuickActionCommand => {
  return {
    command: fromQuickPickTitle(detailedListItem.title ?? ''),
    label: detailedListItem.name,
    ...(detailedListItem.children != null ? { children: convertDetailedListGroupsToQuickActionCommandGroups(detailedListItem.children) } : {}),
    description: detailedListItem.description,
    disabled: detailedListItem.disabled,
    icon: detailedListItem.icon,
    id: detailedListItem.id,
    placeholder: detailedListItem.followupText,
    route: detailedListItem.keywords,
  };
};

export const convertQuickActionCommandGroupsToDetailedListGroups = (quickActionCommandGroup: QuickActionCommandGroup[]): DetailedListItemGroup[] => {
  return quickActionCommandGroup.map(quickActionCommandGroup => ({
    children: quickActionCommandGroup.commands?.map(quickActionCommand => convertQuickActionCommandToDetailedListItem(quickActionCommand)),
    actions: quickActionCommandGroup.actions,
    groupName: quickActionCommandGroup.groupName,
    icon: quickActionCommandGroup.icon
  }));
};

export const convertQuickActionCommandToDetailedListItem = (quickActionCommand: QuickActionCommand): DetailedListItem => {
  return {
    title: toQuickPickTitle(quickActionCommand.command),
    name: quickActionCommand.label,
    followupText: quickActionCommand.placeholder,
    ...(quickActionCommand.children != null ? { children: convertQuickActionCommandGroupsToDetailedListGroups(quickActionCommand.children) } : {}),
    description: quickActionCommand.description,
    disabled: quickActionCommand.disabled,
    icon: quickActionCommand.icon,
    id: quickActionCommand.id,
    keywords: quickActionCommand.route,
    disabledText: quickActionCommand.disabledText
  };
};

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
};
