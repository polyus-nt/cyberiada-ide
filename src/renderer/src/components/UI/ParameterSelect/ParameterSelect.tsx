import React from 'react';

import { mergeRefs } from 'react-merge-refs';
import ReactSelect, {
  components,
  GroupBase,
  MenuListProps,
  OptionProps,
  Props,
  SingleValueProps,
} from 'react-select';
import { twMerge } from 'tailwind-merge';

import { ScrollArea } from '../ScrollArea';
import { WithHint } from '../WithHint';

import './style.css';

export interface ParameterSelectOption<Value extends string | number = string> {
  value: Value;
  label: React.ReactNode;
  name?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const ParameterOption = <Value extends string | number>({
  innerRef,
  ...props
}: OptionProps<ParameterSelectOption<Value>>) => {
  const { hint, icon, label } = props.data;

  return (
    <WithHint hint={hint} placement="right" offset={7}>
      {({ ref, ...hintProps }) => (
        <components.Option innerRef={mergeRefs([innerRef, ref])} {...props} {...hintProps}>
          <div className="flex items-center">
            {icon}
            {label}
          </div>
        </components.Option>
      )}
    </WithHint>
  );
};

const ParameterSingleValue = <Value extends string | number>(
  props: SingleValueProps<ParameterSelectOption<Value>>
) => {
  const { icon, label } = props.data;

  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        {icon}
        {label}
      </div>
    </components.SingleValue>
  );
};

const ParameterMenuList = <
  Option extends ParameterSelectOption,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  children,
  innerRef,
  innerProps,
  maxHeight,
}: MenuListProps<Option, false, Group>) => {
  const { style, ...otherInnerProps } = innerProps;

  return (
    <ScrollArea
      {...otherInnerProps}
      ref={innerRef}
      className="ParameterSelect__menu-list"
      viewportClassName="mr-0"
      style={{ ...style, maxHeight }}
    >
      {children}
    </ScrollArea>
  );
};

type ParameterSelectProps<
  Option extends ParameterSelectOption,
  Group extends GroupBase<Option> = GroupBase<Option>
> = Omit<Props<Option, false, Group>, 'isMulti'> & {
  error?: string;
  containerClassName?: string;
  menuWidth?: string | number;
};

/** Compact select used for parameters with a fixed set of allowed values. */
export function ParameterSelect<
  Option extends ParameterSelectOption,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  error,
  containerClassName,
  className,
  menuWidth,
  components: customComponents,
  ...props
}: ParameterSelectProps<Option, Group>) {
  return (
    <div className={twMerge('w-full', containerClassName)}>
      <ReactSelect
        placeholder="Выберите..."
        isClearable={false}
        isSearchable={false}
        {...props}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) =>
            menuWidth === undefined
              ? base
              : { ...base, right: 0, left: 'auto', width: menuWidth },
          control: (base) => ({ ...base, minHeight: '32px', height: '32px' }),
        }}
        components={{
          MenuList: ParameterMenuList,
          Option: ParameterOption as any,
          SingleValue: ParameterSingleValue as any,
          ...customComponents,
        }}
        className={twMerge('w-full', className, error && 'error')}
        classNamePrefix="ParameterSelect"
      />
      <p className={twMerge('text-sm text-error', error && 'mt-1')}>{error}</p>
    </div>
  );
}
