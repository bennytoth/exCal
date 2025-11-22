// Service Worker für Chrome Extension (Manifest V3)
// Verarbeitet Tastenkürzel und kommuniziert mit Content Script

// Variable zum Speichern des markierten Texts
let selectedText = '';

// Listener für Tastenkürzel (Ctrl+Shift+C)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'show-selection') {
    try {
      // Hole den aktuellen Tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        selectedText = 'Fehler: Kein aktiver Tab gefunden';
        await openPopupWindow();
        return;
      }

      // Injiziere Script direkt, um den markierten Text zu holen
      // Dies ist zuverlässiger als Content Scripts
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return window.getSelection().toString().trim();
        }
      });

      // Hole das Ergebnis aus dem injizierten Script
      if (results && results[0] && results[0].result) {
        selectedText = results[0].result;
      } else {
        selectedText = 'Kein Text markiert';
      }

      // Öffne das Popup
      await openPopupWindow();

    } catch (error) {
      console.error('Fehler:', error);
      selectedText = 'Fehler: ' + error.message;
      await openPopupWindow();
    }
  }
});

// Hilfsfunktion zum Öffnen des Popups
async function openPopupWindow() {
  try {
    await chrome.action.openPopup();
  } catch (e) {
    // Fallback: Öffne eigenständiges Popup-Fenster
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 450,
      height: 250
    });
  }
}

// Listener für Nachrichten vom Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getText') {
    // Sende den gespeicherten Text zurück an das Popup
    sendResponse({ text: selectedText });
  }
  return true;
});