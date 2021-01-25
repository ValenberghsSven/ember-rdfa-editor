import ModelElement from "@lblod/ember-rdfa-editor/model/model-element";
import ModelNode from "@lblod/ember-rdfa-editor/model/model-node";
import {ModelError, PositionError, SelectionError} from "@lblod/ember-rdfa-editor/utils/errors";
import {RelativePosition} from "@lblod/ember-rdfa-editor/model/util/types";
import ArrayUtils from "@lblod/ember-rdfa-editor/model/util/array-utils";

/**
 * Represents a single position in the model. In contrast to the dom,
 * where a position is defined as a {@link Node} and an offset, we represent a position
 * here as a path of offsets from the root. The definition of these offsets is subject to change.
 */
export default class ModelPosition {
  private _path: number[];
  private _root: ModelElement;
  private parentCache: ModelNode | null = null;


  /**
   * Build a position from a rootNode and a path
   * @param root
   * @param path
   */
  static from(root: ModelElement, path: number[]) {
    const result = new ModelPosition(root);
    result.path = path;
    return result;
  }

  /**
   * Build a position from a root, a parent and an offset. Especially useful for converting
   * from a DOM position
   * @param root
   * @param parent
   * @param offset
   */
  static fromParent(root: ModelElement, parent: ModelNode, offset: number): ModelPosition {
    if (offset < 0 || offset > parent.length) {
      throw new SelectionError("offset out of range");
    }
    const result = new ModelPosition(root);
    result.path = parent.getIndexPath();
    result.path.push(offset);
    return result;
  }

  static getCommonAncestor(pos1: ModelPosition, pos2: ModelPosition): ModelPosition | null {
    if(pos1.root !== pos2.root) {
      return null;
    }
    const commonPath = ArrayUtils.findCommonSlice(pos1.path, pos2.path);

    return ModelPosition.from(pos1.root, commonPath);
  }

  constructor(root: ModelElement) {
    this._root = root;
    this._path = [];
  }

  /**
   * The path of offsets from this position's root node
   */
  get path(): number[] {
    return this._path;
  }

  set path(value: number[]) {
    this._path = value;
    this.parentCache = null;
  }

  get parent(): ModelNode {
    if(this.parentCache) {
      return this.parentCache;
    }
    let cur: ModelNode = this.root;
    for (let i = 0; i < this.path.length - 1; i++) {
      if (ModelNode.isModelElement(cur)) {
        cur = cur.children[this.path[i]];
      } else {
        this.parentCache = cur;
        return cur;
      }
    }
    this.parentCache = cur;
    return cur;
  }

  /**
   * Get the first ancestor which is a ModelElement
   */
  get parentElement(): ModelElement {
    const parent = this.parent;
    if(ModelNode.isModelElement(parent)) {
      return parent;
    } else {
      const result = parent.parent;
      if (!result) {
        throw new ModelError("Unexpected textnode without parent");
      }
      return result;
    }
  }

  /**
   * Root node of the position. In practice, this is almost always the same as the model root,
   * but it does not have to be (e.g. to support multiple model trees).
   */
  get root(): ModelElement {
    return this._root;
  }

  /**
   * Get the offset from the parent, equivalent to a DOM position offset
   */
  get parentOffset(): number {
    return this.path[this.path.length - 1];
  }

  /**
   * Check if two modelpositions describe the same position
   * @param other
   */
  sameAs(other: ModelPosition): boolean {
    return this.compare(other) === RelativePosition.EQUAL;
  }

  /**
   * Compare this position to another and see if it comes before, after, or is the same position
   * @param other
   */
  compare(other: ModelPosition): RelativePosition {
    if (this.root !== other.root) {
      throw new PositionError("cannot compare nodes with different roots");
    }
    return ModelPosition.comparePath(this.path, other.path);
  }

  getCommonAncestor(other: ModelPosition): ModelPosition | null {
    return ModelPosition.getCommonAncestor(this, other);
  }

  /**
   * Compare two paths and determine their order. A parent is considered to be in front of its children
   * @param path1
   * @param path2
   */
  static comparePath(path1: number[], path2: number[]): RelativePosition {

    for (const [i, offset] of path1.entries()) {
      if (i < path2.length) {
        if (offset < path2[i]) {
          return RelativePosition.BEFORE;
        } else if (offset > path2[i]) {
          return RelativePosition.AFTER;
        }
      }
    }
    if (path1.length < path2.length) {
      return RelativePosition.BEFORE;
    } else if (path1.length > path2.length) {
      return RelativePosition.AFTER;
    }
    return RelativePosition.EQUAL;

  }

}