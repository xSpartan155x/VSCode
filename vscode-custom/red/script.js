const THEME_NAME = "red";

const THEME_SELECTORS = {
    editorContent: ".monaco-workbench .part.editor>.content",
};

const MODAL_SELECTORS = [
    ".quick-input-widget",
    ".monaco-dialog-box",
    ".monaco-menu-container.visible",
    ".suggest-widget.visible",
];

const THEME_ELEMENT_IDS = {
    overlay: "bg-blur",
};

const OVERLAY_SYNC_INTERVAL_MS = 150;
const ESCAPE_SYNC_DELAYS_MS = [0, 50, 150];

document.addEventListener("DOMContentLoaded", initializeCommandPaletteOverlay);

function initializeCommandPaletteOverlay() {
    document.documentElement.dataset.vscodeCustomTheme = THEME_NAME;
    registerOverlayEventHandlers();
    observeWorkbenchState();
    window.setInterval(syncOverlayVisibility, OVERLAY_SYNC_INTERVAL_MS);
    syncOverlayVisibility();
}

function observeWorkbenchState() {
    const workbenchElement = document.body;

    if (!workbenchElement) {
        return;
    }

    const workbenchObserver = new MutationObserver(() => {
        syncOverlayVisibility();
    });

    workbenchObserver.observe(workbenchElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "aria-hidden"],
    });
}

function registerOverlayEventHandlers() {
    document.addEventListener("keydown", handleDocumentKeydown, true);
    window.addEventListener("focus", syncOverlayVisibility);
}

function handleDocumentKeydown(event) {
    if (event.key !== "Escape") {
        return;
    }

    for (const delayMs of ESCAPE_SYNC_DELAYS_MS) {
        window.setTimeout(syncOverlayVisibility, delayMs);
    }
}

function syncOverlayVisibility() {
    if (hasVisibleModal()) {
        ensureOverlay();
        return;
    }

    removeOverlay();
}

function isElementVisible(element) {
    if (!element || !element.isConnected) {
        return false;
    }

    const computedStyle = window.getComputedStyle(element);

    return (
        computedStyle.display !== "none" &&
        computedStyle.visibility !== "hidden" &&
        computedStyle.opacity !== "0" &&
        element.getAttribute("aria-hidden") !== "true"
    );
}

function hasVisibleModal() {
    return MODAL_SELECTORS.some((selector) => {
        const elements = document.querySelectorAll(selector);

        return Array.from(elements).some(isElementVisible);
    });
}

function ensureOverlay() {
    const editorContentElement = document.querySelector(THEME_SELECTORS.editorContent);

    if (!editorContentElement || document.getElementById(THEME_ELEMENT_IDS.overlay)) {
        return;
    }

    const overlayElement = document.createElement("div");
    overlayElement.id = THEME_ELEMENT_IDS.overlay;
    overlayElement.addEventListener("click", removeOverlay);
    editorContentElement.appendChild(overlayElement);
}

function removeOverlay() {
    const overlayElement = document.getElementById(THEME_ELEMENT_IDS.overlay);

    if (overlayElement) {
        overlayElement.remove();
    }
}