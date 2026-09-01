import React, { ComponentProps, ReactNode } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as QuestionMark } from '@renderer/assets/icons/question-mark.svg';
import { WithHint } from '@renderer/components/UI';

interface ComponentFormFieldLabelProps extends ComponentProps<'input'> {
  label: string | ReactNode;
  hint?: string;
  error?: string;
  as?: 'label' | 'div';
  labelClassName?: string;
  childrenDivClassname?: string;
}

export const ComponentFormFieldLabel: React.FC<ComponentFormFieldLabelProps> = ({
  label,
  hint,
  error,
  className,
  labelClassName,
  childrenDivClassname,
  children,
  as = 'label',
  ...props
}) => {
  const Component = as;

  return (
    <div className="w-full">
      <Component className="grid w-full min-w-0 grid-cols-[max-content,minmax(0,1fr)] items-center justify-start gap-2">
        <div className={twMerge('flex w-20 gap-1', labelClassName)}>
          <span className="self-center">{label}</span>
          {hint && (
            <WithHint hint={hint}>
              {(props) => (
                <div className="shrink-0 self-center" {...props}>
                  <QuestionMark className="h-[14px] w-[14px]" />
                </div>
              )}
            </WithHint>
          )}
        </div>
        <div className={twMerge(childrenDivClassname, 'w-full min-w-0 self-center')}>
          {children || (
            <div>
              <input
                className={twMerge(
                  'h-8 w-full rounded-lg border border-border-primary bg-transparent px-2 py-1 text-text-primary outline-none focus:border-text-primary',
                  error && '!border-error text-error',
                  className
                )}
                {...props}
                value={props.value ?? ''}
              />
            </div>
          )}
          <p className="text-sm text-error">{error}</p>
        </div>
      </Component>
    </div>
  );
};
