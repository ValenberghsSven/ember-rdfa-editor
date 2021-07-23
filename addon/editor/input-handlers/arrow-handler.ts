import previousTextNode from "@lblod/ember-rdfa-editor/utils/ce/previous-text-node";
import nextTextNode from "@lblod/ember-rdfa-editor/utils/ce/next-text-node";
import {warn} from "@ember/debug";
import PernetRawEditor from "@lblod/ember-rdfa-editor/utils/ce/pernet-raw-editor";
import {InputHandler} from "@lblod/ember-rdfa-editor/editor/input-handlers/input-handler";

/**
 * Arrow Handler, a event handler to handle arrow keys.
 * __Note__: Currently only left and right arrow keys are supported
 *
 * @module contenteditable-editor
 * @class ArrowHandler
 * @constructor
 */
export default class ArrowHandler extends InputHandler {
  constructor({rawEditor}: {rawEditor: PernetRawEditor}) {
    super(rawEditor);
  }

  /**
   * Tests this handler can handle the specified event.
   * @method isHandlerFor
   * @param {Event} event
   * @return boolean
   * @public
   */
  isHandlerFor(event: KeyboardEvent): boolean {
    return event.type === "keydown"
      && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      && this.rawEditor.currentSelectionIsACursor;
  }

  /**
   * Handle arrow event.
   * @method handleEvent
   * @return {HandlerResponse}
   * @public
   */
  handleEvent(event: KeyboardEvent) {
    const position = this.rawEditor.currentSelection[0];

    const textNode = this.rawEditor.currentNode;
    if (!textNode) {
      return {allowPropagation: false};
    }

    const richNode = this.rawEditor.getRichNodeFor(textNode);
    if (!richNode) {
      return {allowPropagation: false};
    }

    const isLeft = event.key === "ArrowLeft";
    const isRight = !isLeft;

    if (richNode.start < position && richNode.end > position) {
      // Not at the start or end of a node.
      const relativePosition = position - richNode.start;
      if (isLeft) {
        this.rawEditor.setCaret(textNode, relativePosition - 1);
      } else {
        this.rawEditor.setCaret(textNode, relativePosition + 1);
      }
    } else if (richNode.start === position) {
      // At start of node.
      if (isLeft) {
        const newNode = previousTextNode(textNode, this.rawEditor.rootNode);
        this.rawEditor.updateRichNode();

        if (newNode && newNode.textContent) this.rawEditor.setCaret(newNode, newNode.textContent.length);
      } else {
        if (textNode.length > 1) {
          this.rawEditor.setCaret(textNode, 1);
        } else {
          const newNode = nextTextNode(textNode, this.rawEditor.rootNode);
          this.rawEditor.updateRichNode();
          this.rawEditor.setCaret(newNode, 0);
        }
      }
    } else if (richNode.end === position) {
      // At end of node.
      if (isRight) {
        const newNode = nextTextNode(textNode, this.rawEditor.rootNode);
        this.rawEditor.updateRichNode();
        this.rawEditor.setCaret(newNode, 0);
      } else {
        if (textNode.length > 1) {
          this.rawEditor.setCaret(textNode, textNode.textContent.length - 1);
        } else {
          const newNode = previousTextNode(textNode, this.rawEditor.rootNode);
          this.rawEditor.updateRichNode();

          if (newNode && newNode.textContent) this.rawEditor.setCaret(newNode, newNode.length);
        }
      }
    } else {
      warn(`Position ${position} is not inside current node.`, {id: 'contenteditable.invalid-start'});
    }

    return {allowPropagation: false};
  }
}
