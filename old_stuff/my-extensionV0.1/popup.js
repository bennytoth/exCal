// Popup Script - Brutalistisches Design UI Logic
// Lädt markierten Text und verarbeitet Formulareingaben

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elemente
  const textDisplay = document.getElementById('selectedText');
  const titleInput = document.getElementById('titleInput');
  const timeDisplay = document.getElementById('timeDisplay');
  const descriptionInput = document.getElementById('descriptionInput');
  const submitBtn = document.getElementById('submitBtn');

  // Markierten Text vom Background Script laden
  chrome.runtime.sendMessage({ action: 'getText' }, (response) => {
    if (response && response.text) {
      textDisplay.textContent = response.text;
    } else {
      textDisplay.textContent = 'Kein Text markiert';
    }
  });

  // Event Listener für Submit Button
  submitBtn.addEventListener('click', () => {
    // Eingaben auslesen
    const data = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      text: textDisplay.textContent,
      time: timeDisplay.textContent
    };

    // Daten in der Konsole ausgeben
    console.log('=== CAPTURED DATA ===');
    console.log(data);
    console.log('====================');

    // TODO: Send data to n8n webhook
    // fetch('YOUR_N8N_WEBHOOK_URL', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data)
    // })
    // .then(response => response.json())
    // .then(result => console.log('Success:', result))
    // .catch(error => console.error('Error:', error));

    // Visuelles Feedback
    submitBtn.textContent = 'GESPEICHERT';
    setTimeout(() => {
      submitBtn.textContent = 'BESTÄTIGEN';
    }, 1500);
  });
});