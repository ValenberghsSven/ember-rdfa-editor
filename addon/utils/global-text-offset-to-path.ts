import ModelNode from "@lblod/ember-rdfa-editor/model/model-node";
import ModelTreeWalker, { FilterResult } from "@lblod/ember-rdfa-editor/model/util/model-tree-walker";
import RawEditor from './ce/raw-editor';

const VOID_NODES = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];

function selectTextAndVoidNodes(node: ModelNode) {
  if (ModelNode.isModelText(node)) {
    return FilterResult.FILTER_ACCEPT;
  }
  else if (ModelNode.isModelElement(node) && VOID_NODES.includes(node.type)) {
    return FilterResult.FILTER_ACCEPT;
  }
  else {
    return FilterResult.FILTER_SKIP;
  }
}

/**
 * This matches text offsets as found in the TextNodeWalker to a position in our virtual dom
 * as such it assumes void nodes have a "width" of 1, being either a newline for breaks and
 * a space for all other void nodes
 *
 */
export default function globalTextOffsetToPath(editor: RawEditor, offset: number): number[] {
  const range = editor.createRangeFromPaths([], []);
  const treeWalker = new ModelTreeWalker({ filter: selectTextAndVoidNodes, range });
  let startOffset = 0;
  for (const node of treeWalker) {
    if (ModelNode.isModelText(node)) {
      const endOffset = startOffset + node.length;
      if (offset >= startOffset && offset <= endOffset) {
        const path = node.getOffsetPath();
        const delta = offset - startOffset;
        path[path.length - 1] = path[path.length - 1] + delta;
        return path;
      }
      startOffset = endOffset;
    }
    else {
      // void nodes
      startOffset = startOffset + 1;
    }
  }
  throw new Error("no valid node found for offset " + offset);
}
