/* eslint-disable @typescript-eslint/no-extraneous-class */
/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DomBuilder } from '../../helper/dom';
import { CustomIcon, MynahIcons } from '../icon';
// ICONS
import Q from './icons/q.svg';
import DOT from './icons/dot.svg';
import AT from './icons/at.svg';
import MENU from './icons/menu.svg';
import MINUS from './icons/minus.svg';
import MINUS_CIRCLE from './icons/minus-circled.svg';
import SEARCH from './icons/search.svg';
import PLUS from './icons/plus.svg';
import PAPER_CLIP from './icons/paper-clip.svg';
import LIST_ADD from './icons/list-add.svg';
import TABS from './icons/tabs.svg';
import PENCIL from './icons/pencil.svg';
import FOLDER from './icons/folder.svg';
import FILE from './icons/file.svg';
import FLASH from './icons/flash.svg';
import CHAT from './icons/chat.svg';
import COMMENT from './icons/comment.svg';
import LINK from './icons/link.svg';
import DOC from './icons/doc.svg';
import EXTERNAL from './icons/external.svg';
import CANCEL from './icons/cancel.svg';
import CANCEL_CIRCLE from './icons/cancel-circle.svg';
import CALENDAR from './icons/calendar.svg';
import MEGAPHONE from './icons/megaphone.svg';
import MAGIC from './icons/magic.svg';
import NOTIFICATION from './icons/notification.svg';
import EYE from './icons/eye.svg';
import ELLIPSIS from './icons/ellipsis.svg';
import ELLIPSIS_H from './icons/ellipsis-h.svg';
import OK from './icons/ok.svg';
import UP_OPEN from './icons/up-open.svg';
import DOWN_OPEN from './icons/down-open.svg';
import RIGHT_OPEN from './icons/right-open.svg';
import LEFT_OPEN from './icons/left-open.svg';
import RESIZE_FULL from './icons/resize-full.svg';
import RESIZE_SMALL from './icons/resize-small.svg';
import BLOCK from './icons/block.svg';
import OK_CIRCLED from './icons/ok-circled.svg';
import INFO from './icons/info.svg';
import WARNING from './icons/warning.svg';
import ERROR from './icons/error.svg';
import THUMBS_UP from './icons/thumbs-up.svg';
import THUMBS_DOWN from './icons/thumbs-down.svg';
import PIN from './icons/pin.svg';
import STAR from './icons/star.svg';
import STACK from './icons/stack.svg';
import LIGHT_BULB from './icons/light-bulb.svg';
import ENVELOPE_SEND from './icons/envelope-send.svg';
import ENTER from './icons/enter.svg';
import REFRESH from './icons/refresh.svg';
import PROGRESS from './icons/progress.svg';
import SCROLL_DOWN from './icons/scroll-down.svg';
import USER from './icons/user.svg';
import PLAY from './icons/play.svg';
import PAUSE from './icons/pause.svg';
import STOP from './icons/stop.svg';
import CODE_BLOCK from './icons/code-block.svg';
import COPY from './icons/copy.svg';
import CURSOR_INSERT from './icons/cursor-insert.svg';
import TEXT_SELECT from './icons/text-select.svg';
import TOOLS from './icons/tools.svg';
import REVERT from './icons/revert.svg';
import UNDO from './icons/undo.svg';
import ROCKET from './icons/rocket.svg';
import ASTERISK from './icons/asterisk.svg';
import BUG from './icons/bug.svg';
import CHECK_LIST from './icons/check-list.svg';
import DEPLOY from './icons/deploy.svg';
import SHELL from './icons/shell.svg';
import HELP from './icons/help.svg';
import HISTORY from './icons/history.svg';
import MESSAGE from './icons/message.svg';
import MCP from './icons/mcp.svg';
import TRASH from './icons/trash.svg';
import TRANSFORM from './icons/transform.svg';
import IMAGE from './icons/image.svg';
import DESKTOP from './icons/desktop.svg';
import GLOBE from './icons/globe.svg';

// Custom icon values are written into a stylesheet as-is, so a name must be a plain
// identifier and the image must be an image data URL made only of URL characters.
const CUSTOM_ICON_NAME = /^[A-Za-z0-9_-]+$/;
const CUSTOM_ICON_IMAGE = /^data:image\/[\w\-.~:/?#[\]@!$&+,;=%]+$/i;
const SUBTRACT_SUFFIX = '-subtract';

let builtInIconNames: Set<string> | undefined;
// A custom icon shares its rule names with the built-in icons, so it cannot use one of theirs.
// Compared in lower case, as class selectors match case-insensitively in quirks mode.
const isBuiltInIconName = (name: string): boolean => {
  if (builtInIconNames === undefined) {
    builtInIconNames = new Set([ ...Object.keys(MynahIcons), ...Object.values(MynahIcons) ].map(builtIn => builtIn.toLowerCase()));
  }
  const lowerName = name.toLowerCase();
  const withoutSuffix = lowerName.endsWith(SUBTRACT_SUFFIX) ? lowerName.slice(0, -SUBTRACT_SUFFIX.length) : lowerName;
  return builtInIconNames.has(lowerName) || builtInIconNames.has(withoutSuffix);
};

const CSS_SPACES = ' \t\n\r\f';
const trimSpaces = (value: string): string => {
  let start = 0;
  let end = value.length;
  while (start < end && CSS_SPACES.includes(value[start])) start++;
  while (end > start && CSS_SPACES.includes(value[end - 1])) end--;
  return value.slice(start, end);
};

type CheckedIcon = { accepted: true; name: string; image: string } | { accepted: false; label: string };

// Shown in the rejection warning: the shortened name, or the type of the name or of the value given
const getRejectedLabel = (value: unknown, name: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return value === null ? 'null' : typeof value;
  }
  return typeof name === 'string' ? JSON.stringify(name.slice(0, 40)) : typeof name;
};

// Returns the name and image as they are written into the stylesheet, or a label for the warning if the icon is not accepted.
// Each value is read once, so the value that is checked is the value that is written.
const checkIcon = (customIcon: unknown): CheckedIcon => {
  let name: unknown;
  let base64Svg: unknown;
  try {
    if (customIcon !== null && typeof customIcon === 'object') {
      ({ name, base64Svg } = customIcon as Partial<CustomIcon>);
    }
  } catch {
    // A getter or Proxy that throws is treated like a missing value
  }
  const rejected = { accepted: false as const, label: getRejectedLabel(customIcon, name) };
  if (typeof name !== 'string' || typeof base64Svg !== 'string' || !CUSTOM_ICON_NAME.test(name) || isBuiltInIconName(name)) {
    return rejected;
  }
  // Surrounding whitespace and one pair of quotes mean the same inside url(), so they are dropped
  let image = trimSpaces(base64Svg);
  if (image.length > 1 && (image[0] === '"' || image[0] === "'") && image[image.length - 1] === image[0]) {
    image = trimSpaces(image.slice(1, -1));
  }
  return CUSTOM_ICON_IMAGE.test(image) ? { accepted: true, name, image } : rejected;
};

// Hosts often rebuild icon objects on every render, so warnings are grouped by label, and the oldest label
// is forgotten past this many so the set stays small.
const MAX_REPORTED_LABELS = 100;

export class MynahUIIconImporter {
  private static instance: MynahUIIconImporter;
  private readonly customIcons: Map<string, string> = new Map();
  // Labels of rejected icons already reported, in the order they were first reported
  private readonly reportedLabels: Set<string> = new Set();
  private readonly portalId = 'mynah-ui-icons';
  private readonly defaultIconMappings = {
    Q,
    DOT,
    AT,
    MENU,
    MINUS,
    MINUS_CIRCLE,
    SEARCH,
    PLUS,
    PAPER_CLIP,
    LIST_ADD,
    FOLDER,
    FILE,
    FLASH,
    TABS,
    PENCIL,
    CHAT,
    LINK,
    DOC,
    EXTERNAL,
    CANCEL,
    CANCEL_CIRCLE,
    CALENDAR,
    COMMENT,
    MEGAPHONE,
    MAGIC,
    NOTIFICATION,
    EYE,
    ELLIPSIS,
    ELLIPSIS_H,
    OK,
    UP_OPEN,
    DOWN_OPEN,
    RIGHT_OPEN,
    LEFT_OPEN,
    RESIZE_FULL,
    RESIZE_SMALL,
    BLOCK,
    OK_CIRCLED,
    INFO,
    WARNING,
    ERROR,
    THUMBS_UP,
    THUMBS_DOWN,
    STAR,
    STACK,
    LIGHT_BULB,
    ENVELOPE_SEND,
    ENTER,
    REFRESH,
    PROGRESS,
    SCROLL_DOWN,
    USER,
    PLAY,
    PAUSE,
    STOP,
    CODE_BLOCK,
    COPY,
    CURSOR_INSERT,
    TEXT_SELECT,
    TOOLS,
    REVERT,
    UNDO,
    ROCKET,
    ASTERISK,
    BUG,
    CHECK_LIST,
    DEPLOY,
    SHELL,
    HELP,
    MESSAGE,
    MCP,
    TRASH,
    TRANSFORM,
    HISTORY,
    IMAGE,
    PIN,
    DESKTOP,
    GLOBE
  };

  private constructor () {
    this.initializeDefaultIcons();
  }

  private cleanupExistingPortal (): void {
    const existingPortal = document.getElementById(this.portalId);
    if (existingPortal != null) {
      existingPortal.remove();
    }
  }

  private initializeDefaultIcons (): void {
    this.createIconStyles(this.defaultIconMappings);
  }

  /**
   * Registers a custom icon and returns the name it was registered under, or undefined if its name or image is not accepted.
   */
  public addCustomIcon (customIcon: CustomIcon): string | undefined {
    const checked = checkIcon(customIcon);
    if (!checked.accepted) {
      if (!this.reportedLabels.has(checked.label)) {
        if (this.reportedLabels.size >= MAX_REPORTED_LABELS) {
          this.reportedLabels.delete(this.reportedLabels.values().next().value as string);
        }
        this.reportedLabels.add(checked.label);
        console.warn(`Custom icon ${checked.label} was not registered: its name or image is not in the accepted format`);
      }
      return undefined;
    }

    const { name, image } = checked;
    // If icon already exists with same content, no need to proceed
    if (this.customIcons.get(name) === image) {
      return name;
    }

    this.customIcons.set(name, image);

    // Recreate all styles including both default and custom icons
    this.cleanupExistingPortal();
    this.createIconStyles({
      ...this.defaultIconMappings,
      ...Object.fromEntries(this.customIcons)
    });
    return name;
  }

  private createIconStyles (iconMappings: Record<string, string>): void {
    DomBuilder.getInstance().createPortal('mynah-ui-icons', {
      type: 'style',
      attributes: {
        type: 'text/css'
      },
      children: [ `
        ${Object.keys(iconMappings).map(iconKey => {
          // Own keys only, so a custom name such as 'constructor' is not resolved to an inherited member
          const iconName = Object.prototype.hasOwnProperty.call(MynahIcons, iconKey) ? MynahIcons[iconKey as keyof typeof MynahIcons] : iconKey;
          return `
          :root{
            --mynah-ui-icon-${iconName}: url(${iconMappings[iconKey]});
          }
          .mynah-ui-icon-${iconName} {
            -webkit-mask-image: var(--mynah-ui-icon-${iconName});
            mask-image: var(--mynah-ui-icon-${iconName});
          }
          .mynah-ui-icon-${iconName}-subtract {
            -webkit-mask-image: linear-gradient(#000000, #000000), var(--mynah-ui-icon-${iconName});
            mask-image: linear-gradient(#000000, #000000), var(--mynah-ui-icon-${iconName});
            mask-composite: subtract;
          }`;
        }).join('')}
      ` ]
    }, 'beforebegin');
  }

  public static getInstance = (): MynahUIIconImporter => {
    if (MynahUIIconImporter.instance === undefined) {
      MynahUIIconImporter.instance = new MynahUIIconImporter();
    }

    return MynahUIIconImporter.instance;
  };
}
