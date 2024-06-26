import { Command, TextSelection } from 'prosemirror-state';
import { selectNodeBackward } from 'prosemirror-commands';

import { block_rdfa } from '../nodes';

export const selectBlockRdfaNode: Command = (state, dispatch, view) => {
  if (!(state.selection instanceof TextSelection)) {
    return false;
  }

  const { $cursor } = state.selection;

  if (!$cursor) {
    return false;
  }

  const nodeBefore =
    $cursor.parentOffset === 0
      ? // Exit the parent to find the "node before"
        state.doc.resolve($cursor.before($cursor.depth)).nodeBefore
      : $cursor.nodeBefore;

  const isBlockRdfaNode = nodeBefore && nodeBefore.type.spec === block_rdfa;

  if (isBlockRdfaNode) {
    return selectNodeBackward(state, dispatch, view);
  }

  return false;
};
