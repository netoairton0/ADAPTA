const express = require('express');
const path = require('path');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const fs = require('fs')

const app = express();
const port = 3000;

app.use(express.static('src'));
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cookieParser());

const pages = ['login', 'cadastro', 'bemvindo', 'adaptar'];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'src', 'html', `${page}.html`));
    });
});

app.get(`/`, (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'html', `index.html`));
});

const maxSize = 1024*1024*20; // Limite de tamanho de upload - 20MB

const storage = multer.diskStorage({ //configurações de armazenamento do multer
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage : storage,
    limits  : { fileSize: maxSize }
}).single('filename');

app.post('/file/upload', function(req, res) {
    upload(req, res, function (err) {
        if (err) {
            res.send(' <h2>O seu upload NÃO foi realizado! <h2>' +
            '<p> motivo: '+err.message);
            return console.log(err.message);
        }
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

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users/users.json', 'utf8'));

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.cookie('userType', user.type, { maxAge: 86400000 }); // Expira em 1 dia
        res.redirect('/adaptar');
    } else {
        res.status(401).send('<script>alert("Usuário não cadastrado"); window.location.href = "/login";</script>');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});