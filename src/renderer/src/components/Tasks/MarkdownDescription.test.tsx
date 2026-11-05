import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MarkdownDescription } from './MarkdownDescription';

import type { CatalogTask } from '../../../../common/tasks';

const renderDescription = (description: string, isExpanded = true) => {
  const task: CatalogTask = {
    schemaVersion: 1,
    id: 'example',
    version: 1,
    title: 'Название задачи',
    summary: 'Описание',
    description,
    platformId: 'junior-reader',
    tests: [],
    assetBaseUrl: 'file:///catalog/task/statement/',
  };
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    createElement(MarkdownDescription, { task, assetRootUrl: 'file:///catalog/', isExpanded })
  );
  return container;
};

describe('MarkdownDescription', () => {
  it('renders headings, paragraphs, emphasis, nested lists and quotes as Markdown', () => {
    const view = renderDescription(
      '# Название задачи\n\n## Условие\n\nПервая строка\nпродолжение **жирным**, *курсивом* и `кодом`.\n\n1. Первый\n   - Вложенный\n2. Второй\n\n> Подсказка\n\n---'
    );
    expect(view.querySelector('h1')).toBeNull();
    expect(view.querySelector('h2')?.textContent).toBe('Условие');
    expect(view.querySelector('p')?.textContent).toContain('Первая строка\nпродолжение');
    expect(view.querySelector('strong')?.textContent).toBe('жирным');
    expect(view.querySelector('em')?.textContent).toBe('курсивом');
    expect(view.querySelector('code')?.textContent).toBe('кодом');
    expect(view.querySelector('ol > li > ul > li')?.textContent).toBe('Вложенный');
    expect(view.querySelector('blockquote')?.textContent).toContain('Подсказка');
    expect(view.querySelector('hr')).not.toBeNull();
  });

  it('preserves whitespace and literal Markdown in fenced code blocks', () => {
    const code = '··●··\n  ·●·\n**literal**\n![image](missing.png)\n';
    const view = renderDescription('```text\n' + code + '```');
    expect(view.querySelector('pre > code')?.textContent).toBe(code);
    expect(view.querySelector('code')?.className).toBe('language-text');
    expect(view.querySelector('strong, img')).toBeNull();
  });

  it('renders GFM tables, task lists and strikethrough', () => {
    const view = renderDescription(
      '| Грань | Цвет |\n| --- | --- |\n| 1 | Красный |\n\n- [x] Готово\n- [ ] Осталось\n\n~~Устарело~~'
    );
    expect(view.querySelectorAll('thead th')).toHaveLength(2);
    expect(view.querySelector('tbody td')?.textContent).toBe('1');
    expect(view.querySelector('table')?.parentElement?.className).toBe('overflow-x-auto');
    const checkboxes = view.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
    expect(checkboxes[0].disabled).toBe(true);
    expect(view.querySelector('del')?.textContent).toBe('Устарело');
  });

  it('resolves inline and reference images relative to the description directory', () => {
    const view = renderDescription(
      'Поле ![Пример](<field image.png> "Название")\n\n![Схема][map]\n\n[map]: ../map.png'
    );
    const images = view.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0].src).toBe('file:///catalog/task/statement/field%20image.png');
    expect(images[0].title).toBe('Название');
    expect(images[1].src).toBe('file:///catalog/task/map.png');
  });

  it.each([
    'https://example.com/image.png',
    'file:///catalog/image.png',
    '//example.com/image.png',
    '/catalog/image.png',
    '../../../outside.png',
    '../../../catalog-other/image.png',
    'data:image/png;base64,AAAA',
  ])('rejects images outside the allowed local catalog: %s', (url) => {
    const view = renderDescription(`![Поле](${url})`);
    expect(view.querySelector('img')).toBeNull();
    expect(view.textContent).toContain('Недоступное изображение');
  });

  it('opens web links separately, disables hidden links and ignores unsafe URLs and HTML', () => {
    const markdown =
      '[Справка](https://example.com/help)\n\n[Опасная](javascript:alert%281%29)\n\n[Файл](file:///etc/passwd)\n\n<script>alert(1)</script>\n\n<img src="https://example.com/tracker.png" onerror="alert(1)">';
    const view = renderDescription(markdown);
    const links = view.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('https://example.com/help');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toBe('noopener noreferrer');
    expect(view.querySelector('script, img')).toBeNull();
    expect(renderDescription(markdown, false).querySelector('a')?.tabIndex).toBe(-1);
  });
});
