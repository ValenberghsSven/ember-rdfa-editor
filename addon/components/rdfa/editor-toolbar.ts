import Component from "@glimmer/component";
import {action} from "@ember/object";
import {isInList} from '@lblod/ember-rdfa-editor/utils/ce/list-helpers';
import {getWindowSelection} from '@lblod/ember-rdfa-editor/utils/dom-helpers';
import {tracked} from "@glimmer/tracking";
import LegacyRawEditor from "@lblod/ember-rdfa-editor/utils/ce/legacy-raw-editor";
import ModelSelection from "@lblod/ember-rdfa-editor/model/model-selection";
import {PropertyState} from "@lblod/ember-rdfa-editor/model/util/types";

interface Args {
  editor: LegacyRawEditor;
  showTextStyleButtons: boolean;
  showListButtons: boolean;
  showIndentButtons: boolean;
}

/**
 * RDFa editor toolbar component
 * @module rdfa-editor
 * @class RdfaEditorToolbarComponent
 * @extends Component
 */
export default class EditorToolbar extends Component<Args> {
  @tracked isBold: boolean = false;
  @tracked isItalic: boolean = false;
  @tracked isStrikethrough: boolean = false;
  @tracked isUnderline: boolean = false;
  @tracked isInList: boolean = false;

  constructor(parent: unknown, args: Args) {
    super(parent, args);
    document.addEventListener("richSelectionUpdated", this.updateProperties.bind(this));
  }
  updateProperties(event: CustomEvent<ModelSelection>) {
    console.log("richSelectionUpdated");
    this.isBold = event.detail.bold === PropertyState.enabled;
    this.isItalic = event.detail.italic === PropertyState.enabled;
    this.isUnderline = event.detail.underline === PropertyState.enabled;
    this.isStrikethrough = event.detail.strikethrough === PropertyState.enabled;
    this.isInList = event.detail.isInList === PropertyState.enabled;
  }

  @action
  insertUL() {
    this.args.editor.insertUL();
  }

  @action
  insertOL() {
    this.args.editor.insertOL();
  }

  @action
  insertIndent() {
    if(this.isInList) {
      this.args.editor.executeCommand("indent-list");
    }
  }

  @action
  insertUnindent() {
    if(this.isInList) {
      this.args.editor.executeCommand("unindent-list");
    }
  }

  @action
  toggleItalic() {
    this.toggleProperty(this.isItalic, "make-italic", "remove-italic");
  }

  @action
  toggleUnorderedList() {
    if(this.isInList) {
      this.args.editor.executeCommand("remove-list");
    } else {
      this.args.editor.executeCommand("make-list", "ul");
    }
  }
  @action
  toggleOrderedList() {
    if(this.isInList) {
      this.args.editor.executeCommand("remove-list");
    } else {
      this.args.editor.executeCommand("make-list", "ol");
    }
  }

  @action
  toggleBold() {
    this.toggleProperty(this.isBold, "make-bold", "remove-bold");
  }

  @action
  toggleUnderline() {
    this.toggleProperty(this.isUnderline, "make-underline", "remove-underline");
  }

  @action
  toggleStrikethrough(){
    this.toggleProperty(this.isStrikethrough, "make-strikethrough", "remove-strikethrough");
  }

  @action
  toggleProperty(value: boolean, makeCommand: string, removeCommand: string) {
    if(value) {
      this.args.editor.executeCommand(removeCommand);
    } else {
      this.args.editor.executeCommand(makeCommand);
    }

  }

  @action
  undo() {
    this.args.editor.undo();
  }
}
