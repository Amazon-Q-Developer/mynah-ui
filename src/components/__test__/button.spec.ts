import { Button } from '../button';
import { configureMarked } from '../../helper/marked';

jest.mock('../overlay', () => ({
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

describe('button', () => {
  it('label', () => {
    const mockOnClickHandler = jest.fn();
    const testButton = new Button({
      label: 'Test button',
      onClick: mockOnClickHandler,
    });

    expect(testButton.render).toBeDefined();
    expect(testButton.render.querySelector('span')?.textContent).toBe('Test button');

    testButton.updateLabel('Updated label');
    expect(testButton.render.textContent).toBe('Updated label');
  });

  it('attributes', () => {
    const mockOnClickHandler = jest.fn();
    const testButton = new Button({
      label: 'Test button',
      attributes: {
        id: 'test-id',
      },
      onClick: mockOnClickHandler,
    });

    expect(testButton.render.id).toBe('test-id');
  });

  it('primary style', () => {
    const mockOnClickHandler = jest.fn();
    const testButton = new Button({
      label: 'Test button',
      primary: false,
      onClick: mockOnClickHandler,
    });
    const testButton2 = new Button({
      label: 'Test button',
      primary: true,
      onClick: mockOnClickHandler,
    });

    expect(testButton.render.classList.contains('mynah-button-secondary')).toBeTruthy();
    expect(testButton2.render.classList.contains('mynah-button-secondary')).toBeFalsy();
  });

  it('enabled', () => {
    const mockOnClickHandler = jest.fn();
    const testButton = new Button({
      label: 'Test button',
      onClick: mockOnClickHandler,
    });

    expect(testButton.render.disabled).toBeFalsy();
    testButton.setEnabled(false);
    expect(testButton.render.disabled).toBeTruthy();
  });

  it('event handlers', () => {
    const mockOnClickHandler = jest.fn();
    const mockMouseOverHandler = jest.fn();
    const testButton = new Button({
      label: 'Test button',
      attributes: {
        id: 'test-id',
      },
      onClick: mockOnClickHandler,
      additionalEvents: {
        mouseenter: mockMouseOverHandler,
      }
    });

    document.body.appendChild(testButton.render);
    const testButtonElement = document.querySelector('#test-id') as HTMLElement;
    testButtonElement?.click();
    expect(mockOnClickHandler).toHaveBeenCalledTimes(1);

    testButtonElement.dispatchEvent(new Event('mouseenter'));
    expect(mockMouseOverHandler).toHaveBeenCalledTimes(1);
  });

  it('renders tooltip markdown exactly once', () => {
    configureMarked();
    jest.useFakeTimers();
    const { Overlay } = jest.requireMock('../overlay');
    (Overlay as jest.Mock).mockClear();

    const testButton = new Button({
      icon: document.createElement('i'),
      tooltip: 'Configure **MCP** servers',
      onClick: jest.fn(),
    });

    document.body.appendChild(testButton.render);
    testButton.render.dispatchEvent(new MouseEvent('mouseover'));
    jest.advanceTimersByTime(350);

    expect(Overlay).toHaveBeenCalledTimes(1);
    const tooltip = (Overlay as jest.Mock).mock.calls[0][0].children[0] as HTMLElement;
    expect(tooltip.textContent).toBe('Configure MCP servers');
    expect(tooltip.querySelector('strong')?.textContent).toBe('MCP');
    expect(tooltip.textContent).not.toContain('<p>');

    jest.useRealTimers();
  });

  it('does not render an empty or whitespace-only tooltip', () => {
    configureMarked();
    jest.useFakeTimers();
    const { Overlay } = jest.requireMock('../overlay');

    for (const tooltip of [ '', '   ' ]) {
      (Overlay as jest.Mock).mockClear();
      const testButton = new Button({
        icon: document.createElement('i'),
        tooltip,
        onClick: jest.fn(),
      });

      document.body.appendChild(testButton.render);
      testButton.render.dispatchEvent(new MouseEvent('mouseover'));
      jest.advanceTimersByTime(350);

      expect(Overlay).not.toHaveBeenCalled();
      testButton.render.remove();
    }

    jest.useRealTimers();
  });

  it('renders a truncated label tooltip exactly once', () => {
    configureMarked();
    jest.useFakeTimers();
    const { Overlay } = jest.requireMock('../overlay');
    (Overlay as jest.Mock).mockClear();

    const testButton = new Button({
      label: 'View **history**',
      onClick: jest.fn(),
    });
    const label = testButton.render.querySelector('.mynah-button-label') as HTMLElement;
    Object.defineProperties(label, {
      offsetWidth: { value: 10 },
      scrollWidth: { value: 20 }
    });

    document.body.appendChild(testButton.render);
    testButton.render.dispatchEvent(new MouseEvent('mouseover'));
    jest.advanceTimersByTime(350);

    const tooltip = (Overlay as jest.Mock).mock.calls[0][0].children[0] as HTMLElement;
    expect(tooltip.textContent).toBe('View history');
    expect(tooltip.querySelector('strong')?.textContent).toBe('history');

    jest.useRealTimers();
  });
});
