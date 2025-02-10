const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send();
});

app.get('/login', (req, res) => {
    res.send();
});

app.get('/cadastro', (req, res) => {
    res.send();
});

app.get('/bemvindo', (req, res) => {
    res.send();
});

app.get('/adaptar', (req, res) => {
    res.send();
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});