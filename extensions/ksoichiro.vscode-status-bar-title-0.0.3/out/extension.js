"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
let myStatusBarItem;
function activate(context) {
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
    context.subscriptions.push(myStatusBarItem);
    updateStatusBarItem(context);
}
exports.activate = activate;
function updateStatusBarItem(context) {
    // Workaround for detecting development mode:
    // https://github.com/microsoft/vscode/issues/10272
    const isDevelopment = vscode.env.sessionId === 'someValue.sessionId';
    const icon = isDevelopment ? '$(debug)' : '$(project)';
    const name = vscode.workspace.name;
    if (name) {
        myStatusBarItem.text = `${icon} ${name}`;
        myStatusBarItem.show();
    }
}
//# sourceMappingURL=extension.js.map