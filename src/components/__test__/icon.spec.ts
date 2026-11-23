import { Icon, MynahIcons } from '../icon';
import { MynahUIIconImporter } from '../icon/icon-importer';

describe('icon', () => {
  it('renders predefined icon', () => {
    const testIcon = new Icon({
      icon: MynahIcons.DESKTOP,
    });

    expect(testIcon.render).toBeDefined();
    expect(testIcon.render.classList.contains('mynah-ui-icon')).toBeTruthy();
    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop')).toBeTruthy();
  });

  it('renders globe icon', () => {
    const testIcon = new Icon({
      icon: MynahIcons.GLOBE,
    });

    expect(testIcon.render).toBeDefined();
    expect(testIcon.render.classList.contains('mynah-ui-icon-globe')).toBeTruthy();
  });

  it('renders icon with subtract', () => {
    const testIcon = new Icon({
      icon: MynahIcons.DESKTOP,
      subtract: true,
    });

    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop-subtract')).toBeTruthy();
  });

  it('renders icon with status', () => {
    const testIcon = new Icon({
      icon: MynahIcons.GLOBE,
      status: 'success',
    });

    expect(testIcon.render.classList.contains('status-success')).toBeTruthy();
  });

  it('renders icon with custom classNames', () => {
    const testIcon = new Icon({
      icon: MynahIcons.DESKTOP,
      classNames: [ 'custom-class-1', 'custom-class-2' ],
    });

    expect(testIcon.render.classList.contains('custom-class-1')).toBeTruthy();
    expect(testIcon.render.classList.contains('custom-class-2')).toBeTruthy();
  });

  it('updates icon', () => {
    const testIcon = new Icon({
      icon: MynahIcons.DESKTOP,
    });

    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop')).toBeTruthy();

    testIcon.update(MynahIcons.GLOBE);

    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop')).toBeFalsy();
    expect(testIcon.render.classList.contains('mynah-ui-icon-globe')).toBeTruthy();
  });

  it('updates icon with subtract', () => {
    const testIcon = new Icon({
      icon: MynahIcons.DESKTOP,
      subtract: true,
    });

    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop-subtract')).toBeTruthy();

    testIcon.update(MynahIcons.GLOBE);

    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop-subtract')).toBeFalsy();
    expect(testIcon.render.classList.contains('mynah-ui-icon-globe-subtract')).toBeTruthy();
  });

  it('renders custom icon', () => {
    const customIcon = {
      name: 'custom-test-icon',
      base64Svg: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiPjwvc3ZnPg==',
    };

    const testIcon = new Icon({
      icon: customIcon,
    });

    expect(testIcon.render.classList.contains('mynah-ui-icon-custom-test-icon')).toBeTruthy();
  });

  it('updates from predefined to custom icon', () => {
    const testIcon = new Icon({
      icon: MynahIcons.DESKTOP,
    });

    const customIcon = {
      name: 'custom-icon',
      base64Svg: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiPjwvc3ZnPg==',
    };

    testIcon.update(customIcon);

    expect(testIcon.render.classList.contains('mynah-ui-icon-desktop')).toBeFalsy();
    expect(testIcon.render.classList.contains('mynah-ui-icon-custom-icon')).toBeTruthy();
  });

  describe('custom icon values', () => {
    // <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16"/></svg>
    const validSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+PC9zdmc+';
    const iconSheets = (): string[] => Array.from(document.querySelectorAll('style')).map(style => style.textContent ?? '');
    const lastSheet = (): string => iconSheets().slice(-1)[0];
    const ruleCount = (): number => (document.querySelectorAll('style')[iconSheets().length - 1].sheet as CSSStyleSheet).cssRules.length;
    const addIcon = (name: string, base64Svg: string): Icon => new Icon({ icon: { name, base64Svg } });
    const rulesFor = (name: string, image: string): string => `
          :root{
            --mynah-ui-icon-${name}: url(${image});
          }
          .mynah-ui-icon-${name} {
            -webkit-mask-image: var(--mynah-ui-icon-${name});
            mask-image: var(--mynah-ui-icon-${name});
          }
          .mynah-ui-icon-${name}-subtract {
            -webkit-mask-image: linear-gradient(#000000, #000000), var(--mynah-ui-icon-${name});
            mask-image: linear-gradient(#000000, #000000), var(--mynah-ui-icon-${name});
            mask-composite: subtract;
          }`;
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    const acceptedNames = [
      'javascript', 'mcp-server-1', 'my_icon', 'Icon2', 'MixedCase_Name-9', '9lives', '-lead', '_', 'constructor', '__proto__',
      'ok-custom', 'okay', 'my-ok', 'ok_circled-2', 'subtract', 'x-subtract',
    ];

    // [ value given, value written into the stylesheet ]
    const acceptedImages = [
      [ validSvg, validSvg ],
      [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      ],
      [ 'data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+', 'data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+' ],
      [
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
      ],
      [ 'DATA:IMAGE/SVG+XML;BASE64,PHN2Zy8+', 'DATA:IMAGE/SVG+XML;BASE64,PHN2Zy8+' ],
      [ 'data:image/svg+xml;base64,eA==;a=b,c!d@e[f]#g', 'data:image/svg+xml;base64,eA==;a=b,c!d@e[f]#g' ],
      [ `${validSvg}\n`, validSvg ],
      [ `${validSvg} `, validSvg ],
      [ ` ${validSvg}`, validSvg ],
      [ `\t${validSvg}\r\n`, validSvg ],
      [ `"${validSvg}"`, validSvg ],
      [ `'${validSvg}'`, validSvg ],
      [ ` "${validSvg}"\n`, validSvg ],
      [ `" ${validSvg}\n"`, validSvg ],
      [ `\f${validSvg}\f`, validSvg ],
    ];

    const rejectedImages = [
      'data:image/svg+xml;base64,eA==); } .mynah-chat-item-card { background-image: url(https://example.com/a); } /*',
      'data:image/svg+xml;base64,eA==);}.marker{display:none}',
      'data:image/svg+xml;base64,eA==)}@import url(https://example.com/a.css);',
      'data:image/svg+xml;base64,eA==");}.marker{display:none}',
      "data:image/svg+xml;base64,eA==');}.marker{display:none}",
      'data:image/svg+xml;base64,eA==\n);}.marker{display:none}',
      'data:image/svg+xml;base64,eA==\t.marker',
      'data:image/svg+xml;base64,eA==\\29;}.marker{display:none}',
      'data:image/svg+xml;base64,eA==\\',
      'data:image/svg+xml;base64,eA==*/);}.marker{display:none}/*(',
      'data:image/svg+xml;base64,eA==\u0000',
      'data:image/svg+xml;base64,eA==/*',
      'data:image/svg+xml;base64,eA==\u2028).marker',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
      '"data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'/>"',
      '"data:image/svg+xml;base64,eA==");}.marker{display:none}/*"',
      `"${validSvg}'`,
      `"${validSvg}`,
      `""${validSvg}""`,
      `\u00a0${validSvg}`,
      `${validSvg}\u000b`,
      `\ufeff${validSvg}`,
      'data:image/svg+xml;base64,eA== eA==',
      '"',
      '""',
      'data:text/html;base64,PHN2Zy8+',
      'https://example.com/icon.svg',
      '//example.com/icon.svg',
      'icon.svg',
      'url(https://example.com/icon.svg)',
      'PHN2Zy8+',
      '',
    ];

    const rejectedNames = [
      'x; } .marker { display: none } .y {',
      'x{}',
      'x}',
      'x,.marker',
      'x .marker',
      'x>.marker',
      'x:hover',
      'x.marker',
      'x[origin]',
      'x"',
      "x'",
      'x/*',
      'x*/',
      'x\\',
      'x\ny',
      'x\n',
      '\nx',
      'x;y',
      'x(y)',
      'x@import',
      'x#y',
      'x<y',
      'ícone',
      '日本語',
      'x\u00a0y',
      '',
    ];

    const builtInNames = [
      'ok', 'OK', 'Ok', 'warning', 'WARNING', 'q', 'Q', 'ok-subtract', 'OK-subtract', 'Ok-Subtract',
      'minus-circled', 'MINUS_CIRCLE', 'minus_circle', 'minus-circled-subtract', 'MINUS_CIRCLE-subtract',
    ];

    it.each(acceptedNames)('adds the icon rules for name %p', (name) => {
      const rulesBefore = ruleCount();
      const testIcon = new Icon({ icon: { name, base64Svg: validSvg } });

      expect(testIcon.render.classList.contains(`mynah-ui-icon-${name}`)).toBeTruthy();
      expect(lastSheet().endsWith(`${rulesFor(name, validSvg)}\n      `)).toBeTruthy();
      expect(ruleCount()).toBe(rulesBefore + 3);
      expect(warn).not.toHaveBeenCalled();
    });

    it.each(acceptedImages)('adds the icon rules for image %p', (base64Svg, written) => {
      const name = `image-${acceptedImages.findIndex(image => image[0] === base64Svg)}`;
      const rulesBefore = ruleCount();
      const testIcon = new Icon({ icon: { name, base64Svg }, subtract: true });

      expect(testIcon.render.classList.contains(`mynah-ui-icon-${name}-subtract`)).toBeTruthy();
      expect(lastSheet().endsWith(`${rulesFor(name, written)}\n      `)).toBeTruthy();
      expect(ruleCount()).toBe(rulesBefore + 3);
    });

    it.each(rejectedImages)('adds nothing to the stylesheet for image %p', (base64Svg) => {
      const sheetsBefore = iconSheets();
      const testIcon = new Icon({ icon: { name: 'rejected-image', base64Svg } });

      expect(iconSheets()).toEqual(sheetsBefore);
      expect(iconSheets().join('')).not.toContain('rejected-image');
      expect(iconSheets().join('')).not.toContain('example.com');
      expect(iconSheets().join('')).not.toContain('marker');
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon-');
    });

    it.each(rejectedNames)('adds nothing to the stylesheet for name %p', (name) => {
      const sheetsBefore = iconSheets();
      const testIcon = new Icon({ icon: { name, base64Svg: validSvg }, subtract: true });

      expect(iconSheets()).toEqual(sheetsBefore);
      expect(iconSheets().join('')).not.toContain('marker');
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon--subtract');
    });

    it.each(builtInNames)('keeps the built-in icon rules for a custom icon named %p', (name) => {
      addIcon('before-built-in-name', validSvg);
      const sheetsBefore = iconSheets();
      const testIcon = addIcon(name, validSvg);

      expect(iconSheets()).toEqual(sheetsBefore);
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon-');
      expect(new Icon({ icon: MynahIcons.OK }).render.className).toBe('mynah-ui-icon mynah-ui-icon-ok');
    });

    it('keeps every built-in rule name out of reach of custom icons', () => {
      const sheetsBefore = iconSheets();
      // The first icon sheet holds the built-in icons only
      const builtInSheet = sheetsBefore.find(sheet => sheet.includes('--mynah-ui-icon-ok:')) ?? '';
      const ruleNames = Array.from(builtInSheet.matchAll(/\.mynah-ui-icon-([^\s{]+) \{/g)).map(match => match[1]);
      const importer = MynahUIIconImporter.getInstance();

      expect(ruleNames.length).toBe(Object.keys(MynahIcons).length * 2);
      expect(ruleNames).toEqual(expect.arrayContaining([ 'ok', 'ok-subtract', 'minus-circled', 'minus-circled-subtract' ]));
      ruleNames.forEach(name => {
        expect([ name, name.toUpperCase() ].map(variant => importer.addCustomIcon({ name: variant, base64Svg: validSvg }))).toEqual([ undefined, undefined ]);
      });
      expect(iconSheets()).toEqual(sheetsBefore);
    });

    it('does not register a rejected icon passed to the importer directly', () => {
      const importer = MynahUIIconImporter.getInstance();
      const sheetsBefore = iconSheets();

      expect(importer.addCustomIcon({ name: 'direct}', base64Svg: validSvg })).toBeUndefined();
      expect(importer.addCustomIcon({ name: 'ok', base64Svg: validSvg })).toBeUndefined();
      expect(importer.addCustomIcon({ name: 'direct-image', base64Svg: `${validSvg});}.marker{display:none}` })).toBeUndefined();
      expect(importer.addCustomIcon({ name: 'direct-image', base64Svg: 'https://example.com/icon.svg' })).toBeUndefined();
      expect(iconSheets()).toEqual(sheetsBefore);

      expect(importer.addCustomIcon({ name: 'direct-accepted', base64Svg: validSvg })).toBe('direct-accepted');
      expect(lastSheet().endsWith(`${rulesFor('direct-accepted', validSvg)}\n      `)).toBeTruthy();
    });

    it('writes the name it checked when the name changes between reads', () => {
      const importer = MynahUIIconImporter.getInstance();
      let reads = 0;
      const icon: any = {
        get name () {
          return reads++ === 0 ? 'checked-name' : 'x}.marker{display:none}.y';
        },
        base64Svg: validSvg,
      };

      expect(importer.addCustomIcon(icon)).toBe('checked-name');
      expect(lastSheet().endsWith(`${rulesFor('checked-name', validSvg)}\n      `)).toBeTruthy();
      expect(iconSheets().join('')).not.toContain('marker');
    });

    it('gives the element the class of the name it registered when the name changes between reads', () => {
      const flipping = (first: string, later: string): any => {
        let reads = 0;
        return {
          get name () {
            return reads++ === 0 ? first : later;
          },
          base64Svg: validSvg,
        };
      };

      const testIcon = new Icon({ icon: flipping('class-checked', 'x}.marker{display:none}.y') });
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon-class-checked');
      expect(lastSheet().endsWith(`${rulesFor('class-checked', validSvg)}\n      `)).toBeTruthy();

      const sheetsBefore = iconSheets();
      const rejectedFirst = new Icon({ icon: flipping('x y', 'class-later'), subtract: true });
      expect(rejectedFirst.render.className).toBe('mynah-ui-icon mynah-ui-icon--subtract');
      expect(iconSheets()).toEqual(sheetsBefore);
      expect(new Icon({ icon: flipping('class-rule-only', 'ok') }).render.className).toBe('mynah-ui-icon mynah-ui-icon-class-rule-only');

      testIcon.update(flipping('class-updated', 'class with spaces'));
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon-class-updated');
      expect(iconSheets().join('')).not.toContain('marker');
      expect(iconSheets().join('')).not.toContain('class-later');
    });

    it('rejects values that are not icon objects without throwing', () => {
      const importer = MynahUIIconImporter.getInstance();
      const sheetsBefore = iconSheets();
      const values: any[] = [ 'not-an-object', null, undefined, 1, true, Symbol('s') ];

      values.forEach(value => {
        expect(() => importer.addCustomIcon(value)).not.toThrow();
        expect(importer.addCustomIcon(value)).toBeUndefined();
      });
      [ null, undefined, 1 ].forEach((value: any) => {
        expect(new Icon({ icon: value }).render.className).toBe('mynah-ui-icon mynah-ui-icon-');
      });
      const throwing: any = {
        get name (): string {
          throw new Error('name');
        },
        base64Svg: validSvg,
      };
      expect(new Icon({ icon: throwing }).render.className).toBe('mynah-ui-icon mynah-ui-icon-');
      expect(new Icon({ icon: 'not-an-object' as any }).render.className).toBe('mynah-ui-icon mynah-ui-icon-not-an-object');
      expect(iconSheets()).toEqual(sheetsBefore);
      warn.mock.calls.forEach(call => expect(String(call[0])).not.toContain(validSvg));
    });

    it('warns once for many icon objects with the same rejected name', () => {
      for (let i = 0; i < 100; i++) {
        addIcon('same rejected name', `${validSvg}?${i}`);
      }

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]).toEqual([ 'Custom icon "same rejected name" was not registered: its name or image is not in the accepted format' ]);
    });

    it('forgets the oldest reported names once 100 have been reported', () => {
      const names = Array.from({ length: 150 }, (_, i) => `bounded ${i}`);
      names.forEach(name => addIcon(name, validSvg));
      expect(warn).toHaveBeenCalledTimes(150);

      addIcon('bounded 149', validSvg);
      addIcon('bounded 50', validSvg);
      expect(warn).toHaveBeenCalledTimes(150);

      addIcon('bounded 0', validSvg);
      expect(warn).toHaveBeenCalledTimes(151);
      expect((MynahUIIconImporter.getInstance() as any).reportedLabels.size).toBe(100);
    });

    it('warns once for a rejected icon, with a shortened name and without the image', () => {
      const icon = { name: `${'n'.repeat(100)}}`, base64Svg: `${validSvg});}.marker{display:none}` };
      const testIcon = new Icon({ icon });
      testIcon.update(MynahIcons.OK);
      testIcon.update(icon);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]).toEqual([ `Custom icon "${'n'.repeat(40)}" was not registered: its name or image is not in the accepted format` ]);

      addIcon('warned-again', 'icon.svg');
      const notAString: any = { name: [ 'x' ], base64Svg: validSvg };
      addIcon(notAString.name, notAString.base64Svg);
      expect(warn.mock.calls.slice(1)).toEqual([
        [ 'Custom icon "warned-again" was not registered: its name or image is not in the accepted format' ],
        [ 'Custom icon object was not registered: its name or image is not in the accepted format' ],
      ]);
    });

    it('adds nothing to the stylesheet for values that are not strings', () => {
      const sheetsBefore = iconSheets();
      const icons: any[] = [
        { name: 'not-a-string', base64Svg: [ validSvg ] },
        { name: 'not-a-string', base64Svg: { toString: () => validSvg } },
        { name: 'not-a-string', base64Svg: undefined },
        { name: [ 'not-a-string' ], base64Svg: validSvg },
        { name: 1, base64Svg: validSvg },
        { name: null, base64Svg: validSvg },
      ];

      icons.forEach(icon => {
        expect(new Icon({ icon }).render.className).toBe('mynah-ui-icon mynah-ui-icon-');
      });
      expect(iconSheets()).toEqual(sheetsBefore);
    });

    it('keeps other icons intact after a rejected icon', () => {
      addIcon('kept-before', validSvg);
      addIcon('x}', validSvg);
      addIcon('dropped', `${validSvg});}`);
      const rulesBefore = ruleCount();
      addIcon('kept-after', validSvg);

      expect(lastSheet()).toContain(rulesFor('kept-before', validSvg));
      expect(lastSheet()).toContain(rulesFor('kept-after', validSvg));
      expect(lastSheet()).not.toContain('dropped');
      expect(ruleCount()).toBe(rulesBefore + 3);
      expect(new Icon({ icon: MynahIcons.OK }).render.classList.contains('mynah-ui-icon-ok')).toBeTruthy();
    });

    it('switches to and from a rejected icon on update', () => {
      const testIcon = new Icon({ icon: MynahIcons.DESKTOP });

      testIcon.update({ name: 'x y', base64Svg: validSvg });
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon-');

      testIcon.update({ name: 'after-rejected', base64Svg: validSvg });
      expect(testIcon.render.className).toBe('mynah-ui-icon mynah-ui-icon-after-rejected');
    });

    it('does not add rules again for an icon registered with the same image', () => {
      addIcon('registered-twice', validSvg);
      const sheetsBefore = iconSheets();
      addIcon('registered-twice', validSvg);
      addIcon('registered-twice', `"${validSvg}"\n`);

      expect(iconSheets()).toEqual(sheetsBefore);
    });

    it('replaces the image of an icon registered again with another image', () => {
      const otherSvg = 'data:image/svg+xml;base64,PHN2Zy8+';
      addIcon('registered-again', validSvg);
      const rulesBefore = ruleCount();
      addIcon('registered-again', otherSvg);

      expect(lastSheet()).toContain(rulesFor('registered-again', otherSvg));
      expect(lastSheet()).not.toContain(rulesFor('registered-again', validSvg));
      expect(ruleCount()).toBe(rulesBefore);
    });
  });
});
