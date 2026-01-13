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

        console.log("Processed Entry:", entry);

        // Map data from server response (handling both flat and nested structures)
        const eventData = entry.eventData || entry;
        const title = eventData.title || "";
        const description = eventData.description || "";
        const googleLink = entry.googleLink || entry.googleCalendarLink || "";
        // icsContent might not be in the new response, defaulting to empty or checking if available
        const icsContent = entry.icsContent || "";

        // Parse start time for inputs
        let dateStr = "";
        let timeStr = "";

        if (eventData.start) {
            // content format is likely ISO: 2025-11-24T19:30:00
            const startDateObj = new Date(eventData.start);
            if (!isNaN(startDateObj)) {
                // Formatting to YYYY-MM-DD
                dateStr = startDateObj.toISOString().split('T')[0];
                // Formatting to HH:MM
                timeStr = startDateObj.toTimeString().slice(0, 5);
            } else {
                // Fallback if raw string usage is needed or format differs
                console.warn("Could not parse start date:", eventData.start);
            }
        }
        // Fallback to old keys if eventData.start wasn't present
        else if (eventData.startDate) {
            dateStr = eventData.startDate;
            timeStr = eventData.startTime || "";
        }

        // Populate form
        titleInput.value = title;
        dateInput.value = dateStr;
        timeInput.value = timeStr;
        descInput.value = description;

        // Store links for button actions
        addBtn.dataset.gcal = googleLink;
        addBtn.dataset.ics = icsContent;

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
