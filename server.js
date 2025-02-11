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

app.get('/get-font-size', (req, res) => {
    const fontSize = req.cookies.fontSize || 20; 
    res.json({ fonte: fontSize });
});

app.get('/toggle-theme', (req, res) => {
    const novoTema = req.cookies.tema === 'dark' ? 'light' : 'dark';
    res.cookie('tema', novoTema, { maxAge: 86400000 }); 
    res.json({ tema: novoTema });
});

app.get('/increase-font', (req, res) => {
    let tamanhoFonte = parseInt(req.cookies.fontSize) || 20;
    tamanhoFonte = Math.min(tamanhoFonte + 5, 30); 
    res.cookie('fontSize', tamanhoFonte, { maxAge: 31536000000 });
    res.json({ fonte: tamanhoFonte });
});

app.get('/decrease-font', (req, res) => {
    let tamanhoFonte = parseInt(req.cookies.fontSize) || 20;
    tamanhoFonte = Math.max(tamanhoFonte - 5, 10); 
    res.cookie('fontSize', tamanhoFonte, { maxAge: 31536000000 });
    res.json({ fonte: tamanhoFonte });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});