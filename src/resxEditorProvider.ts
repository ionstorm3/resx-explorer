import * as vscode from 'vscode';
import * as fs from 'fs';
/**
 * Provider for cat scratch editors.
 * 
 * Cat scratch editors are used for `.cscratch` files, which are just json files.
 * To get started, run this extension and open an empty `.cscratch` file in VS Code.
 * 
 * This provider demonstrates:
 * 
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Synchronizing changes between a text document and a custom editor.
 */
export class ResxEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new ResxEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(ResxEditorProvider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'resx-explorer.editor';


    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    /**
     * Called when our custom editor is opened.
     * 
     * 
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'dist')
            ]
        };
        webviewPanel.webview.html = await this.getHtmlForWebviewAsync(webviewPanel);

        function updateWebview() {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        }

        // Hook up event handlers so that we can synchronize the webview with the text document.
        //
        // The text document acts as our model, so we have to sync change in the document to our
        // editor and sync changes in the editor back to the document.
        // 
        // Remember that a single text document can also be shared between multiple custom
        // editors (this happens for example when you split a custom editor)

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive message from the webview.
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'add':
                    this.addNewScratch(document);
                    return;

                case 'delete':
                    this.deleteScratch(document, e.id);
                    return;
            }
        });

        updateWebview();
    }

    private getDevelopmentWebviewContent = (panel: vscode.WebviewPanel): string => {
        return `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">

<meta http-equiv="Content-Security-Policy"
content="
default-src 'none';
script-src ${panel.webview.cspSource} http://localhost:5173 'unsafe-eval';
style-src ${panel.webview.cspSource} http://localhost:5173 'unsafe-inline';
connect-src http://localhost:5173 ws://localhost:5173;
img-src ${panel.webview.cspSource} https: data:;
">

</head>

<body>

<div id="app"></div>

<script type="module" src="http://localhost:5173/@vite/client"></script>
<script type="module" src="http://localhost:5173/src/main.ts"></script>

</body>

</html>
`;

    };

    private isDevServerRunningAsync = async (): Promise<boolean> => {
        try {
            const response:Response = await fetch("http://localhost:5173");
            return true;
        } catch {
            return false;
        }
    }

    private getProductionWebviewContent = () => {
        const distPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            'dist/ui'
        );

        const indexPath: vscode.Uri = vscode.Uri.joinPath(distPath, 'index.html');

        let html: string = fs.readFileSync(indexPath.fsPath, 'utf8');
        return html;
    };

    /**
     * Get the static html used for the editor webviews.
     */
    private getHtmlForWebviewAsync = async (panel: vscode.WebviewPanel): Promise<string> => {
        const isDev =
            this.context.extensionMode === vscode.ExtensionMode.Development &&
            await this.isDevServerRunningAsync();
        return isDev ? this.getDevelopmentWebviewContent(panel): this.getProductionWebviewContent();
    };

    /**
     * Add a new scratch to the current document.
     */
    private addNewScratch(document: vscode.TextDocument) {
        // const json = this.getDocumentAsJson(document);
        // const character = ResxEditorProvider.scratchCharacters[Math.floor(Math.random() * CatScratchEditorProvider.scratchCharacters.length)];
        // json.scratches = [
        //     ...(Array.isArray(json.scratches) ? json.scratches : []),
        //     {
        //         id: getNonce(),
        //         text: character,
        //         created: Date.now(),
        //     }
        // ];

        // return this.updateTextDocument(document, json);
    }

    /**
     * Delete an existing scratch from a document.
     */
    private deleteScratch(document: vscode.TextDocument, id: string) {
        // const json = this.getDocumentAsJson(document);
        // if (!Array.isArray(json.scratches)) {
        //     return;
        // }

        // json.scratches = json.scratches.filter((note: any) => note.id !== id);

        // return this.updateTextDocument(document, json);
    }

    /**
     * Try to get a current document as json text.
     */
    // private getDocumentAsJson(document: vscode.TextDocument): any {
    //     const text = document.getText();
    //     if (text.trim().length === 0) {
    //         return {};
    //     }

    //     try {
    //         return JSON.parse(text);
    //     } catch {
    //         throw new Error('Could not get document as json. Content is not valid json');
    //     }
    // }

    // /**
    //  * Write out the json to a given document.
    //  */
    // private updateTextDocument(document: vscode.TextDocument, json: any) {
    //     const edit = new vscode.WorkspaceEdit();

    //     // Just replace the entire document every time for this example extension.
    //     // A more complete extension should compute minimal edits instead.
    //     edit.replace(
    //         document.uri,
    //         new vscode.Range(0, 0, document.lineCount, 0),
    //         JSON.stringify(json, null, 2));

    //     return vscode.workspace.applyEdit(edit);
    // }
}