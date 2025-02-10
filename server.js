const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

app.use(express.static('src'));
app.use(cookieParser());

const pages = ['index', 'login', 'cadastro', 'bemvindo', 'adaptar'];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'src', `${page}.html`));
    });
});

app.get('/get-theme', (req, res) => {
    res.json({ tema: req.cookies.tema || 'light' });
});

app.get('/toggle-theme', (req, res) => {
    const novoTema = req.cookies.tema === 'dark' ? 'light' : 'dark';
    res.cookie('tema', novoTema, { maxAge: 86400000 }); // Expira em 1 dia
    res.json({ tema: novoTema });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});