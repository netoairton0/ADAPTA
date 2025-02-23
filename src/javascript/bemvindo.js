document.addEventListener('DOMContentLoaded', () => {
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
                fetch(`/generated/${entry.outputFilename}`)
                    .then( response => {
                        if (!response.ok) throw new Error('Failed to fetch media');
                        response.blob()
                            .then(blob => {
                                const objectUrl = URL.createObjectURL(blob);
                                const listItem = document.createElement('li');
                                listItem.setAttribute('data-index', index);
                                listItem.innerHTML = `
                                    <p>Arquivo: ${entry.filename} (Tipo: ${entry.outputType})</p>
                                    ${entry.outputType === 'image' ? `<div class="downloadButton"><a href="${objectUrl}" download="example-image.jpg">Baixar Imagem</a></div>` : ''}
                                    ${entry.outputType === 'audio' ? `<div class="downloadButton"><a href="${objectUrl}" download="example-audio.mp3">Baixar Áudio</a></div>` : ''}
                                    ${entry.outputType === 'text' ? `<div class="downloadButton"><a href="${objectUrl}" download="example-text.txt">Baixar Texto</a></div>` : ''}
                                    <button class="deleteButton" onclick="deleteEntry(${index})"><span id="themeIcon" class="material-icons">delete</span></button>
                                    <button class="moveUpButton" onclick="moveEntryUp(${index})"><span id="themeIcon" class="material-icons">arrow_upward</span></button>
                                    <button class="moveDownButton" onclick="moveEntryDown(${index})"><span id="themeIcon" class="material-icons">arrow_downward</span></button>
                                `;
                                historyList.appendChild(listItem);
                            })
                    })
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