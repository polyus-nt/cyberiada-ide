import React from 'react';

import { Actions, Trigger, Condition } from './components';
import { useEditEvent } from './hooks';

type EditEventModalProps = {
  onOpenActionsView: (actionIndex: number | null) => void;
} & ReturnType<typeof useEditEvent>;

export const EditEventModal: React.FC<EditEventModalProps> = (props) => {
  const { trigger, condition, actions, showCondition, event, error } = props;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <Trigger event={event} {...trigger} />
      {showCondition && <Condition {...condition} />}
      <div className="min-h-0 flex-1">
        <Actions
          event={event}
          {...actions}
          disabled={!!error}
          {...{
            onAddAction: () => props.onOpenActionsView(null),
            onChangeAction: (action) => {
              const idx = actions.actions.findIndex(
                (a) =>
                  a.component === action.component &&
                  a.method === action.method &&
                  JSON.stringify(a.args) === JSON.stringify(action.args)
              );
              props.onOpenActionsView(idx !== -1 ? idx : null);
            },
          }}
        />
      </div>
      {error && <div className="text-error">{error}</div>}
    </div>
  );
};
