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

    // Helper to switch views
    const showView = (view) => {
        [loadingView, contentView, errorView, successView].forEach(v => v.classList.add('hidden'));
        view.classList.remove('hidden');
    };

    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error("No active tab found.");
        }

        // Execute script to get selection
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString()
        });

        const selectedText = result[0]?.result;

        if (!selectedText || selectedText.trim() === "") {
            errorMessage.textContent = "Please select some text on the page first.";
            showView(errorView);
            return;
        }

        // "Fetch" data from n8n
        console.log("Sending request to:", CONFIG.API_URL);
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: selectedText })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        let entry = await response.json();
        console.log("n8n Response:", entry);

        // n8n often returns an array of items (e.g., [{ title: ... }])
        if (Array.isArray(entry) && entry.length > 0) {
            entry = entry[0];
        }

        // Populate form
        titleInput.value = entry.title || "";
        dateInput.value = entry.startDate || "";
        timeInput.value = entry.startTime || "";
        descInput.value = entry.description || "";

        // Store links for button actions
        addBtn.dataset.gcal = entry.googleCalendarLink;
        addBtn.dataset.ics = entry.icsContent;

        showView(contentView);

    } catch (err) {
        console.error(err);
        errorMessage.textContent = "Error: " + err.message;
        showView(errorView);
    }

    // Handle "Add" button
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

        showView(successView);
    });
});
