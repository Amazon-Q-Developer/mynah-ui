import { DropdownList } from '../dropdown-form/dropdown-list';
import { configureMarked } from '../../helper/marked';
import { MynahUIGlobalEvents } from '../../helper/events';
import { DropdownListOption, MynahEventNames } from '../../static';

const otherOption: DropdownListOption = { id: 'other', value: 'other-value', label: 'Other' };

const getButtonLabel = (dropdown: DropdownList): HTMLElement =>
  dropdown.render.querySelector('.mynah-dropdown-list-button .mynah-button-label') as HTMLElement;

const selectByClick = (dropdown: DropdownList, optionId: string): void => {
  (dropdown.render.querySelector('.mynah-dropdown-list-button') as HTMLElement).click();
  (document.querySelector(`.mynah-dropdown-list-option[data-item-id="${optionId}"]`) as HTMLElement).click();
};

describe('dropdown list', () => {
  let dropdown: DropdownList;

  // Creates a dropdown with the given label either preselected or selectable, next to another option
  const createDropdown = (label: string, selected: boolean, props?: { onChange?: (selectedOptions: DropdownListOption[]) => void }): DropdownList => {
    dropdown = new DropdownList({
      options: [
        { id: 'target', value: 'target-value', label, selected },
        { ...otherOption, selected: !selected }
      ],
      tabId: 'tab-1',
      messageId: 'message-1',
      ...props
    });
    document.body.appendChild(dropdown.render);
    return dropdown;
  };

  beforeAll(() => {
    configureMarked();
  });

  afterEach(() => {
    dropdown?.destroy();
    document.body.innerHTML = '';
  });

  describe('labels containing markup', () => {
    const markupLabels = [
      'Enabled <img src=x onerror="window.dropdownLabelTest=1">',
      'Enabled <img src=x onerror=window.dropdownLabelTest=1>',
      'On <script>window.dropdownLabelTest=1</script>',
      '<span onmouseover="window.dropdownLabelTest=1" style="position:fixed">Hover</span>',
      '<svg onload=window.dropdownLabelTest=1></svg> Go',
      '<a href="javascript:window.dropdownLabelTest=1">Open</a>',
      '<b>Bold</b> <i>label</i>',
    ];

    it.each(markupLabels)('should show %s as text after selecting it by click', (label) => {
      createDropdown(label, false);
      selectByClick(dropdown, 'target');

      const buttonLabel = getButtonLabel(dropdown);
      expect(buttonLabel.children.length).toBe(0);
      expect(buttonLabel.textContent).toBe(label);
    });

    it.each(markupLabels)('should show %s as text after setSelectedOptions', (label) => {
      createDropdown(label, false);
      dropdown.setSelectedOptions([ 'target' ]);

      const buttonLabel = getButtonLabel(dropdown);
      expect(buttonLabel.children.length).toBe(0);
      expect(buttonLabel.textContent).toBe(label);
    });

    it.each(markupLabels)('should show %s the same way as when it is initially selected', (label) => {
      createDropdown(label, true);
      const initialLabel = getButtonLabel(dropdown).innerHTML;

      dropdown.setSelectedOptions([ 'other' ]);
      selectByClick(dropdown, 'target');

      expect(getButtonLabel(dropdown).innerHTML).toBe(initialLabel);
    });

    it('should show a markdown link with a script url as text', () => {
      const label = '[Open](javascript:window.dropdownLabelTest=1)';
      createDropdown(label, false);
      selectByClick(dropdown, 'target');

      const buttonLabel = getButtonLabel(dropdown);
      expect(buttonLabel.children.length).toBe(0);
      expect(buttonLabel.textContent).toBe(label);
    });
  });

  describe('labels without markup', () => {
    const plainLabels = [
      'Ask to Run',
      'Claude 3.5 Sonnet (v2)',
      'Read & write',
      'a < b',
      'a > b',
      'Say "hello"',
      "Don't ask",
      'snake_case_name',
      '2 * 3 * 4',
      'C:\\temp\\new',
      'Fast ⚡ mode 🚀',
      '自动运行',
      'A very long option label that goes on and on to check nothing is truncated or altered by the renderer at all',
    ];

    it.each(plainLabels)('should show %s identically before and after selection', (label) => {
      createDropdown(label, true);
      const initialLabel = getButtonLabel(dropdown).innerHTML;
      expect(getButtonLabel(dropdown).textContent).toBe(label);

      dropdown.setSelectedOptions([ 'other' ]);
      expect(getButtonLabel(dropdown).textContent).toBe('Other');

      selectByClick(dropdown, 'target');
      expect(getButtonLabel(dropdown).textContent).toBe(label);
      expect(getButtonLabel(dropdown).innerHTML).toBe(initialLabel);

      dropdown.setSelectedOptions([ 'other' ]);
      dropdown.setSelectedOptions([ 'target' ]);
      expect(getButtonLabel(dropdown).textContent).toBe(label);
      expect(getButtonLabel(dropdown).innerHTML).toBe(initialLabel);
    });

    it.each([
      [ 'Tom &amp; Jerry', 'Tom & Jerry' ],
      [ '1 &lt; 2 &gt; 0', '1 < 2 > 0' ],
      [ '&copy; Example', '© Example' ],
    ])('should show the character references in %s as characters before and after selection', (label, displayed) => {
      createDropdown(label, true);
      expect(getButtonLabel(dropdown).textContent).toBe(displayed);

      dropdown.setSelectedOptions([ 'other' ]);
      selectByClick(dropdown, 'target');
      expect(getButtonLabel(dropdown).textContent).toBe(displayed);

      dropdown.setSelectedOptions([ 'target' ]);
      expect(getButtonLabel(dropdown).textContent).toBe(displayed);
    });
  });

  describe('no selection', () => {
    it('should show an empty label when no option is selected', () => {
      dropdown = new DropdownList({ options: [ { id: 'target', value: 'target-value', label: 'Target' }, otherOption ] });
      document.body.appendChild(dropdown.render);

      expect(getButtonLabel(dropdown)).not.toBeNull();
      expect(getButtonLabel(dropdown).textContent).toBe('');
      expect(dropdown.getSelectedOptions()).toEqual([]);
    });

    it('should show an empty label when the selection is cleared', () => {
      createDropdown('Target', true);

      dropdown.setSelectedOptions([]);
      expect(getButtonLabel(dropdown)).not.toBeNull();
      expect(getButtonLabel(dropdown).textContent).toBe('');
      expect(getButtonLabel(dropdown).children.length).toBe(0);

      dropdown.setSelectedOptions([ 'unknown-id' ]);
      expect(getButtonLabel(dropdown).textContent).toBe('');

      dropdown.setSelectedOptions([ 'target' ]);
      expect(getButtonLabel(dropdown).textContent).toBe('Target');
    });
  });

  describe('selection change', () => {
    it('should call onChange and dispatch the change event with the selected option', () => {
      const label = 'Read & <write>';
      const onChange = jest.fn();
      const onEvent = jest.fn();
      const listenerId = MynahUIGlobalEvents.getInstance().addListener(MynahEventNames.DROPDOWN_OPTION_CHANGE, onEvent);
      createDropdown(label, false, { onChange });

      selectByClick(dropdown, 'target');

      const expectedSelection = [ { id: 'target', value: 'target-value', label, selected: false } ];
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expectedSelection);
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith({ value: expectedSelection, messageId: 'message-1', tabId: 'tab-1' });
      expect(dropdown.getSelectedOptions()).toEqual(expectedSelection);
      // The list is closed after a selection
      expect(document.querySelector('.mynah-dropdown-list-portal')).toBeNull();

      MynahUIGlobalEvents.getInstance().removeListener(MynahEventNames.DROPDOWN_OPTION_CHANGE, listenerId);
    });

    it('should not call onChange for setSelectedOptions', () => {
      const onChange = jest.fn();
      createDropdown('Target', false, { onChange });

      dropdown.setSelectedOptions([ 'target' ]);

      expect(onChange).not.toHaveBeenCalled();
      expect(dropdown.getSelectedOptions().map(option => option.id)).toEqual([ 'target' ]);
    });
  });
});
