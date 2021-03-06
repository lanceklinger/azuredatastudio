/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorOptions, WrappingIndent } from 'vs/editor/common/config/editorOptions';
import { createMonacoBaseAPI } from 'vs/editor/common/standalone/standaloneBase';
import { createMonacoEditorAPI } from 'vs/editor/standalone/browser/standaloneEditor';
import { createMonacoLanguagesAPI } from 'vs/editor/standalone/browser/standaloneLanguages';

const global: any = self;

// Set defaults for standalone editor
(<any>EditorOptions.wrappingIndent).defaultValue = WrappingIndent.None;
(<any>EditorOptions.glyphMargin).defaultValue = false;
(<any>EditorOptions.autoIndent).defaultValue = false;
(<any>EditorOptions.overviewRulerLanes).defaultValue = 2;

const api = createMonacoBaseAPI();
api.editor = createMonacoEditorAPI();
api.languages = createMonacoLanguagesAPI();
export const CancellationTokenSource = api.CancellationTokenSource;
export const Emitter = api.Emitter;
export const KeyCode = api.KeyCode;
export const KeyMod = api.KeyMod;
export const Position = api.Position;
export const Range = api.Range;
export const Selection = api.Selection;
export const SelectionDirection = api.SelectionDirection;
export const MarkerSeverity = api.MarkerSeverity;
export const MarkerTag = api.MarkerTag;
export const Uri = api.Uri;
export const Token = api.Token;
export const editor = api.editor;
export const languages = api.languages;

global.monaco = api;

if (typeof global.require !== 'undefined' && typeof global.require.config === 'function') {
	global.require.config({
		ignoreDuplicateModules: [
			'vscode-languageserver-types',
			'vscode-languageserver-types/main',
			'vscode-nls',
			'vscode-nls/vscode-nls',
			'jsonc-parser',
			'jsonc-parser/main',
			'vscode-uri',
			'vscode-uri/index',
			'vs/basic-languages/typescript/typescript'
		]
	});
}
