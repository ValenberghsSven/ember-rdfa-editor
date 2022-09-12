import ApplicationInstance from '@ember/application/instance';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import Controller, {
  InternalWidgetSpec,
  ViewController,
} from '@lblod/ember-rdfa-editor/core/controllers/controller';
import BasicStyles from '@lblod/ember-rdfa-editor/plugins/basic-styles/basic-styles';
import LumpNodePlugin from '@lblod/ember-rdfa-editor/plugins/lump-node/lump-node';
import { EditorPlugin } from '@lblod/ember-rdfa-editor/model/editor-plugin';
import {
  createLogger,
  Logger,
} from '@lblod/ember-rdfa-editor/utils/logging-utils';
import RdfaDocument from '@lblod/ember-rdfa-editor/core/controllers/rdfa-document';

import type IntlService from 'ember-intl/services/intl';
import { tracked } from 'tracked-built-ins';
import { default as RdfaDocumentController } from '../../core/controllers/rdfa-document';
import ShowActiveRdfaPlugin from '@lblod/ember-rdfa-editor/plugins/show-active-rdfa/show-active-rdfa';
import PlaceHolderPlugin from '@lblod/ember-rdfa-editor/plugins/placeholder/placeholder';
import { AnchorPlugin } from '@lblod/ember-rdfa-editor/plugins/anchor/anchor';
import TablePlugin from '@lblod/ember-rdfa-editor/plugins/table/table';
import ListPlugin from '@lblod/ember-rdfa-editor/plugins/list/list';
import RdfaConfirmationPlugin from '@lblod/ember-rdfa-editor/plugins/rdfa-confirmation/rdfa-confirmation';
import { View } from '@lblod/ember-rdfa-editor/core/view';

export type PluginConfig =
  | string
  | {
      name: string;
      options: unknown;
    };

export interface ResolvedPluginConfig {
  instance: EditorPlugin;
  options: unknown;
}

interface RdfaEditorArgs {
  /**
   * callback that is called with an interface to the editor after editor init completed
   * @default 'default'
   * @public
   */
  rdfaEditorInit(editor: RdfaDocument): void;

  plugins: PluginConfig[];
  stealFocus?: boolean;
}

/**
 * RDFa editor
 *
 * This module contains all classes and components provided by the @lblod/ember-rdfa-editor addon.
 * The main entrypoint is the {{#crossLink "RdfaEditorComponent"}}{{/crossLink}}.
 * @module rdfa-editor
 * @main rdfa-editor
 */

/**
 * RDFa editor component
 *
 * This component wraps around a {{#crossLink "ContentEditableComponent"}}{{/crossLink}}
 * and provides an architecture to interact with the document through plugins.
 * {{#crossLinkModule "rdfa-editor"}}rdfa-editor{{/crossLinkModule}}.
 * @module rdfa-editor
 * @class RdfaEditorComponent
 * @extends Component
 */
export default class RdfaEditor extends Component<RdfaEditorArgs> {
  @service declare intl: IntlService;

  @tracked toolbarWidgets: InternalWidgetSpec[] = [];
  @tracked sidebarWidgets: InternalWidgetSpec[] = [];
  @tracked insertSidebarWidgets: InternalWidgetSpec[] = [];
  @tracked toolbarController: Controller | null = null;
  @tracked inlineComponentController: Controller | null = null;
  // @tracked inlineComponents = tracked(
  //   new Map<ModelInlineComponent, ActiveComponentEntry>()
  // );

  @tracked editorLoading = true;
  private owner: ApplicationInstance;
  private logger: Logger;

  get plugins(): PluginConfig[] {
    return this.args.plugins || [];
  }

  get editorPlugins(): ResolvedPluginConfig[] {
    return this.getPlugins();
  }

  /**
   * editor view
   */
  @tracked controller?: Controller;

  constructor(owner: ApplicationInstance, args: RdfaEditorArgs) {
    super(owner, args);
    this.owner = owner;
    const userLocale = navigator.language || navigator.languages[0];
    this.intl.setLocale([userLocale, 'nl-BE']);
    this.logger = createLogger(this.constructor.name);
  }

  /**
   * Handle init of rawEditor
   *
   * @method handleRawEditorInit
   *
   * @param {RawEditor} view, the editor interface
   *
   * @private
   */
  @action
  handleRawEditorInit(view: View) {
    this.controller = new ViewController('rdfaEditorComponent', view);
    this.toolbarWidgets =
      this.controller.currentState.widgetMap.get('toolbar') || [];
    this.sidebarWidgets =
      this.controller.currentState.widgetMap.get('sidebar') || [];
    this.insertSidebarWidgets =
      this.controller.currentState.widgetMap.get('insertSidebar') || [];
    this.toolbarController = new ViewController('toolbar', view);
    this.inlineComponentController = new ViewController(
      'inline-component-manager',
      view
    );
    const rdfaDocument = new RdfaDocumentController('host', view);
    window.__EDITOR = new RdfaDocumentController('debug', view);
    if (this.args.rdfaEditorInit) {
      this.args.rdfaEditorInit(rdfaDocument);
    }
    this.editorLoading = false;
  }

  getPlugins(): ResolvedPluginConfig[] {
    const pluginConfigs = this.plugins;
    const plugins: ResolvedPluginConfig[] = [
      { instance: new BasicStyles(), options: null },
      { instance: new LumpNodePlugin(), options: null },
      { instance: new ShowActiveRdfaPlugin(), options: null },
      { instance: new PlaceHolderPlugin(), options: null },
      { instance: new AnchorPlugin(), options: null },
      { instance: new TablePlugin(), options: null },
      { instance: new ListPlugin(), options: null },
      { instance: new RdfaConfirmationPlugin(), options: null },
    ];
    for (const config of pluginConfigs) {
      let name;
      let options: unknown = null;
      if (typeof config === 'string') {
        name = config;
      } else {
        name = config.name;
        options = config.options;
      }

      const plugin = this.owner.lookup(`plugin:${name}`) as EditorPlugin | null;
      if (plugin) {
        plugins.push({ instance: plugin, options });
      } else {
        this.logger(`plugin ${name} not found! Skipping...`);
      }
    }
    return plugins;
  }

  // Toggle RDFA blocks
  @tracked showRdfaBlocks = false;

  @action
  toggleRdfaBlocks() {
    if (!this.toolbarController!.getConfig('showRdfaBlocks')) {
      this.showRdfaBlocks = true;
      this.toolbarController!.setConfig('showRdfaBlocks', 'true');
    } else {
      this.showRdfaBlocks = false;
      this.toolbarController!.setConfig('showRdfaBlocks', null);
    }
  }
}
