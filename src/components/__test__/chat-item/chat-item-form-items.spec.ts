import { ChatItemFormItemsWrapper } from '../../chat-item/chat-item-form-items';
import { ChatItem, ChatItemType } from '../../../static';

// Mock the overlay so we can observe when the tooltip is shown (constructed) and
// hidden (close() called), without depending on real positioning/rendering.
jest.mock('../../overlay', () => ({
  Overlay: jest.fn().mockImplementation(() => ({
    close: jest.fn()
  })),
  OverlayHorizontalDirection: {
    START_TO_RIGHT: 'start-to-right'
  },
  OverlayVerticalDirection: {
    TO_TOP: 'to-top'
  }
}));

describe('ChatItemFormItemsWrapper', () => {
  it('should render form items wrapper', () => {
    const wrapper = new ChatItemFormItemsWrapper({
      tabId: 'test-tab',
      chatItem: {}
    });

    expect(wrapper.render).toBeDefined();
  });

  it('should disable radio input when disabled is true', () => {
    const chatItem: ChatItem = {
      type: ChatItemType.PROMPT,
      formItems: [
        {
          id: 'test-radio',
          type: 'radiogroup',
          title: 'Test Radio',
          options: [ { value: 'option1', label: 'Option 1' } ],
          disabled: true
        }
      ]
    };

    const wrapper = new ChatItemFormItemsWrapper({
      tabId: 'test-tab',
      chatItem
    });

    const radioInput = wrapper.render.querySelector('.mynah-form-input[disabled]');
    expect(radioInput?.hasAttribute('disabled')).toBe(true);
  });

  it('should disable text input when disabled is true', () => {
    const chatItem: ChatItem = {
      type: ChatItemType.PROMPT,
      formItems: [
        {
          id: 'test-text',
          type: 'textinput',
          title: 'Test Text',
          disabled: true
        }
      ]
    };

    const wrapper = new ChatItemFormItemsWrapper({
      tabId: 'test-tab',
      chatItem
    });

    const textInput = wrapper.render.querySelector('input[type="text"][disabled]');
    expect(textInput?.hasAttribute('disabled')).toBe(true);
  });

  it('should disable numeric input when disabled is true', () => {
    const chatItem: ChatItem = {
      type: ChatItemType.PROMPT,
      formItems: [
        {
          id: 'test-numeric',
          type: 'numericinput',
          title: 'Test Numeric',
          disabled: true
        }
      ]
    };

    const wrapper = new ChatItemFormItemsWrapper({
      tabId: 'test-tab',
      chatItem
    });

    const numericInput = wrapper.render.querySelector('input[type="number"][disabled]');
    expect(numericInput?.hasAttribute('disabled')).toBe(true);
  });

  it('should disable email input when disabled is true', () => {
    const chatItem: ChatItem = {
      type: ChatItemType.PROMPT,
      formItems: [
        {
          id: 'test-email',
          type: 'email',
          title: 'Test Email',
          disabled: true
        }
      ]
    };

    const wrapper = new ChatItemFormItemsWrapper({
      tabId: 'test-tab',
      chatItem
    });

    const emailInput = wrapper.render.querySelector('input[type="email"][disabled]');
    expect(emailInput?.hasAttribute('disabled')).toBe(true);
  });

  it('should not disable form items when disabled is false or undefined', () => {
    const chatItem: ChatItem = {
      type: ChatItemType.PROMPT,
      formItems: [
        {
          id: 'test-enabled',
          type: 'textinput',
          title: 'Test Enabled',
          disabled: false
        }
      ]
    };

    const wrapper = new ChatItemFormItemsWrapper({
      tabId: 'test-tab',
      chatItem
    });

    const textInput = wrapper.render.querySelector('input[type="text"]');
    expect(textInput?.hasAttribute('disabled')).toBe(false);
  });

  describe('form item tooltip lifecycle', () => {
    const buildSwitchWrapper = (): ChatItemFormItemsWrapper => {
      const chatItem: ChatItem = {
        type: ChatItemType.PROMPT,
        formItems: [
          {
            id: 'agentic-toggle',
            type: 'switch',
            title: 'Agentic coding',
            value: 'true',
            tooltip: 'Turn OFF agentic coding',
            alternateTooltip: 'Turn ON agentic coding'
          }
        ]
      };
      return new ChatItemFormItemsWrapper({ tabId: 'test-tab', chatItem });
    };

    beforeEach(() => {
      jest.useFakeTimers();
      const { Overlay } = jest.requireMock('../../overlay');
      (Overlay as jest.Mock).mockClear();
      document.body.innerHTML = '';
    });

    afterEach(() => {
      jest.useRealTimers();
      document.body.innerHTML = '';
    });

    it('should show the tooltip on hover after the delay', () => {
      const wrapper = buildSwitchWrapper();
      document.body.appendChild(wrapper.render);
      const switchEl = wrapper.render.querySelector('.mynah-form-input-wrapper') as HTMLElement;
      expect(switchEl).not.toBeNull();

      switchEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      jest.advanceTimersByTime(350);

      const { Overlay } = jest.requireMock('../../overlay');
      expect(Overlay).toHaveBeenCalledTimes(1);
    });

    it('should dismiss the tooltip when the control is clicked (so it cannot block the chat after toggling)', () => {
      const wrapper = buildSwitchWrapper();
      document.body.appendChild(wrapper.render);
      const switchEl = wrapper.render.querySelector('.mynah-form-input-wrapper') as HTMLElement;

      switchEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      jest.advanceTimersByTime(350);

      const { Overlay } = jest.requireMock('../../overlay');
      const overlayInstance = (Overlay as jest.Mock).mock.results[0].value;

      switchEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(overlayInstance.close).toHaveBeenCalled();
    });

    it('should cancel a pending tooltip when the control is clicked before it appears', () => {
      const wrapper = buildSwitchWrapper();
      document.body.appendChild(wrapper.render);
      const switchEl = wrapper.render.querySelector('.mynah-form-input-wrapper') as HTMLElement;

      // Hover starts the show timer, but the user clicks before the delay elapses.
      switchEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      switchEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      switchEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      jest.advanceTimersByTime(350);

      // The overlay must never be created, otherwise it would linger over the chat.
      const { Overlay } = jest.requireMock('../../overlay');
      expect(Overlay).not.toHaveBeenCalled();
    });
  });
});
