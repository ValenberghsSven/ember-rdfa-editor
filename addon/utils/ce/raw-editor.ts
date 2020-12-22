import EmberObject from '@ember/object';
import classic from 'ember-classic-decorator';
import MakeBoldCommand from '@lblod/ember-rdfa-editor/commands/text-properties/make-bold-command';
import RemoveBoldCommand from '@lblod/ember-rdfa-editor/commands/text-properties/remove-bold-command';
import Command from "@lblod/ember-rdfa-editor/commands/command";
import Model from "@lblod/ember-rdfa-editor/model/model";
import {walk as walkDomNode} from "@lblod/marawa/node-walker";
import RichNode from "@lblod/marawa/rich-node";

/**
 * Raw contenteditable editor. This acts as both the internal and external API to the DOM.
 * Any editing operations should be implemented as {@link Command commands}. External plugins can register their own commands.
 * Commands have access to the {@link Model} which represents our interface to the real DOM.
 * TODO: Do we really need to extend EmberObject?
 *
 * @module contenteditable-editor
 * @class RawEditor
 * @constructor
 * @extends EmberObject
 */
@classic
class RawEditor extends EmberObject {
  registeredCommands: Map<string, Command> = new Map()
  protected model: Model;
  protected tryOutVdom = true;

  /**
   * a rich representation of the dom tree created with {{#crossLink "NodeWalker"}}NodeWalker{{/crossLink}}
   * @property richNode
   * @type RichNode
   * @protected
   */
  richNode!: RichNode;

  constructor(...args: any[]){
    super(...args);
    this.model = new Model();
    this.registerCommand(new MakeBoldCommand(this.model));
    this.registerCommand(new RemoveBoldCommand(this.model));
  }

  /**
   * @method updateRichNode
   * @private
   */
  updateRichNode() {
    const richNode = walkDomNode( this.rootNode );
    this.set('richNode', richNode);
  }
  /**
   * The root node of the editor. This is the node with the contentEditable attribute.
   * No operations should ever affect any node outside of its tree.
   */
  get rootNode() : HTMLElement {
    return this.model.rootNode;
  }
  set rootNode(rootNode: HTMLElement) {
    this.model.rootNode = rootNode;
    this.updateRichNode();
    if(this.tryOutVdom) {
      this.model.read();
      this.model.write();
      this.updateRichNode();
    }
  }


  /**
   * Register a command for use with {@link executeCommand}
   * @param command
   */
  registerCommand(command: Command) {
    this.registeredCommands.set(command.name, command);
  }

  /**
   * Execute a command with name commandName. Any extra arguments are passed through to the command.
   * @param commandName
   * @param args
   */
  executeCommand(commandName: string, ...args: any[]) {
    const command = this.registeredCommands.get(commandName);
    if(!command) {
      throw new Error(`Unrecognized command ${commandName}`);
    }
    command.execute(...args);
    this.model.write();
  }
}
export default RawEditor;
