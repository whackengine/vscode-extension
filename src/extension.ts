// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import * as vscode from 'vscode';

// Language client
import * as vscodelc from "vscode-languageclient/node";

// Whack SDK's home path
const whackHome = process.env.WHACK_HOME;

// Status variables
let statusBarItem: vscode.StatusBarItem | null = null;
let statusMessage = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "whack-engine" is now active!');

    if (whackHome === undefined)
    {
        vscode.window.showErrorMessage("Environment variable WHACK_HOME must be set.");
    }

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('whack-engine.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from Whack engine support!');
    });

    context.subscriptions.push(disposable);

    // Setup language server
    if (whackHome)
    {
        const underWindows = process.platform == "win32";
        const server: vscodelc.Executable = {
            command: path.resolve(whackHome, "bin/whacklangserver" + (underWindows ? ".exe" : "")),
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

        const client = new vscodelc.LanguageClient("ActionScript 3 & MXML language server", serverOptions, clientOptions);

        client.onNotification("status/update", (params) => {
            showStatusBarItem(context, !!params.error, !!params.warning, !!params.loading, String(params.message));
        });

        client.start();
    }
}

function showStatusBarItem(context: vscode.ExtensionContext, error: boolean, warning: boolean, loading: boolean, message: string = "") {
    if (statusBarItem === null)
    {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);7
        context.subscriptions.push(statusBarItem);
    }

    const backgroundColor =
        error ? new vscode.ThemeColor("statusBarItem.errorBackground") :
        warning ? new vscode.ThemeColor("statusBarItem.warningBackground") : undefined;

    statusBarItem.text =(error ? "$(error) " : warning ? "$(warning) " : "") +  "Whack" + (loading ? " $(loading~spin)" : "");
    statusBarItem.backgroundColor = backgroundColor;
    statusBarItem.tooltip = message ? message : undefined;
    statusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {}
