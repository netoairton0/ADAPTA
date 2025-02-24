const express = require('express');
const path = require('path');
const FormData = require('form-data');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const app = express();
const port = 3000;
const API_SERVER = 'http://localhost:4000';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.static('src'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const UPLOAD_DIR = 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const maxSize = 1024 * 1024 * 20;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não permitido'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: fileFilter
}).single('filename');

async function fetchFromBackend(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(`${API_SERVER}${url}`, mergedOptions);

        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching from backend (${url}):`, error.message);
        throw error;
    }
}

const pages = ['login', 'cadastro'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'src', 'html', `${page}.html`));
    });
});

app.get(`/`, (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'html', `index.html`));
});

app.get('/bemvindo', async (req, res) => {
    try {
        const userType = req.cookies.userType;
        const email = req.cookies.email;

        const data = await fetchFromBackend('/api/user-history', {
            headers: {
                'user-email': email,
                'user-type': userType
            }
        });

        res.render('bemvindo', {
            userType,
            history: data.history || []
        });
    } catch (error) {
        console.error('Error fetching welcome data:', error.message);
        res.status(500).send('Error fetching user data');
    }
});

app.get('/adaptar', (req, res) => {
    const fileType = req.query.type || 'arquivo';
    res.render('adaptar', { fileType, fileUploaded: false, filePath: null });
});

app.get('/result', (req, res) => {
    const output = req.query.output;
    res.render('result', { output });
});

app.get("/generated/:filename", async (req, res) => {
    try {
        const response = await fetch(`${API_SERVER}/api/generated/${req.params.filename}`);

        if (!response.ok) {
            return res.status(response.status).send("File not found");
        }

        const fileBuffer = await response.arrayBuffer(); 
        res.setHeader("Content-Type", response.headers.get("content-type"));
        res.send(Buffer.from(fileBuffer));
    } catch (error) {
        console.error("Error fetching file:", error);
        res.status(500).send("Error fetching file");
    }
});

app.post('/file/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            res.statusCode = 412;
            return res.end('Error uploading file - ' + err.message);
        }

        const form = new FormData();
        form.append('filename', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        form.append('userType', req.cookies.userType);
        form.append('email', req.cookies.email);
        form.append('outputType', req.body.outputType);

        try {
            let responseData
            await axios.post(`${API_SERVER}/api/process-upload`, form, {
                headers: {
                    ...form.getHeaders()
                }
            }).then(response => {
                responseData = response.data;
            });

            res.json({
                success: true,
                message: 'Upload realizado com sucesso!',
                outputFilename: responseData.outputFilename,
                outputFilePath: responseData.outputFilePath
            });

        } catch (error) {
            res.statusCode = 500;
            res.end('Error forwarding file - ' + error.message);
        } finally {
            fs.unlinkSync(req.file.path)
        }
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
    tamanhoFonte = Math.min(tamanhoFonte + 5, 40);
    res.cookie('fontSize', tamanhoFonte, { maxAge: 31536000000 });
    res.json({ fonte: tamanhoFonte });
});

app.get('/decrease-font', (req, res) => {
    let tamanhoFonte = parseInt(req.cookies.fontSize) || 20;
    tamanhoFonte = Math.max(tamanhoFonte - 5, 10);
    res.cookie('fontSize', tamanhoFonte, { maxAge: 31536000000 });
    res.json({ fonte: tamanhoFonte });
});

app.get('/history', async (req, res) => {
    try {
        const userType = req.cookies.userType;
        const email = req.cookies.email;

        const data = await fetchFromBackend('/api/user-history', {
            headers: {
                'user-email': email,
                'user-type': userType
            }
        });

        res.json({ history: data.history || [] });
    } catch (error) {
        console.error('Error fetching history:', error.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.post('/history/:index', async (req, res) => {
    try {
        const userType = req.cookies.userType;
        const email = req.cookies.email;
        const index = req.params.index;

        const data = await fetchFromBackend(`/api/history/${index}`, {
            method: 'DELETE',
            headers: {
                'user-email': email,
                'user-type': userType
            }
        });

        res.json(data);
    } catch (error) {
        console.error('Error deleting history entry:', error.message);
        res.status(500).json({ error: 'Failed to delete history entry' });
    }
});

app.post('/history/move-up/:index', async (req, res) => {
    try {
        const userType = req.cookies.userType;
        const email = req.cookies.email;
        const index = req.params.index;

        const data = await fetchFromBackend(`/api/history/move-up/${index}`, {
            method: 'POST',
            headers: {
                'user-email': email,
                'user-type': userType
            }
        });

        res.json(data);
    } catch (error) {
        console.error('Error moving history entry up:', error.message);
        res.status(500).json({ error: 'Failed to move history entry up' });
    }
});

app.post('/history/move-down/:index', async (req, res) => {
    try {
        const userType = req.cookies.userType;
        const email = req.cookies.email;
        const index = req.params.index;

        const data = await fetchFromBackend(`/api/history/move-down/${index}`, {
            method: 'POST',
            headers: {
                'user-email': email,
                'user-type': userType
            }
        });

        res.json(data);
    } catch (error) {
        console.error('Error moving history entry down:', error.message);
        res.status(500).json({ error: 'Failed to move history entry down' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const data = await fetchFromBackend('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });        

        if (data.success) {
            res.cookie('userType', data.userType, { maxAge: 86400000 });
            res.cookie('email', email, { maxAge: 86400000 });
            res.redirect('/bemvindo');
        } else {
            res.status(401).send('<script>alert("Usuário não cadastrado"); window.location.href = "/login";</script>');
        }
    } catch (error) {
        console.error('Authentication error:', error.message);
        res.status(401).send('<script>alert("Erro de autenticação"); window.location.href = "/login";</script>');
    }
});

app.listen(port, () => {
    console.log(`Frontend server running at http://localhost:${port}`);
});