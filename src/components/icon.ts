/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DomBuilder, ExtendedHTMLElement } from '../helper/dom';
import { StyleLoader } from '../helper/style-loader';
import { MynahUIIconImporter } from './icon/icon-importer';
import '../styles/components/_icon.scss';
import { Status } from '../static';

export enum MynahIcons {
  Q = 'q',
  AT = 'at',
  MENU = 'menu',
  MINUS = 'minus',
  MINUS_CIRCLE = 'minus-circled',
  SEARCH = 'search',
  PLUS = 'plus',
  PAPER_CLIP = 'paper-clip',
  PIN = 'pin',
  LIST_ADD = 'list-add',
  TABS = 'tabs',
  CHAT = 'chat',
  LINK = 'link',
  FOLDER = 'folder',
  FILE = 'file',
  FLASH = 'flash',
  DOC = 'doc',
  DOT = 'dot',
  EXTERNAL = 'external',
  CANCEL = 'cancel',
  CANCEL_CIRCLE = 'cancel-circle',
  CALENDAR = 'calendar',
  COMMENT = 'comment',
  MEGAPHONE = 'megaphone',
  MAGIC = 'magic',
  NOTIFICATION = 'notification',
  EYE = 'eye',
  ELLIPSIS = 'ellipsis',
  ELLIPSIS_H = 'ellipsis-h',
  OK = 'ok',
  UP_OPEN = 'up-open',
  DOWN_OPEN = 'down-open',
  RIGHT_OPEN = 'right-open',
  LEFT_OPEN = 'left-open',
  RESIZE_FULL = 'resize-full',
  RESIZE_SMALL = 'resize-small',
  BLOCK = 'block',
  OK_CIRCLED = 'ok-circled',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  THUMBS_UP = 'thumbs-up',
  THUMBS_DOWN = 'thumbs-down',
  STAR = 'star',
  STACK = 'stack',
  LIGHT_BULB = 'light-bulb',
  ENVELOPE_SEND = 'envelope-send',
  ENTER = 'enter',
  REFRESH = 'refresh',
  PROGRESS = 'progress',
  SCROLL_DOWN = 'scroll-down',
  USER = 'user',
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
  PENCIL = 'pencil',
  CODE_BLOCK = 'code-block',
  COPY = 'copy',
  CURSOR_INSERT = 'cursor-insert',
  TEXT_SELECT = 'text-select',
  TOOLS = 'tools',
  REVERT = 'revert',
  UNDO = 'undo',
  ROCKET = 'rocket',
  ASTERISK = 'asterisk',
  BUG = 'bug',
  CHECK_LIST = 'check-list',
  DEPLOY = 'deploy',
  SHELL = 'shell',
  HELP = 'help',
  MESSAGE = 'message',
  MCP = 'mcp',
  TRASH = 'trash',
  TRANSFORM = 'transform',
  HISTORY = 'history',
  IMAGE = 'image',
  DESKTOP = 'desktop',
  GLOBE = 'globe'
}

export interface CustomIcon {
  /**
   * Letters, digits, `_` and `-` only, and not the name of a built-in icon. An icon that is not accepted renders without an image.
   */
  name: string;
  /**
   * An image data URL (`data:image/...`), base64 or percent-encoded, without spaces, quotes or parentheses inside.
   */
  base64Svg: string;
}

export type MynahIconsType = `${MynahIcons}`;

export interface IconProps {
  icon: MynahIcons | MynahIconsType | CustomIcon;
  subtract?: boolean;
  classNames?: string[];
  status?: Status;
}
export class Icon {
  render: ExtendedHTMLElement;
  props: IconProps;
  // The name in the element's class, kept so update() removes that class without reading the icon again
  private iconName: string;
  constructor (props: IconProps) {
    this.props = props;
    StyleLoader.getInstance().load('components/_icon.scss');
    MynahUIIconImporter.getInstance();

    // Determine if the icon is a custom icon or a predefined one
    const iconName = this.getIconName();
    this.iconName = iconName;

    this.render = DomBuilder.getInstance().build({
      type: 'i',
      classNames: [
        'mynah-ui-icon',
                `mynah-ui-icon-${iconName}${props.subtract === true ? '-subtract' : ''}`,
                ...(props.status !== undefined ? [ `status-${props.status}` ] : []),
                ...(props.classNames !== undefined ? props.classNames : []),
      ]
    });
  }

  private readonly getIconName = (): string => {
    // A custom icon gets the name the importer checked and registered, so a name read again cannot differ from its rule.
    // An icon the importer does not accept has no style rule, so it gets no name either
    if (this.isCustomIcon(this.props.icon)) {
      return MynahUIIconImporter.getInstance().addCustomIcon(this.props.icon) ?? '';
    }

    return this.props.icon;
  };

  // Anything other than a built-in icon name goes to the importer, which rejects values that are not icon objects
  private isCustomIcon (icon: MynahIcons | MynahIconsType | CustomIcon): icon is CustomIcon {
    return typeof icon !== 'string';
  }

  public update = (icon: MynahIcons | MynahIconsType | CustomIcon): void => {
    this.render.removeClass(`mynah-ui-icon-${this.iconName}${this.props.subtract === true ? '-subtract' : ''}`);

    this.props.icon = icon;
    const newIconName = this.getIconName();
    this.iconName = newIconName;
    this.render.addClass(`mynah-ui-icon-${newIconName}${this.props.subtract === true ? '-subtract' : ''}`);
  };
}
