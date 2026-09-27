import { twMerge } from 'tailwind-merge';

import { ReactComponent as AddIcon } from '@renderer/assets/icons/add.svg';

type AddButtonProps = React.HTMLAttributes<HTMLButtonElement> & {
  disabled?: boolean;
  wrapperClassName?: string;
};

export const AddButton: React.FC<AddButtonProps> = ({
  className,
  disabled,
  wrapperClassName,
  ...props
}) => {
  return (
    <div className={twMerge('ml-auto flex', wrapperClassName)}>
      <button
        {...props}
        disabled={disabled}
        type="button"
        className={twMerge('disabled:opacity-40', className)}
      >
        <AddIcon className="size-5 shrink-0" />
      </button>
    </div>
  );
};
