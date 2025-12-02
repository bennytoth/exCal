// Background Service Worker für die Extension

// Wenn Extension-Icon geklickt wird
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Prüfen ob Text markiert ist
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString().trim()
        });
        
        const hasSelection = result[0]?.result;
        
        if (hasSelection) {
            // Text markiert -> Popup-Fenster öffnen
            chrome.windows.create({
                url: chrome.runtime.getURL('popup/popup.html'),
                type: 'popup',
                width: 360,
                height: 550
            });
        } else {
            // Nichts markiert -> Übersichtsseite als Tab öffnen
            chrome.tabs.create({
                url: chrome.runtime.getURL('overview/overview.html')
            });
        }
    } catch (error) {
        console.error('Error:', error);
        // Fallback: Übersichtsseite öffnen
        chrome.tabs.create({
            url: chrome.runtime.getURL('overview/overview.html')
        });
    }
});