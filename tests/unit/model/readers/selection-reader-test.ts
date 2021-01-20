import {module, test} from "qunit";
import Model from "@lblod/ember-rdfa-editor/model/model";
import ModelSelection from "@lblod/ember-rdfa-editor/model/model-selection";
import {getWindowSelection} from "@lblod/ember-rdfa-editor/utils/dom-helpers";
import SelectionReader from "@lblod/ember-rdfa-editor/model/readers/selection-reader";
import ModelPosition from "@lblod/ember-rdfa-editor/model/model-position";
import {SelectionError} from "@lblod/ember-rdfa-editor/utils/errors";

module("Unit | model | readers | selection-reader", hooks => {
  let model: Model;
  let rootNode: HTMLElement;
  let modelSelection: ModelSelection;
  let domSelection: Selection;
  let reader: SelectionReader;
  let testRoot;

  hooks.beforeEach(() => {
    testRoot = document.getElementById("ember-testing");
    rootNode = document.createElement("div");
    if(!testRoot) {
      throw new Error("testRoot not found");
    }
    testRoot.appendChild(rootNode);
    model = new Model();
    model.rootNode = rootNode;
    model.read();
    model.write();
    modelSelection = new ModelSelection(model);
    domSelection = getWindowSelection();
    reader = new SelectionReader(model);
  });
  const sync = () => {
    model.read();
    model.write();
  };
  test("converts a selection correctly", assert => {
    const textNode = new Text("asdf");
    rootNode.appendChild(textNode);
    sync();

    domSelection.collapse(rootNode.childNodes[0],0);
    const rslt = reader.read(domSelection);

    assert.true(rslt.anchor?.sameAs(ModelPosition.from(model.rootModelNode, [0, 0])));
    assert.true(rslt.focus?.sameAs(ModelPosition.from(model.rootModelNode, [0, 0])));

  });

  test("converts a dom range correctly", assert => {
    const text = new Text("abc");
    rootNode.appendChild(text);
    sync();
    const testRange = document.createRange();
    testRange.setStart(text, 0);

    const result = reader.readDomRange(testRange);
    assert.true(result.collapsed);
    assert.true(result.start.sameAs(ModelPosition.from(model.rootModelNode, [0, 0])));

  });
  module("Unit | model | reader | selection-reader | readDomPosition", () => {

    test("converts a dom position correctly", assert => {
      const text = new Text("abc");
      rootNode.appendChild(text);
      sync();

      const result = reader.readDomPosition(text, 0);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [0, 0])));

    });
    test("converts a dom position correctly before text node", assert => {
      const text = new Text("abc");
      rootNode.appendChild(text);
      sync();

      const result = reader.readDomPosition(rootNode, 0);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [0])));

    });
    test("converts a dom position correctly after text node", assert => {
      const text = new Text("abc");
      rootNode.appendChild(text);
      sync();

      const result = reader.readDomPosition(rootNode, 1);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [1])));

    });

    test("throws exception when offset > length of node", assert => {
      const text = new Text("abc");
      rootNode.appendChild(text);
      sync();
      assert.throws(() => reader.readDomPosition(rootNode, 2), SelectionError);
    });

    test("throws exception when offset < 0", assert => {
      const text = new Text("abc");
      rootNode.appendChild(text);
      sync();
      assert.throws(() => reader.readDomPosition(rootNode, 2), SelectionError);
    });

    test("converts a dom position correctly when before element", assert => {
      const child0 = document.createElement("div");
      const child1 = document.createElement("div");
      const child2 = document.createElement("div");
      rootNode.append(child0, child1, child2);

      const child10 = document.createElement("div");
      const child11 = document.createElement("div");
      const child12 = new Text("abc");
      const child13 = document.createElement("div");
      child1.append(child10, child11, child12, child13);
      sync();

      let result = reader.readDomPosition(child1, 0);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [1, 0])));

      result = reader.readDomPosition(child1, 0);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [1, 0])));

      result = reader.readDomPosition(child1, 1);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [1, 1])));

      result = reader.readDomPosition(child11, 0);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [1, 1, 0])));


      result = reader.readDomPosition(child12, 3);
      assert.true(result.sameAs(ModelPosition.from(model.rootModelNode, [1, 2, 3])));
    });
  });
});
