import { findParentNode, findChildren } from '@curvenote/prosemirror-utils';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import IntlService from 'ember-intl/services/intl';
import {
  OrderListStyle,
  toggleList,
} from '@lblod/ember-rdfa-editor/plugins/list';
import { autoJoin, chainCommands } from 'prosemirror-commands';
import { sinkListItem, wrapInList } from 'prosemirror-schema-list';
import { Command } from 'prosemirror-state';
import SayController from '@lblod/ember-rdfa-editor/core/say-controller';

type Args = {
  controller: SayController;
};
export default class ListOrdered extends Component<Args> {
  @service declare intl: IntlService;

  get styles() {
    return [
      {
        name: 'decimal',
        description: this.intl.t(
          'ember-rdfa-editor.ordered-list.styles.decimal',
        ),
      },
      {
        name: 'decimal-extended',
        description: this.intl.t(
          'ember-rdfa-editor.ordered-list.styles.decimal-extended',
        ),
        remark: 'max. 1',
      },
      {
        name: 'lower-alpha',
        description: this.intl.t(
          'ember-rdfa-editor.ordered-list.styles.lower-alpha',
        ),
      },
      {
        name: 'upper-alpha',
        description: this.intl.t(
          'ember-rdfa-editor.ordered-list.styles.upper-alpha',
        ),
      },
      {
        name: 'upper-roman',
        description: this.intl.t(
          'ember-rdfa-editor.ordered-list.styles.upper-roman',
        ),
      },
    ];
  }

  get firstListParent() {
    return findParentNode(
      (node) =>
        node.type === this.schema.nodes.ordered_list ||
        node.type === this.schema.nodes.bullet_list,
    )(this.selection);
  }

  hasListParentWithStyle(style: OrderListStyle) {
    const parentNodeWithStyle = findParentNode(
      (node) =>
        node.type === this.schema.nodes.ordered_list &&
        node.attrs.style !== null,
    )(this.selection);

    return parentNodeWithStyle?.node?.attrs?.style === style ? true : false;
  }

  docHasListWithStyle(style: OrderListStyle) {
    const rootNode = this.controller.activeEditorState.doc;
    const results = findChildren(
      rootNode,
      (node) =>
        node.type === this.schema.nodes.ordered_list &&
        node.attrs.style === style,
      true,
    );

    return results.length > 0;
  }

  get isActive() {
    return (
      this.firstListParent?.node.type ===
      this.controller.schema.nodes.ordered_list
    );
  }

  get controller() {
    return this.args.controller;
  }

  get selection() {
    return this.controller.activeEditorState.selection;
  }

  get schema() {
    return this.controller.schema;
  }

  toggleCommand(listStyle?: OrderListStyle): Command {
    return chainCommands(
      toggleList(this.schema.nodes.ordered_list, this.schema.nodes.list_item, {
        style: listStyle,
      }),
      wrapInList(this.schema.nodes.ordered_list, {
        style: listStyle,
      }),
      sinkListItem(this.schema.nodes.list_item),
    );
  }

  get canToggle() {
    return this.controller.checkCommand(this.toggleCommand());
  }

  @action
  toggle(style?: OrderListStyle) {
    this.controller.focus();
    this.controller.doCommand(
      autoJoin(this.toggleCommand(style), ['ordered_list', 'bullet_list']),
    );
  }

  @action
  setStyle(style: OrderListStyle) {
    const firstListParent = this.firstListParent;
    if (
      firstListParent?.node.type === this.controller.schema.nodes.ordered_list
    ) {
      const pos = firstListParent.pos;
      this.controller.withTransaction((tr) => {
        return tr.setNodeAttribute(pos, 'style', style);
      });
    } else {
      this.toggle(style);
    }
  }

  styleIsActive = (style: string) => {
    const firstListParent = this.firstListParent;
    if (
      firstListParent?.node.type === this.controller.schema.nodes.ordered_list
    ) {
      if (style === 'decimal-extended') {
        return this.hasListParentWithStyle('decimal-extended');
      } else {
        return firstListParent.node.attrs.style === style;
      }
    } else {
      return false;
    }
  };

  styleIsRestricted = (style: string) => {
    if (style === 'decimal-extended') {
      return this.docHasListWithStyle('decimal-extended');
    } else {
      return false;
    }
  };
}
