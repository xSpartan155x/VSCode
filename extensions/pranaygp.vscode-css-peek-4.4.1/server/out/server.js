"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const minimatch_1 = require("minimatch");
const path = require("path");
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const findSelector_1 = require("./core/findSelector");
const findDefinition_1 = require("./core/findDefinition");
const logger_1 = require("./logger");
// Creates the LSP connection
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Create a manager for open text documents
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// Create a map of styleSheet URIs to the stylesheet text content
// NOTE: this is a really bad cache in practice. Large files will occupy tons of memory without being reused
// We should use an in-memory javascript database of some sort with a basic cache invalidation strategy
// like LRU, an implement some sort of memory cap
const styleSheets = {};
// The workspace folder this server is operating on
let workspaceFolder;
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
async function isValidPeekTarget(document) {
    const settings = await getDocumentSettings(document.uri);
    return !settings.peekToExclude.find((glob) => (0, minimatch_1.minimatch)(document.uri, glob));
}
async function isValidPeekSource(document) {
    const settings = await getDocumentSettings(document.uri);
    return settings.peekFromLanguages.includes(document.languageId);
}
/* Handle Document Updates */
documents.onDidOpen(async (event) => {
    if (!(await isValidPeekTarget(event.document))) {
        return;
    }
    if ((0, findDefinition_1.isLanguageServiceSupported)(event.document.languageId)) {
        connection.console.log(`[Server(${process.pid}) ${path.basename(workspaceFolder)}/] Document opened: ${path.basename(event.document.uri)}.`);
        styleSheets[event.document.uri] = {
            document: event.document,
        };
    }
});
documents.onDidChangeContent(async (event) => {
    if (!(await isValidPeekTarget(event.document))) {
        return;
    }
    if ((0, findDefinition_1.isLanguageServiceSupported)(event.document.languageId)) {
        connection.console.log(`[Server(${process.pid}) ${path.basename(workspaceFolder)}/] Document changed: ${path.basename(event.document.uri)}. Invalidating Cache.`);
        styleSheets[event.document.uri] = {
            document: event.document,
        };
    }
});
documents.listen(connection);
/* Server Initialization */
connection.onInitialize((params) => {
    (0, logger_1.create)(connection.console);
    const capabilities = params.capabilities;
    workspaceFolder = params.rootUri;
    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability =
        capabilities.workspace && !!capabilities.workspace.configuration;
    hasWorkspaceFolderCapability =
        capabilities.workspace && !!capabilities.workspace.workspaceFolders;
    connection.console.log(`[Server(${process.pid}) ${path.basename(workspaceFolder)}/] onInitialize`);
    setupInitialStyleMap(params);
    connection.console.log(`[Server(${process.pid}) ${path.basename(workspaceFolder)}/] setupInitialStylemap`);
    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: node_1.TextDocumentSyncKind.Full,
            },
            definitionProvider: true,
            workspaceSymbolProvider: true,
        },
    };
});
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log("Workspace folder change event received.");
        });
    }
});
// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings = {
    supportTags: true,
    peekFromLanguages: ["html"],
    peekToExclude: ["**/node_modules/**", "**/bower_components/**"],
};
let globalSettings = defaultSettings;
// Cache the settings of all open documents
const documentSettings = new Map();
connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    }
    else {
        globalSettings = (change.settings.cssPeek || defaultSettings);
    }
});
function getDocumentSettings(resource) {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: "cssPeek",
        });
        documentSettings.set(resource, result);
    }
    return result;
}
// Only keep settings for open documents
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri);
});
function setupInitialStyleMap(params) {
    const styleFiles = params.initializationOptions.stylesheets;
    connection.console.log(`[Server(${process.pid}) ${path.basename(workspaceFolder)}/] Number of style sheets - ${styleFiles.length}`);
    styleFiles.forEach((fileUri) => {
        const languageId = fileUri.fsPath.split(".").slice(-1)[0];
        // TODO: this is bad. stop using the file system directly. Instead, use the VSCode
        // fs API to support the virutal filesystem
        // https://github.com/microsoft/vscode/wiki/Virtual-Workspaces
        const text = fs.readFileSync(fileUri.fsPath, "utf8");
        const document = vscode_languageserver_textdocument_1.TextDocument.create(fileUri.uri, languageId, 1, text);
        styleSheets[fileUri.uri] = {
            document,
        };
    });
}
connection.onDefinition(async (textDocumentPositon) => {
    const documentIdentifier = textDocumentPositon.textDocument;
    const position = textDocumentPositon.position;
    const document = documents.get(documentIdentifier.uri);
    if (!(await isValidPeekSource(document))) {
        return null;
    }
    const settings = await getDocumentSettings(document.uri);
    const selector = (0, findSelector_1.default)(document, position, settings);
    if (!selector) {
        return null;
    }
    return (0, findDefinition_1.findDefinition)(selector, styleSheets);
});
connection.onWorkspaceSymbol(({ query }) => {
    if (query.length < 2)
        return [];
    const selectors = [
        {
            attribute: "class",
            value: query,
        },
        {
            attribute: "id",
            value: query,
        },
        {
            attribute: "tag",
            value: query,
        },
    ];
    return selectors.reduce((p, selector) => [...p, ...(0, findDefinition_1.findSymbols)(selector, styleSheets)], []);
});
connection.listen();
//# sourceMappingURL=server.js.map