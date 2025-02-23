async function fetchAndDisplayMedia(mediaType, path) {
    const resultPreview = document.getElementById('resultPreview');

    console.log(mediaType, path);
    
    try {
        // Show loading state
        resultPreview.innerHTML = 'Loading...';
        
        // Fetch media as blob
        const response = await fetch(`/api/generated/${path}`);
        if (!response.ok) throw new Error('Failed to fetch media');
        
        // Get the blob from response
        const blob = await response.blob();
        // Create an object URL from the blob
        const objectUrl = URL.createObjectURL(blob);
        
        let mediaHtml = '';
        
        switch(mediaType) {
            case 'image':
                mediaHtml = `
                    <img src="${objectUrl}" alt="Resultado da Imagem">
                    <div class="downloadButton">
                        <a href="${objectUrl}" download="generated-image.png">Baixar Imagem</a>
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
                // For text files, we might want to read and display the content
                const text = await blob.text();
                mediaHtml = `
                    <div style="width: 100%; height: 400px; border: 1px solid #ccc; overflow: auto; padding: 10px;">
                        <pre>${text}</pre>
                    </div>
                    <div class="downloadButton">
                        <a class="downloadButton" href="${objectUrl}" download="generated-text.txt">Baixar Texto</a>
                    </div>
                `;
                break;
        }
        
        resultPreview.innerHTML = mediaHtml;
        
        // Clean up function to revoke object URLs when the content changes
        const cleanup = () => {
            URL.revokeObjectURL(objectUrl);
            resultPreview.removeEventListener('change', cleanup);
        };
        
        resultPreview.addEventListener('change', cleanup);
        
    } catch (error) {
        resultPreview.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}