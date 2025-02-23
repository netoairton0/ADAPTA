document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const fileType = file.type.split('/')[0];
    const previewContainer = document.getElementById('previewContainer');
    const media = document.getElementById('media');
    const mainText1 = document.getElementById('mainText1');
    const mainText2 = document.getElementById('mainText2');

    console.log(fileType)

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

        function setLoading(loading) {
            const loadingIndicator = document.getElementById('loading-indicator');
        
            if (loading) {
                loadingIndicator.style.display = 'flex'
            } else {
            loadingIndicator.style.display = 'none';
            }
        }

        const getUserType = () => {
            const name = 'userType=';
            const decodedCookie = decodeURIComponent(document.cookie);
            const ca = decodedCookie.split(';');
            for(let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return "";
        };

        const uploadFile = (maintextType) => {
            const formData = new FormData();
            formData.append('filename', file);
            formData.append('userType', getUserType());
            formData.append('outputType', maintextType); 

            setLoading(true)
        
            fetch('/file/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                console.log('Success:', result);
                setLoading(false)
                window.location.href = `/result?output=${maintextType}&path=${result.outputFilename}`;;
            })
            .catch(error => {
                setLoading(false)
                console.error('Error:', error);
            });
        };

        mainText1.addEventListener('click', () => {
            let maintextType
            if (fileType === "image" || fileType === "audio") {
                maintextType = "text";
            } else {
                maintextType = "audio";
            }
            uploadFile(maintextType);
        });

        mainText2.addEventListener('click', () => {
            let maintextType
            if (fileType === "image" ) {
                maintextType = "audio";
            } else {
                maintextType = "image";
            } 
            uploadFile(maintextType)
        });
    } else {
        previewContainer.style.display = 'none';
    }
});