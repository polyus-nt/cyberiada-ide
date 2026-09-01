import { twMerge } from 'tailwind-merge';

import { ReactComponent as SubIcon } from '@renderer/assets/icons/subtract.svg';

type SubButtonProps = React.HTMLAttributes<HTMLButtonElement> & { disabled?: boolean };

export const SubButton: React.FC<SubButtonProps> = ({ className, disabled, ...props }) => {
  return (
    <div className="ml-auto flex">
      <button
        {...props}
        disabled={disabled}
        type="button"
        className={twMerge('opacity-70 disabled:opacity-40', className)}
      >
        <SubIcon className="shrink-0" />
      </button>
    </div>
  );
};
