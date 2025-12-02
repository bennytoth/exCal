document.addEventListener('DOMContentLoaded', async () => {
    const loadingView = document.getElementById('loading');
    const errorView = document.getElementById('error');
    const emptyView = document.getElementById('empty');
    const eventsContainer = document.getElementById('events-container');
    const eventsList = document.getElementById('events-list');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');

    const showView = (view) => {
        [loadingView, errorView, emptyView, eventsContainer].forEach(v => v.classList.add('hidden'));
        view.classList.remove('hidden');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Kein Datum';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', { 
            weekday: 'short', 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        return timeStr;
    };

    const createEventCard = (event) => {
        const card = document.createElement('div');
        card.className = 'event-card';
        
        const dateTime = `${formatDate(event.startDate)}${event.startTime ? ' • ' + formatTime(event.startTime) : ''}`;
        
        card.innerHTML = `
            <h3 class="event-title">${event.title || 'Kein Titel'}</h3>
            <div class="event-meta">
                <span class="event-meta-icon">📅</span>
                <span>${dateTime}</span>
            </div>
            ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
            <div class="event-actions">
                ${event.googleCalendarLink ? `<button class="event-btn btn-primary" data-gcal="${event.googleCalendarLink}">Google Calendar</button>` : ''}
                ${event.icsContent ? `<button class="event-btn btn-secondary" data-ics='${JSON.stringify(event.icsContent)}'>ICS Download</button>` : ''}
            </div>
        `;

        // Event Listeners für Buttons
        const gcalBtn = card.querySelector('[data-gcal]');
        if (gcalBtn) {
            gcalBtn.addEventListener('click', () => {
                window.open(gcalBtn.dataset.gcal, '_blank');
            });
        }

        const icsBtn = card.querySelector('[data-ics]');
        if (icsBtn) {
            icsBtn.addEventListener('click', () => {
                const icsContent = JSON.parse(icsBtn.dataset.ics);
                const blob = new Blob([icsContent], { type: 'text/calendar' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${event.title || 'event'}.ics`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        return card;
    };

    const loadEvents = async () => {
        try {
            showView(loadingView);

            const response = await fetch(CONFIG.EVENTS_API_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Server Fehler: ${response.status}`);
            }

            let events = await response.json();
            
            // Falls n8n ein Array zurückgibt
            if (!Array.isArray(events)) {
                events = [events];
            }

            // Leere Arrays oder keine Events
            if (events.length === 0) {
                showView(emptyView);
                return;
            }

            // Events anzeigen
            eventsList.innerHTML = '';
            events.forEach(event => {
                const card = createEventCard(event);
                eventsList.appendChild(card);
            });

            showView(eventsContainer);

        } catch (err) {
            console.error(err);
            errorMessage.textContent = err.message;
            showView(errorView);
        }
    };

    // Retry Button
    retryBtn.addEventListener('click', loadEvents);

    // Initial laden
    loadEvents();
});