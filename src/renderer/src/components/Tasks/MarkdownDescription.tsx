import React from 'react';

import type { Root } from 'mdast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import './taskMarkdown.css';

import type { CatalogTask } from '../../../../common/tasks';

// The task title is already shown in the card above the description.
const omitLeadingTitle = () => (tree: Root) => {
  if (tree.children[0]?.type === 'heading' && tree.children[0].depth === 1) {
    tree.children.shift();
  }
};

export const MarkdownDescription: React.FC<{
  task: CatalogTask;
  assetRootUrl: string;
  isExpanded?: boolean;
}> = ({ task, assetRootUrl, isExpanded = true }) => (
  <div className="task-markdown min-w-0 text-xs leading-5">
    <Markdown
      remarkPlugins={[remarkGfm, omitLeadingTitle]}
      skipHtml
      urlTransform={(url, key) => {
        if (key === 'href') return /^(https?:|mailto:)/i.test(url) ? url : undefined;
        if (key !== 'src' || !assetRootUrl) return undefined;
        try {
          if (/^(?:[a-z][a-z0-9+.-]*:|[\\/])/i.test(url)) return undefined;
          const source = new URL(url, task.assetBaseUrl).toString();
          return source.startsWith(assetRootUrl) ? source : undefined;
        } catch {
          return undefined;
        }
      }}
      components={{
        a: ({ href, children }) =>
          href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={isExpanded ? 0 : -1}>
              {children}
            </a>
          ) : (
            <span>{children}</span>
          ),
        img: ({ src, alt, title }) =>
          src ? (
            <img src={src} alt={alt ?? ''} title={title} />
          ) : (
            <span className="text-error">Недоступное изображение: {alt}</span>
          ),
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {task.description}
    </Markdown>
  </div>
);
