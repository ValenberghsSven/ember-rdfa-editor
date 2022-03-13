import HtmlReader from '@lblod/ember-rdfa-editor/model/readers/html-reader';
import HtmlWriter from '@lblod/ember-rdfa-editor/model/writers/html-writer';
import ModelNode from '@lblod/ember-rdfa-editor/model/model-node';
import { getWindowSelection } from '@lblod/ember-rdfa-editor/utils/dom-helpers';
import { ModelError } from '@lblod/ember-rdfa-editor/utils/errors';
import ModelSelection from '@lblod/ember-rdfa-editor/model/model-selection';
import ModelElement from '@lblod/ember-rdfa-editor/model/model-element';
import SelectionReader from '@lblod/ember-rdfa-editor/model/readers/selection-reader';
import SelectionWriter from '@lblod/ember-rdfa-editor/model/writers/selection-writer';
import ImmediateModelMutator from '@lblod/ember-rdfa-editor/model/mutators/immediate-model-mutator';
import ModelRange from '@lblod/ember-rdfa-editor/model/model-range';
import ModelHistory from '@lblod/ember-rdfa-editor/model/model-history';
import {
  createLogger,
  Logger,
} from '@lblod/ember-rdfa-editor/utils/logging-utils';
import SimplifiedModel from '@lblod/ember-rdfa-editor/model/simplified-model';
import EventBus from '@lblod/ember-rdfa-editor/utils/event-bus';
import {
  ModelReadEvent,
  SelectionChangedEvent,
} from '@lblod/ember-rdfa-editor/utils/editor-event';
import MarksRegistry from '@lblod/ember-rdfa-editor/model/marks-registry';
import { MarkSpec } from '@lblod/ember-rdfa-editor/model/mark';
import { CORE_OWNER } from '@lblod/ember-rdfa-editor/model/util/constants';
import NodeView from '@lblod/ember-rdfa-editor/model/node-view';

/**
 * Abstraction layer for the DOM. This is the only class that is allowed to call DOM methods.
 * Code that needs to modify the DOM has to use a {@link Command}.
 * The model is still exposed for querying but that might become even more restricted later.
 */
export default class Model {
  /**
   * The root of the editor. This will get set by ember,
   * so we trick typescript into assuming it is never null.
   * @protected
   */
  protected _rootModelNode!: ModelElement;
  private _selection: ModelSelection;
  private _rootNode: HTMLElement;

  private reader: HtmlReader;
  private writer: HtmlWriter;
  private selectionReader: SelectionReader;
  private selectionWriter: SelectionWriter;
  private history: ModelHistory = new ModelHistory();
  private _eventBus?: EventBus;
  private _marksRegistry: MarksRegistry;

  private logger: Logger;

  private viewToModelMap: WeakMap<Node, ModelNode>;
  private modelToViewMap: WeakMap<ModelNode, NodeView>;

  constructor(rootNode: HTMLElement, eventBus?: EventBus) {
    this._rootNode = rootNode;
    this.reader = new HtmlReader(this);
    this.writer = new HtmlWriter(this);
    this.selectionReader = new SelectionReader(this);
    this.selectionWriter = new SelectionWriter(this);
    this._selection = new ModelSelection();
    this._eventBus = eventBus;
    this.logger = createLogger('RawEditor');
    this._marksRegistry = new MarksRegistry(this._eventBus);

    this.viewToModelMap = new WeakMap<Node, ModelNode>();
    this.modelToViewMap = new WeakMap<ModelNode, NodeView>();
  }

  get rootNode(): HTMLElement {
    return this._rootNode;
  }

  get selection(): ModelSelection {
    return this._selection;
  }

  get rootModelNode(): ModelElement {
    return this._rootModelNode;
  }

  get marksRegistry(): MarksRegistry {
    return this._marksRegistry;
  }

  /**
   * Read in the document and build up the model.
   */
  read(readSelection = true) {
    this.marksRegistry.clear();
    const parsedNodes = this.reader.read(this.rootNode);
    if (parsedNodes.length !== 1) {
      throw new Error('Could not create a rich root');
    }

    const newRoot = parsedNodes[0];
    if (!ModelNode.isModelElement(newRoot)) {
      throw new Error('Root model node has to be an element');
    }

    this._rootModelNode = newRoot;

    // This is essential, we change the root so we need to make sure the selection uses the new root.
    if (readSelection) {
      this.readSelection();
    }
    if (this._eventBus) {
      this._eventBus.emit(new ModelReadEvent());
    }
  }

  readSelection(domSelection: Selection = getWindowSelection()) {
    this._selection = this.selectionReader.read(domSelection);
    if (this._eventBus) {
      this._eventBus.emit(
        new SelectionChangedEvent({
          owner: CORE_OWNER,
          payload: this.selection,
        })
      );
    } else {
      this.logger(
        'Selection changed without EventBus present, no event will be fired'
      );
    }
    const modelSelectionUpdatedEvent = new CustomEvent<ModelSelection>(
      'richSelectionUpdated',
      { detail: this.selection }
    );
    document.dispatchEvent(modelSelectionUpdatedEvent);
  }

  /**
   * Write a part of the model back to the dom.
   * @param tree
   * @param writeSelection If we should also write out the selection. Should be
   * almost always true, but can be useful for testing to turn it off when you dont
   * have a real dom available.
   */
  write(tree: ModelElement = this.rootModelNode, writeSelection = true) {
    const modelWriteEvent = new CustomEvent('editorModelWrite');
    document.dispatchEvent(modelWriteEvent);
    this.rootModelNode.removeDirty('node');

    this.writer.write(this.rootModelNode);

    if (writeSelection) {
      this.writeSelection();
    }
  }

  registerMark(markSpec: MarkSpec) {
    this._marksRegistry.registerMark(markSpec);
  }

  writeSelection() {
    this.selectionWriter.write(this.selection);
  }

  /**
   * Bind a modelNode to a domNode. This ensures that we can reach the corresponding node from
   * either side.
   * @param modelNode
   * @param view
   */
  registerNodeView(modelNode: ModelNode, view: NodeView): void {
    this.viewToModelMap.set(view.viewRoot, modelNode);
    this.modelToViewMap.set(modelNode, view);
  }

  viewToModel(domNode: Node): ModelNode {
    let cur: Node | null = domNode;
    let result = null;
    while (cur && !result) {
      result = this.viewToModelMap.get(cur);
      cur = cur.parentNode;
    }
    if (!result) {
      throw new ModelError('Domnode without corresponding modelNode');
    }
    return result;
  }

  modelToView(modelNode: ModelNode): NodeView | null {
    return this.modelToViewMap.get(modelNode) || null;
  }

  /**
   * Change the model by providing a callback that will receive an {@link ImmediateModelMutator immediate mutator}.
   * The model gets written out automatically after the callback finishes.
   *
   * @param callback
   * @param writeBack
   */
  change(
    callback: (mutator: ImmediateModelMutator) => ModelElement | void,
    writeBack = true
  ) {
    const mutator = new ImmediateModelMutator(this._eventBus);
    const subTree = callback(mutator);

    if (writeBack) {
      if (subTree) {
        this.write(subTree);
      } else {
        this.write(this.rootModelNode);
      }
    }
  }

  static getChildIndex(child: Node): number | null {
    const parent = child.parentNode;
    if (!parent) {
      return null;
    }

    // More verbose but probably more efficient than converting to an array and using indexOf.
    let index = 0;
    for (const candidate of parent.childNodes) {
      if (child === candidate) {
        return index;
      }
      index++;
    }

    return null;
  }

  selectRange(range: ModelRange) {
    this.selection.selectRange(range);
  }

  toXml(): Node {
    return this.rootModelNode.toXml();
  }

  createSnapshot(): SimplifiedModel {
    const rootModelNode = this.rootModelNode.clone();
    const modelSelection = this.selection.clone(rootModelNode);

    return new SimplifiedModel(rootModelNode, modelSelection);
  }

  saveSnapshot(): void {
    const snapshot = this.createSnapshot();
    this.history.push(snapshot);
  }

  restoreSnapshot(
    snapshot: SimplifiedModel | undefined = this.history.pop(),
    writeBack = true
  ) {
    if (snapshot) {
      this._rootModelNode = snapshot.rootModelNode;
      this._selection = snapshot.modelSelection;

      if (writeBack) {
        this.write();
      }
    } else {
      this.logger('No snapshot to restore');
    }
  }
}
