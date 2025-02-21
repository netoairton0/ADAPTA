document.addEventListener('DOMContentLoaded', () => {
    const userType = '<%= userType %>';
    if (userType === 'researcher') {
        fetchHistory();
    }
});

function fetchHistory() {
    fetch('/history')
        .then(response => response.json())
        .then(data => {
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '';
            data.history.forEach((entry, index) => {
                const listItem = document.createElement('li');
                listItem.setAttribute('data-index', index);
                listItem.innerHTML = `
                    <p>Arquivo: ${entry.filename} (Tipo: ${entry.outputType})</p>
                    ${entry.outputType === 'image' ? '<a href="../../generated/example-image.jpg" download="example-image.jpg">Baixar Imagem</a>' : ''}
                    ${entry.outputType === 'audio' ? '<a href="../../generated/example-audio.wav" download="example-audio.mp3">Baixar Áudio</a>' : ''}
                    ${entry.outputType === 'text' ? '<a href="../../generated/example-text.txt" download="example-text.txt">Baixar Texto</a>' : ''}
                    <button class="deleteButton" onclick="deleteEntry(${index})">Delete</button>
                    <button class="moveUpButton" onclick="moveEntryUp(${index})">Move Up</button>
                    <button class="moveDownButton" onclick="moveEntryDown(${index})">Move Down</button>
                `;
                historyList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error fetching history:', error));
}

function deleteEntry(index) {
    fetch(`/history/${index}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } 
    })
    .catch(error => console.error('Error deleting entry:', error));
}

function moveEntryUp(index) {
    fetch(`/history/move-up/${index}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        }
    })
    .catch(error => console.error('Error moving entry up:', error));
}

function moveEntryDown(index) {
    fetch(`/history/move-down/${index}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        }
    })
    .catch(error => console.error('Error moving entry down:', error));
}