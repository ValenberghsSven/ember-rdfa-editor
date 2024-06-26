import { NodeSpec } from 'prosemirror-model';
import { PLACEHOLDER_CLASS } from '../../../utils/_private/constants';

export const placeholder: NodeSpec = {
  attrs: { placeholderText: { default: 'placeholder' } },
  inline: true,
  group: 'inline',
  selectable: true,
  draggable: false,
  atom: true,
  defining: false,
  toDOM(node) {
    return [
      'span',
      { class: PLACEHOLDER_CLASS, ...node.attrs, contenteditable: false },
      node.attrs.placeholderText,
    ];
  },
  leafText(node) {
    return node.attrs.placeholderText as string;
  },
  parseDOM: [
    {
      tag: 'span',
      getAttrs(node: HTMLElement) {
        if (node.classList.contains(PLACEHOLDER_CLASS)) {
          return { placeholderText: node.innerText };
        }
        return false;
      },
    },
  ],
};
