import Model from "@lblod/ember-rdfa-editor/model/model";
import ModelSelection from "@lblod/ember-rdfa-editor/model/model-selection";
import {getWindowSelection} from "@lblod/ember-rdfa-editor/utils/dom-helpers";

export default class ModelTestContext {

  rootNode!: HTMLElement;
  model!: Model;
  modelSelection!: ModelSelection;
  domSelection!: Selection;

  reset() {
    this.rootNode = document.createElement("div");
    this.model = new Model();
    this.model.rootNode = this.rootNode;
    this.model.read();
    this.model.write();
    this.modelSelection = this.model.selection;
    this.domSelection = getWindowSelection();

  }
}