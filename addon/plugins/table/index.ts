import { WidgetSpec } from '@lblod/ember-rdfa-editor/core/prosemirror';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/option';
import { keymap } from 'prosemirror-keymap';
import { NodeSelection, Plugin, TextSelection } from 'prosemirror-state';

import {
  addRow,
  CellSelection,
  goToNextCell,
  isInTable,
  moveCellForward,
  selectedRect,
  tableEditing,
} from 'prosemirror-tables';
import { findNextCell, selectionCell } from './utils';

export { tableNodes } from './table-nodes';

export const tableMenu: WidgetSpec = {
  componentName: 'plugins/table/table-menu',
  desiredLocation: 'toolbarMiddle',
};
export const tablePlugin: Plugin = tableEditing({
  allowTableNodeSelection: false,
});

export const tableKeymap = keymap({
  Tab: (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    if (dispatch) {
      let transaction = state.tr;
      let cell = findNextCell(
        unwrap(selectionCell(state.selection as CellSelection | NodeSelection)),
        1
      );
      if (!cell) {
        const rect = selectedRect(state);
        transaction = addRow(transaction, rect, rect.bottom);
        cell = unwrap(
          findNextCell(
            unwrap(
              selectionCell(
                transaction.selection as CellSelection | NodeSelection
              )
            ),
            1
          )
        );
      }
      const $cell = transaction.doc.resolve(cell);
      dispatch(
        transaction
          .setSelection(TextSelection.between($cell, moveCellForward($cell)))
          .scrollIntoView()
      );
    }
    return true;
  },
  'Shift-Tab': goToNextCell(-1),
});