import Writer from '@lblod/ember-rdfa-editor/model/writers/writer';
import ModelNode from '@lblod/ember-rdfa-editor/model/model-node';
import { NotImplementedError } from '@lblod/ember-rdfa-editor/utils/errors';
import XmlElementWriter from '@lblod/ember-rdfa-editor/model/writers/xml-element-writer';
import XmlTextWriter from '@lblod/ember-rdfa-editor/model/writers/xml-text-writer';
import XmlInlineComponentWriter from './xml-inline-component-writer';

export default class XmlNodeWriter implements Writer<ModelNode, Node> {
  constructor(private document: XMLDocument) {}

  write(modelNode: ModelNode): Node {
    let result: Element;
    if (ModelNode.isModelElement(modelNode)) {
      const writer = new XmlElementWriter(this.document);
      result = writer.write(modelNode);
    } else if (ModelNode.isModelText(modelNode)) {
      const writer = new XmlTextWriter(this.document);
      result = writer.write(modelNode);
    } else if (ModelNode.isModelInlineComponent(modelNode)) {
      const writer = new XmlInlineComponentWriter(this.document);
      result = writer.write(modelNode);
    } else {
      throw new NotImplementedError();
    }
    if (modelNode.dirtiness.size) {
      const dirtyness = Array.from(modelNode.dirtiness).join(',');
      result.setAttribute('__dirty', dirtyness);
    }
    return result;
  }
}
