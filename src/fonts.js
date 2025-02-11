document.addEventListener('DOMContentLoaded', () => {
    const increaseFontButton = document.getElementById('increaseFont');
    const decreaseFontButton = document.getElementById('decreaseFont');

    function atualizarFonte(tamanho) {
        document.body.style.fontSize = tamanho + 'px';
    }

    fetch('/get-font-size')
        .then(response => response.json())
        .then(data => {
            atualizarFonte(data.fonte);
        });

    increaseFontButton.addEventListener('click', () => {
        fetch('/increase-font')
            .then(response => response.json())
            .then(data => {
                atualizarFonte(data.fonte);
            });
    });

    decreaseFontButton.addEventListener('click', () => {
        fetch('/decrease-font')
            .then(response => response.json())
            .then(data => {
                atualizarFonte(data.fonte);
            });
    });
});