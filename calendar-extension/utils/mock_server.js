/**
 * Mock Server Utility
 * Simulates an API call to parse text into a calendar entry.
 */

const mockFetchCalendarEntry = (text) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simple heuristic to guess if it's a real request or just random text
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const dateStr = tomorrow.toISOString().split('T')[0];

            // Extract potential title (first 30 chars)
            const title = text.length > 30 ? text.substring(0, 30) + "..." : text;

            resolve({
                title: `Event: ${title}`,
                date: dateStr,
                time: "14:00",
                description: `Generated from selection: "${text}"`
            });
        }, 800); // Simulate network delay
    });
};
