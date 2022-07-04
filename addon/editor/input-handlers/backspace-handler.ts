import { InputHandler } from './input-handler';
import RawEditor from '@lblod/ember-rdfa-editor/utils/ce/raw-editor';
import { isKeyDownEvent } from '@lblod/ember-rdfa-editor/editor/input-handlers/event-helpers';
import ModelRange from '@lblod/ember-rdfa-editor/model/model-range';
import ModelNode from '@lblod/ember-rdfa-editor/model/model-node';
import GenTreeWalker from '@lblod/ember-rdfa-editor/model/util/gen-tree-walker';
import { toFilterSkipFalse } from '@lblod/ember-rdfa-editor/model/util/model-tree-walker';

/**
 * EnterHandler, an event handler to handle the generic enter case.
 *
 * @module contenteditable-editor
 * @class EnterHandler
 * @constructor
 */
export default class BackspaceHandler extends InputHandler {
  constructor({ rawEditor }: { rawEditor: RawEditor }) {
    super(rawEditor);
  }

  isHandlerFor(event: Event) {
    return isKeyDownEvent(event) && event.key === 'Backspace';
  }

  handleEvent(_: KeyboardEvent) {
    let range = this.rawEditor.selection.lastRange;
    if (range) {
      if (range.collapsed) {
        const newStart = range.start.shiftedVisually(-1);
        const newEnd = range.start;
        range = new ModelRange(newStart, newEnd);
        const nextNode = GenTreeWalker.fromRange({
          range: range,
          reverse: true,
        }).nextNode();
        if (
          !ModelNode.isModelElement(nextNode) ||
          nextNode.getRdfaAttributes().isEmpty
        ) {
          this.rawEditor.executeCommand('remove', range);
        } else {
          this.rawEditor.model.change(() => {
            this.rawEditor.model.selectRange(new ModelRange(newStart));
          });
        }
      } else {
        this.rawEditor.executeCommand('remove', range);
      }
    }

    return { allowPropagation: true, allowBrowserDefault: false };
  }
}
