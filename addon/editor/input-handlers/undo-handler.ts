import {InputHandler} from "@lblod/ember-rdfa-editor/editor/input-handlers/input-handler";
import PernetRawEditor from "@lblod/ember-rdfa-editor/utils/ce/pernet-raw-editor";
import {HandlerResponse} from "@lblod/ember-rdfa-editor/editor/input-handlers/handler-response";

export default class UndoHandler extends InputHandler {
  constructor({rawEditor}: {rawEditor: PernetRawEditor}) {
    super(rawEditor);
  }

  isHandlerFor(event: KeyboardEvent): boolean {
    return event.type === "keydown" && (event.ctrlKey || event.metaKey) && event.key === "z";
  }

  handleEvent(/* event: KeyboardEvent */): HandlerResponse {
    this.rawEditor.undo();
    return {allowPropagation: false, allowBrowserDefault: true};
  }
}
