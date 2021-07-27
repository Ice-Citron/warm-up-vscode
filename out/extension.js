"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const cats = {
    "Coding Cat": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
    "Testing Cat": "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
};
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand("catCoding.start", () => {
        CatCodingPanel.createOrShow(context.extensionUri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("catCoding.doRefactor", () => {
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel.doRefactor();
        }
    }));
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel, state) {
                console.log(`Got state: ${state}`);
                // Reset the webview options so we use latest uri for `localResourceRoots`.
                webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                CatCodingPanel.revive(webviewPanel, context.extensionUri);
            },
        });
    }
}
exports.activate = activate;
function getWebviewOptions(extensionUri) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
    };
}
/**
 * Manages cat coding webview panels
 */
class CatCodingPanel {
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState((e) => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "alert":
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(CatCodingPanel.viewType, "Cat Coding", column || vscode.ViewColumn.One, getWebviewOptions(extensionUri));
        CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
    }
    static revive(panel, extensionUri) {
        CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
    }
    doRefactor() {
        // Send a message to the webview webview.
        // You can send any JSON serializable data.
        this._panel.webview.postMessage({ command: "refactor" });
    }
    dispose() {
        CatCodingPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        // Vary the webview's content based on where it is located in the editor.
        switch (this._panel.viewColumn) {
            case vscode.ViewColumn.Two:
                this._updateForCat(webview, "Compiling Cat");
                return;
            case vscode.ViewColumn.Three:
                this._updateForCat(webview, "Testing Cat");
                return;
            case vscode.ViewColumn.One:
            default:
                this._updateForCat(webview, "Coding Cat");
                return;
        }
    }
    _updateForCat(webview, catName) {
        this._panel.title = catName;
        this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
    }
    _getHtmlForWebview(webview, catGifPath) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, "media", "main.js");
        const gameScriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, "media", "game.js");
        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        const gameScriptUri = webview.asWebviewUri(gameScriptPathOnDisk);
        // Local path to css styles
        const stylesPathGamePath = vscode.Uri.joinPath(this._extensionUri, "media", "game.css");
        const stylesPathThemePath = vscode.Uri.joinPath(this._extensionUri, "media", "theme.css");
        // Uri to load styles into webview
        const stylesGameUri = webview.asWebviewUri(stylesPathGamePath);
        const stylesThemeUri = webview.asWebviewUri(stylesPathThemePath);
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${stylesGameUri}" rel="stylesheet">
				<link id="theme" href="${stylesThemeUri}" rel="stylesheet">

				<title>Cat Coding</title>
			</head>
      <body>
        <h2 id="header">typings</h2>
        <div id="command-center" class="">
          <div class="bar">
            <div id="left-wing">
              <span id="word-count">
                <span id="wc-10" onclick="setWordCount(10)">10</span>
                <text> / </text>
                <span id="wc-25" onclick="setWordCount(25)">25</span>
                <text> / </text>
                <span id="wc-50" onclick="setWordCount(50)">50</span>
                <text> / </text>
                <span id="wc-100" onclick="setWordCount(100)">100</span>
                <text> / </text>
                <span id="wc-250" onclick="setWordCount(250)">250</span>
              </span>
              <span id="time-count">
                <span id="tc-15" onclick="setTimeCount(15)">15</span>
                <text> / </text>
                <span id="tc-30" onclick="setTimeCount(30)">30</span>
                <text> / </text>
                <span id="tc-60" onclick="setTimeCount(60)">60</span>
                <text> / </text>
                <span id="tc-120" onclick="setTimeCount(120)">120</span>
                <text> / </text>
                <span id="tc-240" onclick="setTimeCount(240)">240</span>
              </span>
            </div>
            <div id="right-wing">WPM: XX / ACC: XX</div>
          </div>
          <div id="typing-area">
            <div id="text-display"></div>
            <div class="bar">
              <input id="input-field" type="text" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" tabindex="1"/>
              <button id="redo-button" onclick="setText(event)" tabindex="2">redo</button>
            </div>
          </div>
        </div>
        <div id="theme-center" class="hidden">
          <div id="left-wing" onClick="hideThemeCenter();">< back</div>
          <div id="theme-area"></div>
        </div>
        <h1 id="lines-of-code-counter">0</h1>

        <script nonc="${nonce}" src="${gameScriptUri}"></script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
			</html>`;
    }
}
CatCodingPanel.viewType = "catCoding";
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map