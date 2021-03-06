/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionHostDebugChannelClient, ExtensionHostDebugBroadcastChannel } from 'vs/platform/debug/common/extensionHostDebugIpc';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IExtensionHostDebugService } from 'vs/platform/debug/common/extensionHostDebug';
import { IDebugHelperService } from 'vs/workbench/contrib/debug/common/debug';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TelemetryService } from 'vs/platform/telemetry/common/telemetryService';
import { IChannel } from 'vs/base/parts/ipc/common/ipc';
import { Event } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';
import { mapToSerializable } from 'vs/base/common/map';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IWorkspaceProvider, IWorkspace } from 'vs/workbench/services/host/browser/browserHostService';

class BrowserExtensionHostDebugService extends ExtensionHostDebugChannelClient implements IExtensionHostDebugService {

	private workspaceProvider: IWorkspaceProvider;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService
	) {
		const connection = remoteAgentService.getConnection();
		let channel: IChannel;
		if (connection) {
			channel = connection.getChannel(ExtensionHostDebugBroadcastChannel.ChannelName);
		} else {
			channel = { call: async () => undefined, listen: () => Event.None } as any;
			// TODO@weinand TODO@isidorn fallback?
			console.warn('Extension Host Debugging not available due to missing connection.');
		}

		super(channel);

		if (environmentService.options && environmentService.options.workspaceProvider) {
			this.workspaceProvider = environmentService.options.workspaceProvider;
		} else {
			this.workspaceProvider = { open: async () => undefined, workspace: undefined };
			console.warn('Extension Host Debugging not available due to missing workspace provider.');
		}

		this.registerListeners(environmentService);
	}

	private registerListeners(environmentService: IWorkbenchEnvironmentService): void {

		// Reload window on reload request
		this._register(this.onReload(event => {
			if (environmentService.isExtensionDevelopment && environmentService.debugExtensionHost.debugId === event.sessionId) {
				window.location.reload();
			}
		}));

		// Close window on close request
		this._register(this.onClose(event => {
			if (environmentService.isExtensionDevelopment && environmentService.debugExtensionHost.debugId === event.sessionId) {
				window.close();
			}
		}));
	}

	async openExtensionDevelopmentHostWindow(args: string[]): Promise<void> {
		if (!this.workspaceProvider.payload) {
			// TODO@Ben remove me once environment is adopted
			return this.openExtensionDevelopmentHostWindowLegacy(args);
		}

		// Find out which workspace to open debug window on
		let debugWorkspace: IWorkspace = undefined;
		const folderUriArg = this.findArgument('folder-uri', args);
		if (folderUriArg) {
			debugWorkspace = { folderUri: URI.parse(folderUriArg) };
		}

		// Add environment parameters required for debug to work
		const environment = new Map<string, string>();

		const extensionDevelopmentPath = this.findArgument('extensionDevelopmentPath', args);
		if (extensionDevelopmentPath) {
			environment.set('extensionDevelopmentPath', extensionDevelopmentPath);
		}

		const debugId = this.findArgument('debugId', args);
		if (debugId) {
			environment.set('debugId', debugId);
		}

		const inspectBrkExtensions = this.findArgument('inspect-brk-extensions', args);
		if (inspectBrkExtensions) {
			environment.set('inspect-brk-extensions', inspectBrkExtensions);
		}

		// Open debug window as new window. Pass ParsedArgs over.
		this.workspaceProvider.open(debugWorkspace, {
			reuse: false, 							// debugging always requires a new window
			payload: mapToSerializable(environment)	// mandatory properties to enable debugging
		});
	}

	private async openExtensionDevelopmentHostWindowLegacy(args: string[]): Promise<void> {
		// we pass the "args" as query parameters of the URL

		let newAddress = `${document.location.origin}${document.location.pathname}?`;
		let gotFolder = false;

		const addQueryParameter = (key: string, value: string) => {
			const lastChar = newAddress.charAt(newAddress.length - 1);
			if (lastChar !== '?' && lastChar !== '&') {
				newAddress += '&';
			}
			newAddress += `${key}=${encodeURIComponent(value)}`;
		};

		const findArgument = (key: string) => {
			for (let a of args) {
				const k = `--${key}=`;
				if (a.indexOf(k) === 0) {
					return a.substr(k.length);
				}
			}
			return undefined;
		};

		const f = findArgument('folder-uri');
		if (f) {
			const u = URI.parse(f);
			gotFolder = true;
			addQueryParameter('folder', u.path);
		}
		if (!gotFolder) {
			// request empty window
			addQueryParameter('ew', 'true');
		}

		const ep = findArgument('extensionDevelopmentPath');
		if (ep) {
			addQueryParameter('extensionDevelopmentPath', ep);
		}

		const di = findArgument('debugId');
		if (di) {
			addQueryParameter('debugId', di);
		}

		const ibe = findArgument('inspect-brk-extensions');
		if (ibe) {
			addQueryParameter('inspect-brk-extensions', ibe);
		}

		window.open(newAddress);

		return Promise.resolve();
	}

	private findArgument(key: string, args: string[]): string | undefined {
		for (const a of args) {
			const k = `--${key}=`;
			if (a.indexOf(k) === 0) {
				return a.substr(k.length);
			}
		}

		return undefined;
	}
}

registerSingleton(IExtensionHostDebugService, BrowserExtensionHostDebugService);

class BrowserDebugHelperService implements IDebugHelperService {

	_serviceBrand: undefined;

	createTelemetryService(configurationService: IConfigurationService, args: string[]): TelemetryService | undefined {
		return undefined;
	}
}

registerSingleton(IDebugHelperService, BrowserDebugHelperService);
