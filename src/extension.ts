// Node.js imports
import path from 'path';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Language client
import * as vscodelc from "vscode-languageclient/node";

export class WhackExtension
{
    version: string = "";

    /**
     * Whack SDK's home path.
     */
    whackHome: string | null = "";

    /**
     * Status bar item.
     */
    statusBar: vscode.StatusBarItem | null = null;

    /**
     * Extension context.
     */
    context: vscode.ExtensionContext | null = null;
    
    /**
     * Language client.
     */
    languageClient: vscodelc.LanguageClient | null = null;

    /**
     * Disposables.
     */
    subscriptions: vscode.Disposable[] = [];

    async start()
    {
        console.log('Whack engine extension started!');

        // Set version
        this.version = this.context?.extension.packageJSON.version ?? "<unknown>";

        // Detect SDK's home path
        this.whackHome = process.env.WHACK_HOME ?? null;
        if (this.whackHome === null)
        {
            vscode.window.showErrorMessage("Environment variable WHACK_HOME must be set.");
        }

        // "whack.restartServer" command
        this.subscriptions.push(vscode.commands.registerCommand("whack.restartServer", () => {
            this.restart();
        }));

        // Setup language server
        if (this.whackHome)
        {
            const underWindows = process.platform == "win32";
            const server: vscodelc.Executable = {
                command: path.resolve(this.whackHome, "bin/whacklangserver" + (underWindows ? ".exe" : "")),
                args: [],
                options: {
                    env: {
                        ...process.env,
                    }
                },
            };

            const serverOptions: vscodelc.ServerOptions = server;

            let clientOptions: vscodelc.LanguageClientOptions = {
                // Register the server for AS3/MXML/CSS
                documentSelector: [
                    { scheme: "file", language: "as3" },
                    { scheme: "file", language: "mxml" },
                    { scheme: "file", language: "css" }
                ],
                synchronize: {
                    // Notify the server about file changes to AS3/MXML/CSS and
                    // whack.toml files contained in the workspace
                    fileEvents: [
                        vscode.workspace.createFileSystemWatcher("**/*.{as,mxml,css}"),
                        vscode.workspace.createFileSystemWatcher("**/whack.toml"),
                    ],
                },
            };

            this.languageClient = new vscodelc.LanguageClient("ActionScript 3 & MXML language server", serverOptions, clientOptions);

            this.languageClient.onNotification("status/update", (params) => {
                this.updateStatusBar(!!params.error, !!params.warning, !!params.loading, String(params.message));
            });

            await this.languageClient.start();
        }
    }

    async restart()
    {
        await this.stopAndDispose();
        await this.start();
    }

    async stopAndDispose()
    {
        // Wait 100ms for disposing.
        await this.languageClient?.stop(100).catch((_) => {});
        await this.dispose();
    }

    async dispose()
    {
        if (this.statusBar)
        {
            this.statusBar.hide();
            this.statusBar = null;
        }

        this.subscriptions.forEach(d => { d.dispose() });
        this.subscriptions = [];

        await this.languageClient?.dispose();
        this.languageClient = null;
        this.whackHome = null;
    }

    updateStatusBar(error: boolean, warning: boolean, loading: boolean, message: string = ""): void {
        if (this.statusBar === null)
        {
            this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);7
            this.subscriptions.push(this.statusBar);
        }
        
        const { statusBar } = this;
   
        let backgroundColor: vscode.ThemeColor | undefined = undefined;
        let color: vscode.ThemeColor | undefined = undefined;

        if (error)
        {
            color = new vscode.ThemeColor("statusBarItem.errorForeground");
            backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        }
        else if (warning)
        {
            color = new vscode.ThemeColor("statusBarItem.warningForeground");
            backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        }

        statusBar.text = (loading ? " $(loading~spin)" : error ? "$(error) " : warning ? "$(warning) " : "") +  "Whack";

        // Build up tooltip
        statusBar.tooltip = new vscode.MarkdownString(message, true);
        statusBar.tooltip.isTrusted = true;
        if (statusBar.tooltip.value) {
            statusBar.tooltip.appendMarkdown("\n\n---\n\n");
        }
        statusBar.tooltip.appendMarkdown(
            `Extension Info: Version ${this.version}` +
            "\n\n---\n\n" +
            '[$(debug-restart) Restart server](command:whack.restartServer "Restart the server")'
        );

        statusBar.color = color;
        statusBar.backgroundColor = backgroundColor;

        statusBar.show();
    }
}

const extension = new WhackExtension();

export function activate(context: vscode.ExtensionContext) {
    extension.context = context;
    extension.start();
}

// This method is called when your extension is deactivated
export function deactivate() {
    extension.stopAndDispose();
}
