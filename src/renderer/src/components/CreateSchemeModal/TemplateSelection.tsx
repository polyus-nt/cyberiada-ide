import React, { useEffect, useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { useModelContext } from '@renderer/store/ModelContext';
import { TemplatesList } from '@renderer/types/templates';

import { ScrollArea } from '../UI';

interface TemplateSelectionProps {
  selectedTemplate: { type: string; name: string } | null;
  setSelectedTemplate: (value: { type: string; name: string }) => void;
  onDoubleClick?: () => void;
}

export const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  selectedTemplate,
  setSelectedTemplate,
  onDoubleClick,
}) => {
  const modelController = useModelContext();

  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState({} as TemplatesList);

  const isSelected = (type: string, name: string) =>
    selectedTemplate?.type === type && selectedTemplate?.name === name;

  useEffect(() => {
    const fn = async () => {
      const data = await modelController.files.getAllTemplates();

      setTemplates(data);
      setIsLoading(false);
    };

    fn();
  }, [modelController.files]);

  if (isLoading) {
    return <div>Загружаю...</div>;
  }

  return (
    <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-6">
      <ScrollArea
        className="h-[140px] rounded-lg border border-border-primary bg-bg-control"
        viewportClassName="px-[7px] scrollbar-thumb-scrollbar-thumb"
      >
        {Object.entries(templates).flatMap(([type, names]) =>
          names.map((name) => (
            <button
              key={`${type}-${name}`}
              type="button"
              className={twMerge(
                'flex w-full cursor-pointer select-none rounded-lg px-3 py-[5px] text-left leading-4 transition-colors hover:bg-bg-hover',
                isSelected(type, name) && 'bg-bg-active'
              )}
              onClick={() => setSelectedTemplate({ type, name })}
              onDoubleClick={onDoubleClick}
            >
              {type} - {name}
            </button>
          ))
        )}
      </ScrollArea>

      <div>
        <h2 className="mb-[11px] font-medium">Описание</h2>
        <p className="leading-4 text-text-inactive">Описание отсутствует</p>
      </div>
    </div>
  );
};
