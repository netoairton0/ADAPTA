document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const fileType = file.type.split('/')[0];
    const previewContainer = document.getElementById('previewContainer');
    const media = document.getElementById('media');
    const mainText1 = document.getElementById('mainText1');
    const mainText2 = document.getElementById('mainText2');

    if (file) {
        console.log(file);
        previewContainer.style.display = 'flex';

        if (fileType === 'image') {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.maxWidth = '30vw';
            img.style.maxHeight = '60vh';
            media.innerHTML = '';
            media.appendChild(img);
        } else if (fileType === 'audio') {
            const audio = document.createElement('audio');
            audio.controls = true;
            const source = document.createElement('source');
            source.src = URL.createObjectURL(file);
            source.type = file.type;
            audio.appendChild(source);
            media.innerHTML = '';
            media.appendChild(audio);
        } else if (fileType === 'text') {
            const iframe = document.createElement('iframe');
            iframe.src = URL.createObjectURL(file);
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            media.innerHTML = '';
            media.appendChild(iframe);
        }

        mainText1.addEventListener('click', () => {
            window.location.href = `/result?output=${mainText1.textContent}`;
        });

        mainText2.addEventListener('click', () => {
            window.location.href = `/result?output=${mainText2.textContent}`;
        });
    } else {
        previewContainer.style.display = 'none';
    }
});