import { twMerge } from 'tailwind-merge';

interface PictoProps {
  leftIcon: React.ReactNode | string;
  rightIcon: React.ReactNode | string;
  className?: string;
}

export const Picto: React.FC<PictoProps> = ({ leftIcon, rightIcon, className }) => {
  return (
    <div className="flex flex-shrink-0 select-none items-center">
      <div className={twMerge('rounded-l-lg bg-[#5f5f5f] px-4 py-2', className && className)}>
        {typeof leftIcon === 'string' ? (
          <img className="size-5 object-contain" src={leftIcon} />
        ) : (
          leftIcon
        )}
      </div>
      <div className="w-[2px] self-stretch bg-border-primary" />
      <div className={twMerge('rounded-r-lg bg-[#5f5f5f] px-4 py-2', className && className)}>
        {typeof rightIcon === 'string' ? (
          <img className="size-5 object-contain" src={rightIcon} />
        ) : (
          rightIcon
        )}
      </div>
    </div>
  );
};
