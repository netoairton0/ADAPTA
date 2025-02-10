document.addEventListener('DOMContentLoaded', () => {
    const themeButton = document.getElementById('toggleTheme');
    const themeImage = document.getElementById('themeImage');
    const themeIcon = document.getElementById('themeIcon');

    function atualizarTema(tema) {
        document.body.className = tema;
        themeImage.src = tema === 'dark' ? 'assets/images/adaptaLogoVerde.png' : 'assets/images/adaptaLogoBranca.png';
        themeIcon.textContent = tema === 'dark' ? 'dark_mode' : 'light_mode';
    }

    fetch('/get-theme')
        .then(response => response.json())
        .then(data => {
            atualizarTema(data.tema);
        });

    themeButton.addEventListener('click', () => {
        fetch('/toggle-theme')
            .then(response => response.json())
            .then(data => {
                atualizarTema(data.tema);
            });
    });
});
