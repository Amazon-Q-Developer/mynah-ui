import { ChatItemCard } from '../../chat-item/chat-item-card';
import { ChatItemType } from '../../../static';
import { MynahUIGlobalEvents } from '../../../helper/events';
import { configureMarked } from '../../../helper/marked';
import { Overlay } from '../../overlay';

jest.mock('../../overlay', () => ({
  Overlay: jest.fn().mockImplementation(() => ({ close: jest.fn() })),
  OverlayHorizontalDirection: { CENTER: 'center' },
  OverlayVerticalDirection: { TO_TOP: 'to-top' }
}));

// Mock the tabs store
jest.mock('../../../helper/tabs-store', () => ({
  MynahUITabsStore: {
    getInstance: jest.fn(() => ({
      getTabDataStore: jest.fn(() => ({
        subscribe: jest.fn(),
        getValue: jest.fn(() => ({}))
      }))
    }))
  }
}));

// Mock global events
jest.mock('../../../helper/events', () => ({
  ...jest.requireActual('../../../helper/events'),
  MynahUIGlobalEvents: {
    getInstance: jest.fn(() => ({
      dispatch: jest.fn()
    }))
  }
}));

describe('ChatItemCard', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    (MynahUIGlobalEvents.getInstance as jest.Mock).mockReturnValue({
      dispatch: mockDispatch
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic chat item card', () => {
    const card = new ChatItemCard({
      tabId: 'test-tab',
      chatItem: {
        type: ChatItemType.ANSWER,
        body: 'Test content'
      }
    });

    expect(card.render).toBeDefined();
  });

  describe('status error tooltip', () => {
    beforeAll(() => {
      configureMarked();
    });

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    const createBadge = (description?: string): HTMLElement => {
      const card = new ChatItemCard({
        tabId: 'test-tab',
        chatItem: {
          type: ChatItemType.ANSWER,
          header: { body: 'example.txt', status: { status: 'error', text: 'Error', description } }
        }
      });
      return card.render.querySelector('.mynah-chat-item-card-header-status') as HTMLElement;
    };

    it('renders the description markdown once and anchors to the whole badge', () => {
      const badge = createBadge('File already exists with **identical content**.');
      const label = badge.querySelector('span') as HTMLElement;
      label.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      jest.advanceTimersByTime(350);

      expect(Overlay).toHaveBeenCalledTimes(1);
      const options = (Overlay as jest.Mock).mock.calls[0][0];
      const tooltip = options.children[0] as HTMLElement;
      expect(options.referenceElement).toBe(badge);
      expect(tooltip.textContent).toBe('File already exists with identical content.');
      expect(tooltip.querySelector('strong')?.textContent).toBe('identical content');
      expect(tooltip.textContent).not.toContain('<p>');
      expect(badge.hasAttribute('title')).toBe(false);
      expect(badge.textContent).toBe('Error');
    });

    it('renders a plain-text error description', () => {
      const badge = createBadge('Unable to open example.txt.');
      badge.dispatchEvent(new MouseEvent('mouseover'));
      jest.advanceTimersByTime(350);

      expect(Overlay).toHaveBeenCalledTimes(1);
      const tooltip = (Overlay as jest.Mock).mock.calls[0][0].children[0] as HTMLElement;
      expect(tooltip.textContent).toBe('Unable to open example.txt.');
    });

    it.each([ undefined, '', '   ', '\n\t' ])('does not create a tooltip for description %p', (description) => {
      const badge = createBadge(description);
      badge.dispatchEvent(new MouseEvent('mouseover'));
      jest.advanceTimersByTime(350);

      expect(Overlay).not.toHaveBeenCalled();
    });

    it('cancels the pending tooltip when the pointer leaves', () => {
      const badge = createBadge('Unable to open example.txt.');
      badge.dispatchEvent(new MouseEvent('mouseover'));
      badge.dispatchEvent(new MouseEvent('mouseleave'));
      jest.advanceTimersByTime(350);

      expect(Overlay).not.toHaveBeenCalled();
    });
  });

  describe('Pills functionality', () => {
    it('should render pills when renderAsPills is true', () => {
      const card = new ChatItemCard({
        tabId: 'test-tab',
        chatItem: {
          type: ChatItemType.ANSWER,
          header: {
            icon: 'progress',
            body: 'Reading',
            fileList: {
              filePaths: [ 'file1.ts', 'file2.ts' ],
              renderAsPills: true
            }
          }
        }
      });

      const pillElements = card.render.querySelectorAll('.mynah-chat-item-tree-file-pill');
      expect(pillElements.length).toBe(2);
    });

    it('should include icon in customRenderer when pills are enabled', () => {
      const card = new ChatItemCard({
        tabId: 'test-tab',
        chatItem: {
          type: ChatItemType.ANSWER,
          header: {
            icon: 'eye',
            body: 'Files read',
            fileList: {
              filePaths: [ 'test.json' ],
              renderAsPills: true
            }
          }
        }
      });

      const iconElement = card.render.querySelector('.mynah-ui-icon-eye');
      expect(iconElement).toBeTruthy();
    });

    it('should render pills with correct file names', () => {
      const card = new ChatItemCard({
        tabId: 'test-tab',
        chatItem: {
          type: ChatItemType.ANSWER,
          header: {
            body: 'Processing',
            fileList: {
              filePaths: [ 'package.json', 'tsconfig.json' ],
              details: {
                'package.json': {
                  visibleName: 'package'
                },
                'tsconfig.json': {
                  visibleName: 'tsconfig'
                }
              },
              renderAsPills: true
            }
          }
        }
      });

      const pillElements = card.render.querySelectorAll('.mynah-chat-item-tree-file-pill');
      expect(pillElements[0].textContent).toBe('package');
      expect(pillElements[1].textContent).toBe('tsconfig');
    });

    it('should apply deleted styling to deleted files', () => {
      const card = new ChatItemCard({
        tabId: 'test-tab',
        chatItem: {
          type: ChatItemType.ANSWER,
          header: {
            body: 'Changes',
            fileList: {
              filePaths: [ 'deleted.ts', 'normal.ts' ],
              deletedFiles: [ 'deleted.ts' ],
              renderAsPills: true
            }
          }
        }
      });

      const deletedPill = card.render.querySelector('.mynah-chat-item-tree-file-pill-deleted');
      expect(deletedPill).toBeTruthy();
      expect(deletedPill?.textContent).toBe('deleted.ts');
    });

    it('should not dispatch click events when clickable is false', () => {
      const card = new ChatItemCard({
        tabId: 'test-tab',
        chatItem: {
          type: ChatItemType.ANSWER,
          header: {
            body: 'Files',
            fileList: {
              filePaths: [ 'test.js' ],
              details: {
                'test.js': {
                  clickable: false
                }
              },
              renderAsPills: true
            }
          }
        }
      });

      const pillElement = card.render.querySelector('.mynah-chat-item-tree-file-pill') as HTMLElement;
      pillElement?.click();

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  it('should not render pills when renderAsPills is false', () => {
    const card = new ChatItemCard({
      tabId: 'test-tab',
      chatItem: {
        type: ChatItemType.ANSWER,
        header: {
          body: 'Files',
          fileList: {
            filePaths: [ 'file1.ts' ],
            renderAsPills: false
          }
        }
      }
    });

    const pillElements = card.render.querySelectorAll('.mynah-chat-item-tree-file-pill');
    expect(pillElements.length).toBe(0);
  });

  it('should fall back to file path when visibleName is not provided', () => {
    const card = new ChatItemCard({
      tabId: 'test-tab',
      chatItem: {
        type: ChatItemType.ANSWER,
        header: {
          body: 'Files',
          fileList: {
            filePaths: [ 'src/components/test.ts' ],
            renderAsPills: true
          }
        }
      }
    });

    const pillElement = card.render.querySelector('.mynah-chat-item-tree-file-pill');
    expect(pillElement?.textContent).toBe('src/components/test.ts');
  });

  it('should handle empty filePaths array', () => {
    const card = new ChatItemCard({
      tabId: 'test-tab',
      chatItem: {
        type: ChatItemType.ANSWER,
        header: {
          body: 'No files',
          fileList: {
            filePaths: [],
            renderAsPills: true
          }
        }
      }
    });

    const pillElements = card.render.querySelectorAll('.mynah-chat-item-tree-file-pill');
    expect(pillElements.length).toBe(0);
  });

  it('should parse markdown in header body for pills', () => {
    const card = new ChatItemCard({
      tabId: 'test-tab',
      chatItem: {
        type: ChatItemType.ANSWER,
        header: {
          body: 'Reading `inline code` text',
          fileList: {
            filePaths: [ 'test.js' ],
            renderAsPills: true
          }
        }
      }
    });

    const codeElement = card.render.querySelector('.mynah-inline-code');
    expect(codeElement).toBeTruthy();
  });
});
