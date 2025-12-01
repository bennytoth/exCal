document.addEventListener('DOMContentLoaded', async () => {
    // 1. DOM Elemente holen
    const loadingView = document.getElementById('loading');
    const contentView = document.getElementById('content');
    const errorView = document.getElementById('error');
    const successView = document.getElementById('success');
    const errorMessage = document.getElementById('error-message');

    const titleInput = document.getElementById('title');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const descInput = document.getElementById('description');
    const addBtn = document.getElementById('add-btn');

    // Helper: Ansichten wechseln
    const showView = (view) => {
        [loadingView, contentView, errorView, successView].forEach(v => v.classList.add('hidden'));
        view.classList.remove('hidden');
    };

    // Helper: Formular füllen
    const populateForm = (entry) => {
        titleInput.value = entry.title || "";
        dateInput.value = entry.startDate || "";
        timeInput.value = entry.startTime || "";
        descInput.value = entry.description || "";
        
        // Links für Buttons speichern
        addBtn.dataset.gcal = entry.googleCalendarLink || "";
        addBtn.dataset.ics = entry.icsContent || "";
    };

    // START: Hauptlogik
    try {
        // SCHRITT A: Tab identifizieren
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error("Kein aktiver Tab gefunden.");
        }

        // SCHRITT B: Persistence Check (Haben wir noch Daten von gerade eben?) [cite: 3, 4]
        // Wir prüfen, ob im localStorage Daten liegen, die jünger als 5 Minuten sind.
        const storedData = localStorage.getItem('exCal_draft');
        const storedTimestamp = localStorage.getItem('exCal_time');
        const isRecent = storedTimestamp && (Date.now() - parseInt(storedTimestamp) < 5 * 60 * 1000);

        if (storedData && isRecent) {
            console.log("Lade Daten aus LocalStorage...");
            const entry = JSON.parse(storedData);
            populateForm(entry);
            showView(contentView);
            // Wir machen hier KEINEN Return, sondern holen im Hintergrund trotzdem frische Daten, 
            // oder wir lassen es so, wenn wir Traffic sparen wollen. 
            // Für V1: Wenn Daten da sind, zeigen wir sie an. Wenn User neu scannen will, muss er das Popup neu öffnen? 
            // Besser: Wir scannen immer neu, außer User drückt explizit "Restore". 
            // Hier überschreiben wir es einfachheitshalber mit dem neuen Scan unten.
        }

        // SCHRITT C: Kontext von der Webseite holen (Dein neuer Code) 
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                return {
                    selectedText: window.getSelection().toString(),
                    pageTitle: document.title,
                    url: window.location.href,
                    // Limitierung auf 5000 Zeichen für Token-Effizienz [cite: 8]
                    pageContent: document.body.innerText.substring(0, 5000) 
                };
            }
        });

        const data = result[0]?.result;

        // Validierung: Wenn gar nichts da ist -> Fehler
        if (!data || (!data.selectedText && !data.pageContent)) {
            // Wenn wir gespeicherte Daten hatten, bleiben wir bei denen. Sonst Fehler.
            if (!storedData) throw new Error("Kein Inhalt auf der Seite gefunden.");
        }

        // Wenn Text markiert ist, senden wir IMMER an n8n (Live Update)
        if (data.selectedText || data.pageContent) {
            console.log("Sende Request an n8n...", CONFIG.API_URL);
            
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                    // Hier später API-Key Header einfügen für Security [cite: 17]
                },
                body: JSON.stringify({
                    text: data.selectedText,      // Priorität 1
                    pageTitle: data.pageTitle,    // Kontext
                    url: data.url,                // Kontext
                    pageContent: data.pageContent // Priorität 2 (Fallback)
                })
            });

            if (!response.ok) {
                throw new Error(`Server Fehler: ${response.status}`);
            }

            let entry = await response.json();
            
            // n8n gibt manchmal Array zurück, manchmal Objekt
            if (Array.isArray(entry) && entry.length > 0) {
                entry = entry[0];
            }

            console.log("n8n Antwort:", entry);
            
            // Ergebnis anzeigen
            populateForm(entry);
            
            // Ergebnis sofort im LocalStorage sichern (Persistence) [cite: 4]
            localStorage.setItem('exCal_draft', JSON.stringify(entry));
            localStorage.setItem('exCal_time', Date.now().toString());
            
            showView(contentView);
        }

    } catch (err) {
        console.error(err);
        errorMessage.textContent = "Fehler: " + err.message;
        showView(errorView);
    }

    // Event Listener: Speichere Änderungen vom User manuell ab (Persistence)
    [titleInput, dateInput, timeInput, descInput].forEach(input => {
        input.addEventListener('input', () => {
            const currentState = {
                title: titleInput.value,
                startDate: dateInput.value,
                startTime: timeInput.value,
                description: descInput.value,
                googleCalendarLink: addBtn.dataset.gcal,
                icsContent: addBtn.dataset.ics
            };
            localStorage.setItem('exCal_draft', JSON.stringify(currentState));
        });
    });

    // Handle "Add" Button
    addBtn.addEventListener('click', () => {
        const gcalLink = addBtn.dataset.gcal;
        const icsContent = addBtn.dataset.ics;

        if (gcalLink) {
            window.open(gcalLink, '_blank');
        }

        if (icsContent) {
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'event.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // Nach erfolgreichem Hinzufügen Speicher löschen
        localStorage.removeItem('exCal_draft');
        localStorage.removeItem('exCal_time');

        showView(successView);
    });
});