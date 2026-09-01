import React, { useState, useEffect } from 'react';

import { AttributeConstSwitch } from '@renderer/components/AttributeConstSwitch';
import { ComponentFormFieldLabel } from '@renderer/components/ComponentFormFieldLabel';
import { ParameterSelect, ParameterSelectOption, ScrollArea } from '@renderer/components/UI';
import { CanvasController } from '@renderer/lib/data/ModelController/CanvasController';
import { isVariable } from '@renderer/lib/utils';
import { ArgList, Variable } from '@renderer/types/diagram';
import { ArgType, ArgumentProto } from '@renderer/types/platform';
import {
  createEmptyMatrix,
  formatArgType,
  getDefaultRange,
  getMatrixDimensions,
  isMatrix,
} from '@renderer/utils';
import { getComponentAttribute } from '@renderer/utils/ComponentAttribute';

import { MatrixWidget } from './MatrixWidget';

interface ActionsModalParametersProps {
  protoParameters: ArgumentProto[];
  parameters: ArgList;
  setParameters: (data: ArgList) => void;

  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  componentOptions: ParameterSelectOption[];
  attributeOptionsSearch: (selectedParameterComponent: string | null) => ParameterSelectOption[];

  smId: string;
  controller: CanvasController;
}

export const ActionsModalParameters: React.FC<ActionsModalParametersProps> = ({
  protoParameters,
  parameters,
  setParameters,
  errors,
  setErrors,
  componentOptions,
  attributeOptionsSearch,
  smId,
  controller,
}) => {
  const handleInputChange = (name: string, order: number, value: string | Variable) => {
    setErrors((p) => ({ ...p, [name]: '' }));
    if (parameters[name]) {
      parameters[name].value = value;
    } else {
      parameters[name] = { value, order };
    }
    setParameters({ ...parameters });
  };

  const handleComponentAttributeChange = (
    name: string,
    order: number,
    component: string,
    attribute: string
  ) => {
    let inputValue: string | Variable = '';
    if (component || attribute) {
      inputValue = {
        component: component,
        method: attribute,
      };
      // const proto = controller.platform[smId].getComponent(component);
      // const delimiter =
      //   proto?.singletone || platform.staticComponents ? platform.staticActionDelimeter : '.';
      // inputValue = `${component}${delimiter}${attribute}`;
    }
    handleInputChange(name, order, inputValue);
  };

  const [isChecked, setIsChecked] = useState<Map<string, boolean>>(new Map());

  // Initialize `isChecked` from `parameters` and `protoParameters`.
  // Do this in an effect (not during render) to avoid mutating state while rendering
  // which could flip the switch back immediately.
  useEffect(() => {
    const map = new Map<string, boolean>();
    protoParameters.forEach((p) => {
      const val = parameters[p.name]?.value;
      if (typeof val === 'string') {
        map.set(p.name, !!getComponentAttribute(val, controller.platform[smId]));
      } else if (isVariable(val)) {
        map.set(p.name, true);
      } else {
        map.set(p.name, false);
      }
    });
    setIsChecked(map);
  }, [protoParameters, parameters, smId]);

  const onChange = (parameter: string, row: number, col: number, value: number) => {
    (parameters[parameter].value as number[][])[row][col] = value;
    setParameters({
      ...parameters,
    });
  };

  const setCheckedTo = (name: string, checked: boolean) => {
    setIsChecked((oldValue) => {
      const newValue = new Map(oldValue);
      newValue.set(name, checked);
      return newValue;
    });
  };

  const getHint = (description: string, type: ArgType) => {
    if (!type || Array.isArray(type) || isMatrix(type)) return description;
    return description + (description ? '\n' : '' + `Тип: {${formatArgType(type)}}`);
  };

  if (protoParameters.length === 0) {
    return null;
    // return <div className="flex text-text-inactive">Параметров нет</div>;
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="mb-1 text-xs">Параметры</h3>
        {protoParameters.map((proto, idx) => {
          const { name, description = '', type = '', range } = proto;
          const parameter = parameters[name] ?? { value: '', order: idx };
          const value = parameter.value;
          const error = errors[name];
          const hint = getHint(description, type);
          const label = name;
          if (Array.isArray(type)) {
            const valueAliases = proto.valueAlias;
            const options =
              valueAliases !== undefined &&
              Array.isArray(valueAliases) &&
              valueAliases.length === type.length
                ? type.map((value, index) => ({
                    label: valueAliases[index] ?? value,
                    value,
                  }))
                : type.map((value) => ({ label: value, value }));
            return (
              <ComponentFormFieldLabel
                key={name}
                label={label}
                labelClassName="whitespace-pre"
                hint={hint}
                error={error}
                childrenDivClassname="min-w-0 w-full"
              >
                <ParameterSelect
                  options={options}
                  // ReactSelect не сбрасывает внутреннее состояние на undefined.
                  value={options.find((o) => o.value === value) ?? null}
                  onChange={(option) => handleInputChange(name, idx, String(option?.value ?? ''))}
                />
              </ComponentFormFieldLabel>
            );
          }
          if (isMatrix(type)) {
            const { width, height } = getMatrixDimensions(type);
            const parsedRange = range ?? getDefaultRange();
            if (!value) {
              const newMatrix = createEmptyMatrix(type);
              parameters[name] = {
                value: newMatrix.values,
                order: idx,
              };
            }

            if (Array.isArray(value) && Array.isArray(value[0])) {
              return (
                <ComponentFormFieldLabel
                  as="div"
                  key={name}
                  label={label}
                  labelClassName="whitespace-pre"
                  hint={hint}
                  error={error}
                  name={name}
                >
                  <MatrixWidget
                    key={name}
                    {...{
                      width: width,
                      height: height,
                      values: parameters[name].value as number[][],
                      isClickable: true,
                      style: {
                        ledHeight: 12,
                        ledWidth: 12,
                        margin: 0.5,
                        border: 2,
                        isRounded: true,
                      },
                      range: parsedRange,
                      isHalf: type.startsWith('Half'),
                    }}
                    onChange={onChange.bind(this, name)}
                  />
                </ComponentFormFieldLabel>
              );
            }
          }
          const platform = controller.platform[smId];
          const currentChecked = isChecked.get(name) ?? false;
          let selectedParameterMethod: string | null = null;
          let selectedParameterComponent: string | null = null;
          if (typeof value === 'string') {
            const componentAttribute = getComponentAttribute(value, platform);
            selectedParameterComponent =
              currentChecked && componentAttribute ? componentAttribute[0] : null;
            selectedParameterMethod =
              currentChecked && componentAttribute ? componentAttribute[1] : null;
          } else if (isVariable(value)) {
            selectedParameterComponent = value.component;
            selectedParameterMethod = value.method;
            // rely on initialized state from useEffect; do not mutate during render
          }
          const attributeOptions = attributeOptionsSearch(selectedParameterComponent);
          return (
            // Clamp row height and hide overflow so visual outlines or internal focus
            // states (like react-select indicators) cannot increase the row height
            // and cause a scrollbar to appear.
            <div className={'flex min-h-[32px] items-center space-x-2 overflow-hidden'} key={name}>
              <div className="self-center">
                <AttributeConstSwitch
                  checked={currentChecked}
                  onCheckedChange={(newChecked: boolean) => {
                    setCheckedTo(name, newChecked);
                    if (newChecked) {
                      handleInputChange(name, idx, { component: '', method: '' });
                    } else {
                      handleInputChange(name, idx, '');
                    }
                  }}
                  hint={
                    currentChecked
                      ? 'Переключиться на константу'
                      : 'Переключиться на атрибут компонента'
                  }
                />
              </div>
              {/* Use ComponentFormFieldLabel here as well so the label column
                  size matches the unchecked rows. childrenDivClassname="w-full min-w-0"
                  ensures the right-side content can shrink and won't push layout. */}
              {currentChecked ? (
                <ComponentFormFieldLabel
                  as="div"
                  label={label}
                  labelClassName="whitespace-pre"
                  childrenDivClassname="w-full min-w-0"
                  hint={hint}
                  error={error}
                >
                  <div className="flex w-full gap-3">
                    {/* Use `flex-1 min-w-0` so ParameterSelect can shrink inside a flex row without forcing a wrap.
                      `h-8 box-border` keeps the control height fixed to prevent layout jumps. */}
                    <ParameterSelect
                      containerClassName={'flex-1 min-w-0 h-8 box-border'}
                      options={componentOptions}
                      onChange={(opt) =>
                        handleComponentAttributeChange(name, idx, opt?.value ?? '', '')
                      }
                      value={
                        componentOptions.find((o) => o.value === selectedParameterComponent) ?? null
                      }
                      isSearchable={false}
                      noOptionsMessage={() => 'Нет подходящих компонентов'}
                      placeholder="Выберите компонент..."
                    />
                    <ParameterSelect
                      containerClassName={'flex-1 min-w-0 h-8 box-border'}
                      options={attributeOptions}
                      onChange={(opt) =>
                        handleComponentAttributeChange(
                          name,
                          idx,
                          selectedParameterComponent ?? '',
                          opt?.value ?? ''
                        )
                      }
                      value={
                        attributeOptions.find((o) => o.value === selectedParameterMethod) ?? null
                      }
                      isSearchable={false}
                      noOptionsMessage={() => 'Нет подходящих атрибутов'}
                      placeholder="Выберите атрибут..."
                    />
                  </div>
                </ComponentFormFieldLabel>
              ) : (
                <ComponentFormFieldLabel
                  key={name}
                  label={label}
                  hint={hint}
                  error={error}
                  childrenDivClassname="w-full min-w-0"
                  value={value as string}
                  name={name}
                  placeholder="Введите значение..."
                  onChange={(e) => handleInputChange(name, idx, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
