// Content Script - Läuft auf allen Webseiten
// Liest den markierten Text aus und sendet ihn an den Background Service Worker

// Listener für Nachrichten vom Background Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    try {
      // Hole den aktuell markierten Text auf der Seite
      const text = window.getSelection().toString().trim();
      
      // Sende den Text zurück an den Background Worker
      sendResponse({ text: text });
    } catch (error) {
      console.error('Fehler beim Abrufen der Auswahl:', error);
      sendResponse({ text: '' });
    }
  }
  return true; // Wichtig: Signalisiert asynchrone Antwort
});