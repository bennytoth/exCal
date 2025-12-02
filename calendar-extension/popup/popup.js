document.addEventListener('DOMContentLoaded', async () => {
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

    // "Alle Events ansehen" Links
    const viewAllLinks = document.querySelectorAll('.view-all-link, .view-all-link-error, .view-all-link-success');

    const showView = (view) => {
        [loadingView, contentView, errorView, successView].forEach(v => v.classList.add('hidden'));
        view.classList.remove('hidden');
    };

    const populateForm = (entry) => {
        titleInput.value = entry.title || "";
        dateInput.value = entry.startDate || "";
        timeInput.value = entry.startTime || "";
        descInput.value = entry.description || "";
        
        addBtn.dataset.gcal = entry.googleCalendarLink || "";
        addBtn.dataset.ics = entry.icsContent || "";
    };

    const saveFormData = () => {
        const currentState = {
            title: titleInput.value,
            startDate: dateInput.value,
            startTime: timeInput.value,
            description: descInput.value,
            googleCalendarLink: addBtn.dataset.gcal,
            icsContent: addBtn.dataset.ics
        };
        localStorage.setItem('exCal_draft', JSON.stringify(currentState));
        localStorage.setItem('exCal_time', Date.now().toString());
    };

    const loadSavedData = () => {
        const storedData = localStorage.getItem('exCal_draft');
        if (storedData) {
            const entry = JSON.parse(storedData);
            populateForm(entry);
            return true;
        }
        return false;
    };

    // Übersichtsseite öffnen - für ALLE Links
    viewAllLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Link geklickt, öffne Übersichtsseite...');
            
            const overviewUrl = chrome.runtime.getURL('overview/overview.html');
            console.log('URL:', overviewUrl);
            
            chrome.tabs.create({ url: overviewUrl }, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error('Fehler:', chrome.runtime.lastError);
                } else {
                    console.log('Tab erstellt:', tab);
                }
            });
        });
    });

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error("Kein aktiver Tab gefunden.");
        }

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                return {
                    selectedText: window.getSelection().toString().trim(),
                    pageTitle: document.title,
                    url: window.location.href,
                    pageContent: document.body.innerText.substring(0, 5000)
                };
            }
        });

        const data = result[0]?.result;
        const hasSelection = data && data.selectedText;

        if (hasSelection) {
            console.log("Text markiert, sende an n8n...");
            
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: data.selectedText,
                    pageTitle: data.pageTitle,
                    url: data.url,
                    pageContent: data.pageContent
                })
            });

            if (!response.ok) {
                throw new Error(`Server Fehler: ${response.status}`);
            }

            let entry = await response.json();
            
            if (Array.isArray(entry) && entry.length > 0) {
                entry = entry[0];
            }

            console.log("n8n Antwort:", entry);
            
            populateForm(entry);
            saveFormData();
            showView(contentView);

        } else {
            console.log("Kein Text markiert, lade gespeicherte Daten...");
            
            if (loadSavedData()) {
                showView(contentView);
            } else {
                throw new Error("Kein Text markiert und keine gespeicherten Daten vorhanden.");
            }
        }

    } catch (err) {
        console.error(err);
        errorMessage.textContent = err.message;
        showView(errorView);
    }

    [titleInput, dateInput, timeInput, descInput].forEach(input => {
        input.addEventListener('input', saveFormData);
    });

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
            a.click();
            URL.revokeObjectURL(url);
        }

        showView(successView);
    });
});