/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  convertDetailedListItemToQuickActionCommand,
  convertQuickActionCommandGroupsToDetailedListGroups,
  convertQuickActionCommandToDetailedListItem,
  filterQuickPickItems,
} from '../quick-pick-data-handler';
import { DetailedListItemWrapper } from '../../components/detailed-list/detailed-list-item';
import { QuickActionCommand, QuickActionCommandGroup } from '../../static';

const markupNames = [
  '<b>bold</b>.md',
  '<i class="x">italic</i>.ts',
  '<span title="t">span</span>.ts',
  '<a href="#">link</a>.md',
];

const textNames = [
  "R&D's <notes>.md",
  'a&amp;b.md',
  'quote"name.md',
  '1 < 2 > 0.ts',
  '<mark>literal.md',
  'plain-file.ts',
  'folder/sub dir/file name.ts',
];

const renderTitle = (title: string): HTMLElement => {
  const item = new DetailedListItemWrapper({ listItem: { title } });
  return item.render.querySelector('.mynah-detailed-list-item-name') as HTMLElement;
};

const group = (commands: QuickActionCommand[]): QuickActionCommandGroup[] => [ { commands } ];

describe('quick pick item titles', () => {
  it.each([ ...markupNames, ...textNames ])('shows %s as text in the unfiltered list', (name) => {
    const title = convertQuickActionCommandToDetailedListItem({ command: name }).title as string;
    const rendered = renderTitle(title);

    expect(rendered.children).toHaveLength(0);
    expect(rendered.textContent).toBe(name);
  });

  it.each([ ...markupNames, ...textNames ])('shows %s as text with highlights in search results', (name) => {
    const [ results ] = filterQuickPickItems(group([ { command: name } ]), name.slice(0, 3));
    const title = convertQuickActionCommandToDetailedListItem(results.commands[0]).title as string;
    const rendered = renderTitle(title);

    expect(rendered.textContent).toBe(name);
    expect(rendered.querySelectorAll('mark').length).toBeGreaterThan(0);
    expect(rendered.querySelectorAll(':not(mark)')).toHaveLength(0);
  });

  it('keeps plain names unchanged', () => {
    expect(convertQuickActionCommandToDetailedListItem({ command: 'src/index.ts' }).title).toBe('src/index.ts');
    expect(convertQuickActionCommandToDetailedListItem({ command: '/help' }).title).toBe('/help');
  });

  it('highlights matched characters without splitting escaped characters', () => {
    const [ results ] = filterQuickPickItems(group([ { command: 'R&D.md' } ]), 'r&d');
    const title = convertQuickActionCommandToDetailedListItem(results.commands[0]).title;

    expect(title).toBe('<mark>R&amp;D</mark>.md');
  });

  it('keeps search matching on the original name', () => {
    const [ results ] = filterQuickPickItems(group([ { command: 'R&D.md' }, { command: 'other.md' } ]), '&');

    expect(results.commands).toHaveLength(1);
  });

  it('leaves descriptions to the markdown renderer', () => {
    const item = convertQuickActionCommandToDetailedListItem({ command: 'a.md', description: 'ws/<b>a</b>.md' });

    expect(item.description).toBe('ws/<b>a</b>.md');
  });
});

describe('quick pick selection', () => {
  it.each([ ...markupNames, ...textNames ])('returns the original name %s from the unfiltered list', (name) => {
    const item = convertQuickActionCommandToDetailedListItem({ command: name, id: 'f1', route: [ '/ws', name ] });
    const selected = convertDetailedListItemToQuickActionCommand(item);

    expect(selected.command).toBe(name);
    expect(selected.id).toBe('f1');
    expect(selected.route).toEqual([ '/ws', name ]);
  });

  it.each([ ...markupNames, ...textNames ])('returns the original name %s from search results', (name) => {
    const [ results ] = filterQuickPickItems(group([ { command: name } ]), name.slice(0, 3));
    const selected = convertDetailedListItemToQuickActionCommand(convertQuickActionCommandToDetailedListItem(results.commands[0]));

    expect(selected.command).toBe(name);
  });

  it('returns original names for nested children', () => {
    const [ listGroup ] = convertQuickActionCommandGroupsToDetailedListGroups(group([
      { command: 'Files', children: group([ { command: "R&D's <notes>.md" } ]) },
    ]));
    const selected = convertDetailedListItemToQuickActionCommand(listGroup.children?.[0] as any);

    expect(selected.command).toBe('Files');
    expect(selected.children?.[0].commands[0].command).toBe("R&D's <notes>.md");
  });

  it('keeps an item without a title empty', () => {
    expect(convertDetailedListItemToQuickActionCommand({ id: 'x' }).command).toBe('');
  });
});
