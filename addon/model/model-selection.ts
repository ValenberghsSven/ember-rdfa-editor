import Model from "@lblod/ember-rdfa-editor/model/model";
import {isElement} from "@lblod/ember-rdfa-editor/utils/dom-helpers";
import ModelText, {TextAttribute} from "@lblod/ember-rdfa-editor/model/model-text";
import ModelNode from "@lblod/ember-rdfa-editor/model/model-node";
import {MisbehavedSelectionError, NotImplementedError, SelectionError} from "@lblod/ember-rdfa-editor/utils/errors";
import {analyse} from '@lblod/marawa/rdfa-context-scanner';
import ModelNodeFinder from "@lblod/ember-rdfa-editor/model/util/model-node-finder";
import ModelRange from "@lblod/ember-rdfa-editor/model/model-range";
import ModelPosition from "@lblod/ember-rdfa-editor/model/model-position";
import {PropertyState, RelativePosition} from "@lblod/ember-rdfa-editor/model/util/types";

/**
 * Utility interface describing a selection with an non-null anchor and focus
 */
interface WellbehavedSelection extends ModelSelection {
  anchor: ModelPosition;
  focus: ModelPosition;
  lastRange: ModelRange;
}

/**
 * Just like the {@link Model} is a representation of the document, the ModelSelection is a representation
 * of the document selection.
 */
export default class ModelSelection {

  commonAncestor: ModelNode | null = null;
  domSelection: Selection | null = null;
  private _ranges: ModelRange[];
  private model: Model;
  private _isRightToLeft: boolean;

  /**
   * Utility typeguard to check if a selection has and anchor and a focus, as without them
   * most operations that work on selections probably have no meaning.
   * @param selection
   */
  static isWellBehaved(selection: ModelSelection): selection is WellbehavedSelection {
    return !!(selection.anchor && selection.focus);
  }

  constructor(model: Model) {
    this.model = model;
    this._ranges = [];
    this._isRightToLeft = false;
  }

  /**
   * The focus is the leftmost position of the selection if the selection
   * is left-to-right, and the rightmost position otherwise
   */
  get focus(): ModelPosition | null {
    if (!this.lastRange) {
      return null;
    }
    if (this.isRightToLeft) {
      return this.lastRange.start;
    }
    return this.lastRange.end;
  }

  set focus(value: ModelPosition | null) {
    if (!value) {
      return;
    }
    this._isRightToLeft = false;
    if (!this.lastRange) {
      this.addRange(new ModelRange(value));
    } else if (!this.anchor) {
      this.lastRange.start = value;
      this.lastRange.end = value;
    } else if (this.anchor.compare(value) === RelativePosition.AFTER) {
      this._isRightToLeft = true;
      this.lastRange.start = value;
    } else {
      this.lastRange.end = value;
    }
  }

  /**
   * The anchor is the rightmost position of the selection if the selection
   * is left-to-right, and the leftmost position otherwise
   */
  get anchor(): ModelPosition | null {
    if (!this.lastRange) {
      return null;
    }
    if (this.isRightToLeft) {
      return this.lastRange.end;
    }
    return this.lastRange.start;
  }

  set anchor(value: ModelPosition | null) {
    if (!value) {
      return;
    }
    this._isRightToLeft = false;
    if (!this.lastRange) {
      this.addRange(new ModelRange(value));
    } else if (!this.focus) {
      this.lastRange.start = value;
      this.lastRange.end = value;
    } else if (this.focus.compare(value) === RelativePosition.BEFORE) {
      this._isRightToLeft = true;
      this.lastRange.end = value;
    } else {
      this.lastRange.start = value;
    }
  }

  /**
   * Get the last range. This range has a somewhat special function as it
   * determines the anchor and focus positions of the selection
   */
  get lastRange() {
    if (this._ranges.length) {
      return this._ranges[this._ranges.length - 1];
    } else {
      return null;
    }
  }

  /**
   * The selected {@link Range Ranges}
   */
  get ranges(): ModelRange[] {
    return this._ranges;
  }

  set ranges(value: ModelRange[]) {
    this._isRightToLeft = false;
    this._ranges = value;
  }

  /**
   * Whether the selection is right-to-left (aka backwards)
   */
  get isRightToLeft() {
    return this._isRightToLeft;
  }

  set isRightToLeft(value: boolean) {
    this._isRightToLeft = value;
  }


  /**
   * Append a range to this selection's ranges
   * @param range
   */
  addRange(range: ModelRange) {
    this._ranges.push(range);
  }

  /**
   * Remove all ranges of this selection
   */
  clearRanges() {
    this._isRightToLeft = false;
    this._ranges = [];
  }

  /**
   * Gets the range at index
   * @param index
   */
  getRangeAt(index: number) {
    return this._ranges[index];
  }

  /**
   * @return whether the selection is collapsed
   */
  get isCollapsed() {
    if (!(this.anchor && this.focus)) {
      return true;
    }
    return this.anchor.sameAs(this.focus);
  }


  get bold(): PropertyState {
    return this.getTextPropertyStatus("bold");
  }

  get italic(): PropertyState {
    return this.getTextPropertyStatus("italic");
  }

  get underline(): PropertyState {
    return this.getTextPropertyStatus("underline");
  }

  get strikethrough(): PropertyState {
    return this.getTextPropertyStatus("strikethrough");
  }

  get rdfaSelection() {
    if (!this.domSelection) return;
    return this.calculateRdfaSelection(this.domSelection);
  }

  get subtree() {
    if (!this.domSelection) return;
    let subtree = this.domSelection.getRangeAt(0).commonAncestorContainer;
    if (!isElement(subtree)) {
      subtree = subtree.parentElement!;
    }
    return subtree;
  }

  getCommonAncestor(): ModelPosition | null {
    if (!this.lastRange) {
      return null;
    }
    return this.lastRange.getCommonAncestor();
  }

  /**
   * Generic method for determining the status of a textattribute in the selection.
   * The status is as follows:
   * TODO: test this instead of writing it in comments, as this will inevitably get out of date
   *
   * collapsed selection
   * ----
   * in textnode with attribute -> ENABLED
   * in textnode without attribute -> DISABLED
   * not in textnode -> UNKNOWN
   *
   * uncollapsed selection
   * ----
   * all selected textnodes have attribute -> ENABLED
   * some selected textnodes have attribute, some don't -> UNKNOWN
   * none of the selected textnodes have attribute -> DISABLED
   *
   * @param property
   */
  getTextPropertyStatus(property: TextAttribute): PropertyState {
    const anchorNode = this.anchor?.parent;
    const focusNode = this.focus?.parent;

    if (!anchorNode) {
      throw new NotImplementedError("Cannot get textproperty of selection without anchorNode");
    }

    if (this.isCollapsed) {
      if (!ModelNode.isModelText(anchorNode)) {
        return PropertyState.unknown;
      }
      return anchorNode.getTextAttribute(property) ? PropertyState.enabled : PropertyState.disabled;
    } else {
      const nodeFinder = new ModelNodeFinder<ModelText>({
          startNode: anchorNode,
          endNode: focusNode,
          rootNode: this.model.rootModelNode,
          nodeFilter: ModelNode.isModelText,
        }
      );
      const first = nodeFinder.next()?.getTextAttribute(property);
      for (const node of nodeFinder) {
        if (node.getTextAttribute(property) !== first) {
          return PropertyState.unknown;
        }
      }
      return first ? PropertyState.enabled : PropertyState.disabled;
    }

  }

  /**
   * Collapse the selection into a caret
   * @param toLeft whether the caret should end up at the beginning of the selection, defaults to false
   */
  collapse(toLeft: boolean = false) {
    if (toLeft) {
      this.anchor = this.focus;
    } else {
      this.focus = this.anchor;
    }
  }

  /**
   * Select a full ModelText node
   * @param node
   */
  selectNode(node: ModelNode) {
    this.clearRanges();
    const start = ModelPosition.fromParent(this.model.rootModelNode, node, 0);
    const end = ModelPosition.fromParent(this.model.rootModelNode, node, node.length);
    this.addRange(new ModelRange(start, end));
  }

  calculateRdfaSelection(selection: Selection) {
    if (selection.type === 'Caret') {
      if (!selection.anchorNode) {
        throw new SelectionError("Selection has no anchorNode");
      }
      return analyse(selection.anchorNode);
    } else {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      return analyse(commonAncestor);
    }

  }

}