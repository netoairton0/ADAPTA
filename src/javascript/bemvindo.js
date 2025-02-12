document.addEventListener('DOMContentLoaded', () => {
    const userType = '<%= userType %>';
    if (userType === 'researcher') {
        fetch('/api/history')
            .then(response => response.json())
            .then(data => {
                const historyList = document.getElementById('historyList');
                data.history.forEach(entry => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <p>Arquivo: ${entry.filename} (Tipo: ${entry.outputType})</p>
                        ${entry.outputType === 'image' ? '<a href="../../generated/example-image.jpg" download="example-image.jpg">Baixar Imagem</a>' : ''}
                        ${entry.outputType === 'audio' ? '<a href="../../generated/example-audio.wav" download="example-audio.mp3">Baixar Áudio</a>' : ''}
                        ${entry.outputType === 'text' ? '<a href="../../generated/example-text.txt" download="example-text.txt">Baixar Texto</a>' : ''}
                    `;
                    historyList.appendChild(listItem);
                });
            })
            .catch(error => console.error('Error fetching history:', error));
    }
});