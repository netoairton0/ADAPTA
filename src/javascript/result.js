document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const output = urlParams.get('output');
    const path = urlParams.get('path');

    if (output && path) {
        console.log('Fetching and displaying media:', output, path);
        fetchAndDisplayMedia(output, path);
    } else {
        console.error('Missing output or path parameter');
    }
});

async function fetchAndDisplayMedia(mediaType, path) {
    const resultPreview = document.getElementById('resultPreview');

    console.log(mediaType, path);
    
    try {
        resultPreview.innerHTML = 'Loading...';
        
        const response = await fetch(`/generated/${path}`);
        if (!response.ok) throw new Error('Failed to fetch media');
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        let mediaHtml = '';
        
        switch(mediaType) {
            case 'image':
                mediaHtml = `
                    <img id= "image" src="${objectUrl}" alt="Resultado da Imagem">
                    <div class="downloadButton">
                        <a  class="downloadButton" href="${objectUrl}" download="generated-image.png">Baixar Imagem</a>
                    </div>
                `;
                break;
                
            case 'audio':
                mediaHtml = `
                    <audio controls>
                        <source src="${objectUrl}" type="audio/mpeg">
                        Seu navegador não suporta o elemento de áudio.
                    </audio>
                    <div class="downloadButton">
                        <a class="downloadButton" href="${objectUrl}" download="generated-audio.mp3">Baixar Áudio</a>
                    </div>
                `;
                break;
                
            case 'text':
                const text = await blob.text();
                mediaHtml = `
                    <div style="width: 50vw; height: 400px; border: 1px solid #ccc; overflow: auto; padding: 10px;">
                        <p>${text}</p>
                    </div>
                    <div class="downloadButton">
                        <a class="downloadButton" href="${objectUrl}" download="generated-text.txt">Baixar Texto</a>
                    </div>
                `;
                break;
        }
        
        resultPreview.innerHTML = mediaHtml;
        
        const cleanup = () => {
            URL.revokeObjectURL(objectUrl);
            resultPreview.removeEventListener('change', cleanup);
        };
        
        resultPreview.addEventListener('change', cleanup);
        
    } catch (error) {
        resultPreview.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}