import { DomBuilder, ExtendedHTMLElement } from '../../helper/dom';
import testIds from '../../helper/test-ids';
import { ChatItemButton, DetailedList, DetailedListItem, DetailedListItemGroup } from '../../static';
import { CardBody } from '../card/card-body';
import { Icon } from '../icon';
import { ChatItemButtonsWrapper } from '../chat-item/chat-item-buttons';
import { DetailedListItemWrapper } from './detailed-list-item';
import { chunkArray } from '../../helper/quick-pick-data-handler';
import { ChatItemFormItemsWrapper } from '../chat-item/chat-item-form-items';
import { TitleDescriptionWithIcon } from '../title-description-with-icon';
import { generateUID } from '../../main';
import { Card } from '../card/card';
import { cancelEvent } from '../../helper/events';

export interface DetailedListWrapperProps {
  detailedList: DetailedList;
  descriptionTextDirection?: 'ltr' | 'rtl';
  onFilterValueChange?: (filterValues: Record<string, any>, isValid: boolean) => void;
  onGroupActionClick?: (action: ChatItemButton, groupName?: string) => void;
  onGroupClick?: (groupName: string) => void;
  onItemSelect?: (detailedListItem: DetailedListItem) => void;
  onItemClick?: (detailedListItem: DetailedListItem) => void;
  onItemActionClick?: (action: ChatItemButton, detailedListItem?: DetailedListItem) => void;
  onFilterActionClick?: (action: ChatItemButton, filterValues?: Record<string, any>, isValid?: boolean) => void;
}

export class DetailedListWrapper {
  render: ExtendedHTMLElement;
  private readonly detailedListItemGroupsContainer: ExtendedHTMLElement;
  private filterForm: ChatItemFormItemsWrapper;
  private readonly filtersContainer: ExtendedHTMLElement;
  private readonly filterActionsContainer: ExtendedHTMLElement;
  private readonly headerContainer: ExtendedHTMLElement;
  private readonly props: DetailedListWrapperProps;
  private detailedListItemsBlockData: Array<{
    data: DetailedListItem[];
    element: ExtendedHTMLElement;
  }> = [];

  private activeTargetElementIndex: number = -1;
  private allSelectableDetailedListElements: DetailedListItemWrapper[] = [];
  constructor (props: DetailedListWrapperProps) {
    this.props = props;
    this.headerContainer = DomBuilder.getInstance().build({
      type: 'div',
      classNames: [ 'mynah-detailed-list-header-wrapper' ],
      children: this.getHeader()
    });
    this.filtersContainer = DomBuilder.getInstance().build({
      type: 'div',
      classNames: [ 'mynah-detailed-list-filters-wrapper' ],
      children: this.getFilters()
    });
    this.filterActionsContainer = DomBuilder.getInstance().build({
      type: 'div',
      classNames: [ 'mynah-detailed-list-filter-actions-wrapper' ],
      children: this.getFilterActions()
    });
    this.detailedListItemGroupsContainer = DomBuilder.getInstance().build({
      type: 'div',
      classNames: [ 'mynah-detailed-list-item-groups-wrapper' ],
      children: this.getDetailedListItemGroups(),
      events: {
        scroll: this.handleScroll
      }
    });

    this.render = DomBuilder.getInstance().build({
      type: 'div',
      testId: testIds.prompt.quickPicksWrapper,
      classNames: [ 'mynah-detailed-list' ],
      children: [
        this.headerContainer,
        this.filtersContainer,
        this.detailedListItemGroupsContainer,
        this.filterActionsContainer
      ]
    });

    // Eagerly load buffer blocks adjacent to the viewport after the first
    // block is rendered, so the user doesn't see empty space while scrolling.
    requestAnimationFrame(() => this.handleScroll());
  }

  /**
   * Handles scroll events to implement virtualization for the detailed list:
   *
   * 1. Initially creating empty placeholder blocks with appropriate height for each chunk of list items
   * 2. On scroll, determining which blocks are visible in the viewport (or near it)
   * 3. Dynamically rendering content only for visible blocks by:
   *    - Adding DOM elements for blocks entering the viewport
   *    - Removing DOM elements for blocks that are no longer visible
   *
   */
  private readonly handleScroll = (): void => {
    const wrapperRect = this.detailedListItemGroupsContainer.getBoundingClientRect();
    if (wrapperRect.height === 0) return; // Not laid out yet — skip
    const buffer = wrapperRect.height;

    this.detailedListItemsBlockData.forEach(itemsBlock => {
      // offsetTop is relative to an offset parent (e.g. the sheet), not the
      // scrolling list. Compare both rectangles in viewport coordinates so a
      // short list below a sheet header is not mistaken for offscreen content.
      const itemBlockRect = itemsBlock.element.getBoundingClientRect();
      const hasChildren = itemsBlock.element.childNodes.length > 0;

      const isVisible = (itemBlockRect.top < wrapperRect.bottom + buffer) &&
        (itemBlockRect.bottom > wrapperRect.top - buffer);

      if (!hasChildren && isVisible) {
        // Block is visible but not rendered yet - add DOM elements
        itemsBlock.element.update({
          children: this.getDetailedListItemElements(itemsBlock.data)
        });
      } else if (hasChildren && !isVisible) {
        // Block has children but is no longer visible - remove DOM elements
        itemsBlock.element.clear();
      }
    });
  };

  private readonly getHeader = (): Array<ExtendedHTMLElement | string> => {
    if (this.props.detailedList.header != null) {
      return [ new TitleDescriptionWithIcon({
        description: DomBuilder.getInstance().build({
          type: 'div',
          children: [
            this.props.detailedList.header.description ?? '',
            ...(this.props.detailedList.header.status != null
              ? [ new Card({
                  testId: testIds.sheet.description,
                  border: true,
                  padding: 'medium',
                  status: this.props.detailedList.header.status?.status,
                  children: [ new TitleDescriptionWithIcon({
                    description: this.props.detailedList.header.status?.description,
                    title: this.props.detailedList.header.status?.title,
                    icon: this.props.detailedList.header.status?.icon
                  }).render ],
                }).render ]
              : [])
          ]
        }),
        icon: this.props.detailedList.header.icon,
        title: this.props.detailedList.header.title,
      }).render ];
    }
    return [ '' ];
  };

  private readonly getFilters = (): Array<ExtendedHTMLElement | string> => {
    if (this.props.detailedList.filterOptions != null && this.props.detailedList.filterOptions.length > 0) {
      this.filterForm = new ChatItemFormItemsWrapper({
        tabId: '',
        chatItem: {
          formItems: this.props.detailedList.filterOptions
        },
        onFormChange: this.props.onFilterValueChange
      });
      return [ this.filterForm.render ];
    }
    return [ '' ];
  };

  private readonly getFilterActions = (): ExtendedHTMLElement[] => {
    return [ new ChatItemButtonsWrapper({
      onActionClick: (action) => {
        this.props.onFilterActionClick?.(action, this.filterForm?.getAllValues(), this.filterForm?.isFormValid());
      },
      buttons: this.props.detailedList.filterActions ?? [],
    }).render ];
  };

  private readonly getDetailedListItemGroups = (): Array<ExtendedHTMLElement | string> => {
    const groups = this.props.detailedList.list?.map((detailedListGroup: DetailedListItemGroup) => {
      return DomBuilder.getInstance().build({
        type: 'div',
        testId: testIds.prompt.quickPicksGroup,
        classNames: [ 'mynah-detailed-list-group' ],
        children: [
          ...(detailedListGroup.groupName !== undefined
            ? [ DomBuilder.getInstance().build({
                type: 'div',
                testId: testIds.prompt.quickPicksGroupTitle,
                classNames: [ 'mynah-detailed-list-group-title', (this.props.onGroupClick != null && this.props.detailedList.selectable === 'clickable') ? 'mynah-group-title-clickable' : '' ],
                children: [
                  ...(detailedListGroup.icon != null ? [ new Icon({ icon: detailedListGroup.icon }).render ] : []),
                  new CardBody({
                    body: detailedListGroup.groupName,
                  }).render,
                  new ChatItemButtonsWrapper({
                    buttons: (detailedListGroup.actions ?? []).map(action => ({
                      id: action.id,
                      status: action.status,
                      icon: action.icon,
                      text: action.text,
                      disabled: false
                    })),
                    onActionClick: (action) => { this.props.onGroupActionClick?.(action, detailedListGroup.groupName); }
                  }).render
                ],
                events: {
                  click: (e) => {
                    if (this.props.onGroupClick != null && detailedListGroup.groupName != null && this.props.detailedList.selectable === 'clickable') {
                      cancelEvent(e);
                      this.props.onGroupClick(detailedListGroup.groupName);
                    }
                  }
                }
              }) ]
            : []),
          ...((chunkArray(detailedListGroup.children ?? [], 50)).map((detailedListItemPart, index) => {
            const itemBlockKey = generateUID();
            const detailedListItemBlock = DomBuilder.getInstance().build({
              type: 'div',
              attributes: {
                key: itemBlockKey,
                style: `min-height: calc(${detailedListItemPart.length} * (var(--mynah-sizing-8) + var(--mynah-sizing-half)));`
              },
              classNames: [ 'mynah-detailed-list-items-block', (detailedListGroup.groupName !== undefined && detailedListGroup.childrenIndented === true) ? 'indented' : '' ],
              children: index < 1
                ? this.getDetailedListItemElements(detailedListItemPart)
                : []
            });
            this.detailedListItemsBlockData.push({
              data: detailedListItemPart,
              element: detailedListItemBlock
            });
            return detailedListItemBlock;
          }))
        ]
      });
    });
    return groups ?? [ '' ];
  };

  private readonly getDetailedListItemElements = (detailedListItems: DetailedListItem[]): ExtendedHTMLElement[] => {
    return detailedListItems.map(detailedListItem => {
      const detailedListItemElement = new DetailedListItemWrapper({
        listItem: detailedListItem,
        onSelect: this.props.onItemSelect,
        onClick: this.props.onItemClick,
        onShowActionMenuOverlay: () => { this.setFocus(detailedListItem); },
        onActionClick: this.props.onItemActionClick,
        selectable: this.props.detailedList.selectable !== false && this.props.detailedList.selectable !== 'clickable',
        clickable: this.props.detailedList.selectable === 'clickable',
        textDirection: this.props.detailedList.textDirection,
        descriptionTextDirection: this.props.descriptionTextDirection
      });
      if (detailedListItem.disabled !== true) {
        this.allSelectableDetailedListElements.push(detailedListItemElement);
      }
      return detailedListItemElement.render;
    });
  };

  public readonly changeTarget = (
    direction: 'up' | 'down',
    snapOnLastAndFirst?: boolean,
    scrollIntoView?: boolean
  ): void => {
    if (this.allSelectableDetailedListElements.length === 0) return;

    const lastIndex = this.allSelectableDetailedListElements.length - 1;
    let nextElementIndex = this.activeTargetElementIndex;

    // Handle initial selection when no item is selected
    if (nextElementIndex === -1) {
      nextElementIndex = direction === 'up' ? lastIndex : 0;
      this.setFocusByIndex(nextElementIndex, scrollIntoView);
      return;
    }

    // Calculate next index based on direction
    if (direction === 'up') {
      nextElementIndex = nextElementIndex > 0
        ? nextElementIndex - 1
        : (snapOnLastAndFirst === true ? 0 : lastIndex);
    } else {
      nextElementIndex = nextElementIndex < lastIndex
        ? nextElementIndex + 1
        : (snapOnLastAndFirst === true ? lastIndex : 0);
    }

    this.setFocusByIndex(nextElementIndex, scrollIntoView);
  };

  private readonly setFocus = (detailedListItem: DetailedListItem): void => {
    // Only remove focus from current item if one is selected
    if (this.activeTargetElementIndex >= 0) {
      this.allSelectableDetailedListElements[this.activeTargetElementIndex].setFocus(false, false);
    }
    const selectedItemIndex = this.allSelectableDetailedListElements.findIndex(item => item.getItem().id === detailedListItem.id);

    this.activeTargetElementIndex = selectedItemIndex;
    this.allSelectableDetailedListElements[this.activeTargetElementIndex].setFocus(true, false);
  };

  private readonly setFocusByIndex = (index: number, scrollIntoView?: boolean): void => {
    // Only remove focus from current item if one is selected
    if (this.activeTargetElementIndex >= 0) {
      this.allSelectableDetailedListElements[this.activeTargetElementIndex].setFocus(false, scrollIntoView === true);
    }

    this.activeTargetElementIndex = index;
    this.allSelectableDetailedListElements[this.activeTargetElementIndex].setFocus(true, scrollIntoView === true);
  };

  public readonly getTargetElement = (): DetailedListItem | null => {
    if (this.allSelectableDetailedListElements.length === 0 || this.activeTargetElementIndex < 0) {
      return null;
    }

    return this.allSelectableDetailedListElements[this.activeTargetElementIndex].getItem();
  };

  public readonly update = (detailedList: DetailedList, preserveScrollPosition?: boolean, preserveFocus?: boolean): void => {
    if (detailedList.header != null) {
      this.props.detailedList.header = detailedList.header;
      this.headerContainer.update({
        children: this.getHeader()
      });
    }

    if (detailedList.filterOptions != null) {
      this.props.detailedList.filterOptions = detailedList.filterOptions;
      this.filtersContainer.update({
        children: this.getFilters()
      });
    }

    if (detailedList.filterActions != null) {
      this.props.detailedList.filterActions = detailedList.filterActions;
      this.filterActionsContainer.update({
        children: this.getFilterActions()
      });
    }

    if (detailedList.list != null) {
      // Save current scroll position if preserveScrollPosition is true
      const scrollTop = preserveScrollPosition === true ? this.detailedListItemGroupsContainer.scrollTop : 0;
      // Save the currently focused index if preserveFocus is true so we can
      // restore the user's selection after the rebuild.
      const focusIndexToRestore = preserveFocus === true ? this.activeTargetElementIndex : -1;
      if (detailedList.selectable != null) {
        this.props.detailedList.selectable = detailedList.selectable;
      }

      // Clear and recreate the list structure
      this.detailedListItemsBlockData = [];
      this.detailedListItemGroupsContainer.clear();
      this.activeTargetElementIndex = -1;
      this.allSelectableDetailedListElements = [];
      this.props.detailedList.list = detailedList.list;

      // Update with new content
      this.detailedListItemGroupsContainer.update({
        children: this.getDetailedListItemGroups()
      });

      // Restore focus to the same index if preserveFocus was requested and
      // the index is still valid in the rebuilt list.
      if (focusIndexToRestore >= 0 && focusIndexToRestore < this.allSelectableDetailedListElements.length) {
        this.setFocusByIndex(focusIndexToRestore);
      }

      // Only schedule eager block loading if there are unrendered blocks beyond the first.
      // For small lists (single block per group), all content is already rendered inline.
      const hasUnrenderedBlocks = this.detailedListItemsBlockData.some(b => b.element.childNodes.length === 0);
      if (preserveScrollPosition === true) {
        requestAnimationFrame(() => {
          this.detailedListItemGroupsContainer.scrollTop = scrollTop;
          this.handleScroll();
        });
      } else if (hasUnrenderedBlocks) {
        requestAnimationFrame(() => this.handleScroll());
      }
    }
  };
}
