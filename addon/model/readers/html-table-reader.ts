import ModelTable from '@lblod/ember-rdfa-editor/model/nodes/model-table';
import readHtmlNode from '@lblod/ember-rdfa-editor/model/readers/html-node-reader';
import { copyAttributes } from '@lblod/ember-rdfa-editor/model/readers/reader-utils';
import { HtmlReaderContext } from './html-reader';

export default function readHtmlTable(
  from: HTMLTableElement,
  context: HtmlReaderContext
): ModelTable[] {
  const table = new ModelTable();
  copyAttributes(from, table);
  for (const child of from.childNodes) {
    const parsedChildren = readHtmlNode(child, context);
    table.appendChildren(...parsedChildren);
  }
  return [table];
}
