import { ChatItemTreeFile } from '../../chat-item/chat-item-tree-file';

// Mock the overlay so we can capture the tooltip content that gets rendered.
jest.mock('../../overlay', () => ({
  Overlay: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
  })),
  OverlayHorizontalDirection: {
    START_TO_RIGHT: 'start-to-right',
    CENTER: 'center',
  },
  OverlayVerticalDirection: {
    TO_TOP: 'to-top',
  },
}));

describe('ChatItemTreeFile', () => {
  it('should render tree file with basic properties', () => {
    const treeFile = new ChatItemTreeFile({
      tabId: 'test-tab',
      messageId: 'test-message',
      filePath: '/src/test.ts',
      originalFilePath: '/src/test.ts',
      fileName: 'test.ts',
    });

    expect(treeFile.render).toBeDefined();
  });

  describe('tooltip', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      const { Overlay } = jest.requireMock('../../overlay')
      ;(Overlay as jest.Mock).mockClear();
      document.body.innerHTML = '';
    });

    afterEach(() => {
      jest.useRealTimers();
      document.body.innerHTML = '';
    });

    const getTooltipText = (): string => {
      const { Overlay } = jest.requireMock('../../overlay');
      expect(Overlay).toHaveBeenCalledTimes(1);
      const overlayProps = (Overlay as jest.Mock).mock.calls[0][0];
      return (overlayProps.children[0] as HTMLElement).textContent ?? '';
    };

    it('shows a Windows file path in the tooltip verbatim (backslashes preserved)', () => {
      // The backslash before ".gradle" must survive; markdown rendering would drop it.
      const windowsPath = 'C:\\Users\\discr\\.gradle\\init.gradle';
      const treeFile = new ChatItemTreeFile({
        tabId: 'test-tab',
        messageId: 'test-message',
        filePath: windowsPath,
        originalFilePath: windowsPath,
        fileName: 'init.gradle',
        details: { description: windowsPath },
      });
      document.body.appendChild(treeFile.render);

      treeFile.render.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      jest.advanceTimersByTime(250);

      const text = getTooltipText();
      expect(text).toContain(windowsPath);
      // Regression guard: the path must not be collapsed to "discr.gradle".
      expect(text).not.toContain('discr.gradle\\init.gradle');
    });
  });
});
