import { twMerge } from 'tailwind-merge';

interface TabsProps {
  tabs: string[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
  variant?: 'underline' | 'pill';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value,
  onChange,
  className,
  variant = 'underline',
}) => {
  return (
    <div className={twMerge('flex', className)}>
      {tabs.map((tab, i) => (
        <button
          key={tab}
          className={twMerge(
            variant === 'underline'
              ? 'border-b-2 border-transparent px-6 py-1 hover:bg-bg-hover'
              : 'rounded-lg px-3 py-[5px] font-medium leading-4 transition-colors hover:bg-bg-hover',
            value === i && (variant === 'underline' ? 'border-primary' : 'bg-bg-active')
          )}
          onClick={() => onChange(i)}
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
