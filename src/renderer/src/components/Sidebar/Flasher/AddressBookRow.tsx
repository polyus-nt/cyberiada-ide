import { twMerge } from 'tailwind-merge';

import { AddressData } from '@renderer/types/FlasherTypes';

interface AddressBookRowProps {
  data: AddressData;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}
export const AddressBookRow: React.FC<AddressBookRowProps> = (props) => {
  const { data, onSelect, isSelected, onEdit, onDragStart, onDrop } = props;
  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={twMerge(
        'grid min-h-9 cursor-pointer grid-cols-[minmax(120px,1fr)_160px_minmax(120px,1fr)] items-center rounded-lg px-3 py-2 transition-colors hover:bg-bg-hover',
        isSelected && 'bg-bg-active hover:bg-bg-active'
      )}
      draggable
      onClick={onSelect}
      onDoubleClick={onEdit}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="truncate pr-4" title={data.name || 'Без названия'}>
        {data.name || 'Без названия'}
      </span>
      <span className="truncate pr-4 font-Fira-Mono" title={data.address}>
        {data.address}
      </span>
      <span className="truncate" title={data.type || 'Не указан'}>
        {data.type || 'Не указан'}
      </span>
    </div>
  );
};
