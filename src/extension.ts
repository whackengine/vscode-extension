// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import * as vscode from 'vscode';

// Language client
import * as vscodelc from "vscode-languageclient/node";

export class WhackExtension
{
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
        this.whackHome = process.env.WHACK_HOME ?? null;
        console.log('Whack engine extension started!');

        if (this.whackHome === null)
        {
            vscode.window.showErrorMessage("Environment variable WHACK_HOME must be set.");
        }

        // "whack.restartServer" command
        const disposable = vscode.commands.registerCommand("whack.restartServer", () => {
            this.restart();
        });

        this.subscriptions.push(disposable);

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

            this.languageClient.start();
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
    
        const backgroundColor =
            error ? new vscode.ThemeColor("statusBar.errorBackground") :
            warning ? new vscode.ThemeColor("statusBar.warningBackground") : undefined;
    
        this.statusBar.text = (loading ? " $(loading~spin)" : error ? "$(error) " : warning ? "$(warning) " : "") +  "Whack";
        this.statusBar.backgroundColor = backgroundColor;
        this.statusBar.tooltip = new vscode.MarkdownString(message, true);
        this.statusBar.tooltip.isTrusted = true;
        this.statusBar.tooltip.appendMarkdown(
            "\n\n---\n\n" +
            '[$(debug-restart) Restart server](command:whack.restartServer "Restart the server")'
        );
        this.statusBar.show();
    }
}

const extension = new WhackExtension();

export function activate(context: vscode.ExtensionContext) {
    extension.context = context;
    extension.start();
}

// This method is called when your extension is deactivated
export function deactivate() {}
