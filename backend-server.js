const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();
require('dotenv-safe').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const USERS_FILE = 'data/users/users.json';
const BLACKLIST_FILE = 'data/blacklist.json';
const SECRET_KEY = process.env.JWT_SECRET;

const blacklist = fs.existsSync(BLACKLIST_FILE)
    ? JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'))
    : [];

const readUsers = () => {
    if (fs.existsSync(USERS_FILE)) {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    return [];
};

const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const hashPassword = (password) => {
    return crypto.createHmac('sha512', SECRET_KEY).update(password).digest('hex');
};

const saveBlacklist = () => {
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});

const app = express();
const port = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GENERATED_DIR = 'generated';
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR);

const UPLOADS_DIR = 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

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

app.post('/api/auth/register', (req, res) => {
    const { email, password, userType } = req.body;

    try {
        const users = readUsers();
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ success: false, message: 'Email já registrado' });
        }
        const hashedPassword = hashPassword(String(password));
        users.push({ email, password: hashedPassword, userType });

        writeUsers(users);
        res.status(201).json({ success: true, message: 'Usuário registrado com sucesso' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar usuário' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    try {
        const users = readUsers();
        const user = users.find(u => u.email === email && u.password === hashPassword(password));

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ email: user.email, userType: user.userType }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ success: true, token, userType: user.userType });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao autenticar usuário' });
    }
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });
    if (blacklist.includes(token)) return res.status(403).json({ success: false, message: 'Token inválido' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token inválido' });

        req.user = user;
        next();
    });
};

app.post('/auth/logout', (req, res) => {
    const token = req.headers['authorization'];

    if (token) {
        blacklist.push(token);
        saveBlacklist();
    }

    res.json({ success: true, message: 'Logout realizado com sucesso' });
});

app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ success: true, message: `Acesso autorizado para ${req.user.email} (${req.user.userType})` });
});

app.get('/api/user-history', (req, res) => {
    const userType = req.headers['user-type'];
    const email = req.headers['user-email'];
    let history = [];

    try {
        if (userType === 'researcher' && email) {
            const allHistory = JSON.parse(fs.readFileSync('data/history/history.json', 'utf8'));
            history = allHistory.filter(entry => entry.username === email);
        }
        
        res.json({ history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch history data',
            history: []
        });
    }
});

app.get("/api/generated/:filename", (req, res) => {
    const filePath = path.join(__dirname, "generated", req.params.filename);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error sending file:", err);
            res.status(err.status || 500).send("File not found");
        }
    });
});

app.post('/api/process-upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            res.statusCode = 412;
            return res.end('Error uploading file - ' + err.message);
        }
        
        try {
            const { userType, outputType, email } = req.body;
            const inputType = req.file.mimetype.split('/')[0]; // "image", "audio", "text"
            const inputFilePath = req.file.path;
    
            let responseData, outputFilename, outputFilePath;
    
            if (inputType === 'image' && outputType === 'text') {
                // Image -> Text (OCR using GPT-4 Vision)
                const imageBuffer = fs.readFileSync(inputFilePath);
                const image = imageBuffer.toString('base64');
                responseData = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a core functioning part of a brazilian acessibility system. Please describe the image in a informative way in plain text in brazilian portuguese'
                        },
                        {
                            role: 'user',
                            content: [{ type: 'image_url', image_url:{ "url": `data:${req.file.mimetype};base64,${image}`} }]
                        }
                    ],
                    max_tokens: 500
                });
    
                const extractedText = responseData.choices[0].message.content;
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.txt');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
                fs.writeFileSync(outputFilePath, extractedText);
    
            } else if (inputType === 'image' && outputType === 'audio') {
                // Image -> Text -> Audio
                const imageBuffer = fs.readFileSync(inputFilePath);
                const image = imageBuffer.toString('base64');
                const extractedTextResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a core functioning part of a brazilian acessibility system. Please describe the image in a informative way in plain text in brazilian portuguese'
                        },
                        {
                            role: 'user',
                            content: [{ type: 'image_url', image_url:{ "url": `data:${req.file.mimetype};base64,${image}`} }]
                        }
                    ],
                    max_tokens: 500
                });
    
                const extractedText = extractedTextResponse.choices[0].message.content;
    
                // Convert extracted text to speech
                responseData = await openai.audio.speech.create({
                    model: 'tts-1',
                    input: extractedText,
                    voice: 'ash'
                });
    
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.mp3');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
                fs.writeFileSync(outputFilePath, Buffer.from(await responseData.arrayBuffer()));
    
            } else if (inputType === 'audio' && outputType === 'text') {
                // Audio -> Text (Speech-to-Text using Whisper)
                const audioFile = fs.createReadStream(inputFilePath);
                responseData = await openai.audio.transcriptions.create({
                    model: 'whisper-1',
                    file: audioFile
                });
    
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.txt');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
                fs.writeFileSync(outputFilePath, responseData.text);
    
            } else if (inputType === 'audio' && outputType === 'image') {
                // Audio -> Text -> Image
                const audioFile = fs.createReadStream(inputFilePath);
                const transcription = await openai.audio.transcriptions.create({
                    model: 'whisper-1',
                    file: audioFile
                });
    
                const extractedText = transcription.text;
    
                // Generate image from text
                responseData = await openai.images.generate({
                    prompt: extractedText,
                    model: 'dall-e-3'
                });
    
                const imageUrl = responseData.data[0].url;
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.png');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
    
                // Download the generated image
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                fs.writeFileSync(outputFilePath, Buffer.from(imageBuffer));
    
            } else if (inputType === 'text' && outputType === 'image') {
                // Text -> Image (Generate an image from text using DALL·E)
                const textPrompt = fs.readFileSync(inputFilePath, 'utf8');
                responseData = await openai.images.generate({
                    prompt: textPrompt,
                    model: 'dall-e-3'
                });
    
                const imageUrl = responseData.data[0].url;
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.png');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
    
                // Download the generated image
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                fs.writeFileSync(outputFilePath, Buffer.from(imageBuffer));
    
            } else if (inputType === 'text' && outputType === 'audio') {
                // Text -> Audio (Convert text to speech)
                const textContent = fs.readFileSync(inputFilePath, 'utf8');
                responseData = await openai.audio.speech.create({
                    model: 'tts-1',
                    input: textContent,
                    voice: 'ash'
                });
    
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.mp3');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
                fs.writeFileSync(outputFilePath, Buffer.from(await responseData.arrayBuffer()));
    
            } else {
                return res.status(400).json({
                    success: false,
                    message: `Invalid conversion: ${inputType} -> ${outputType} not supported`
                });
            }
    
            // Save history if user is a researcher
            if (userType === 'researcher') {
                const historyPath = 'data/history/history.json';
                const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
                history.push({
                    username: email,
                    filename: req.file.filename,
                    outputFilename: outputFilename,
                    outputType: outputType,
                    inputType: inputType,
                    timestamp: new Date().toISOString()
                });
                fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
            }
            

            res.json({
                success: true,
                outputFilename,
                outputFilePath
            });
    
        } catch (error) {
            console.error('Error processing upload:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process upload'
            });
        }
    });
});

app.delete('/api/history/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const email = req.headers['user-email'];

    try {
        const history = JSON.parse(fs.readFileSync('data/history/history.json', 'utf8'));
        const userHistory = history.filter(entry => entry.username === email);

        if (index >= 0 && index < userHistory.length) {
             const uploadFileToDelete = userHistory[index].filename;
             const generatedFileToDelete = userHistory[index].outputFilename;

             try {
                 fs.unlinkSync(`uploads/${uploadFileToDelete}`);
                 fs.unlinkSync(`generated/${generatedFileToDelete}`);
             } catch (fileError) {
                 console.error('Error deleting file:', fileError);
             }

            userHistory.splice(index, 1);
            const updatedHistory = history.filter(entry => entry.username !== email).concat(userHistory);
            fs.writeFileSync('data/history/history.json', JSON.stringify(updatedHistory, null, 2));
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid index' });
        }
    } catch (error) {
        console.error('Error deleting history entry:', error);
        res.status(500).json({ success: false, message: 'Failed to delete history entry' });
    }
});

app.post('/api/history/move-up/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const email = req.headers['user-email'];

    try {
        const history = JSON.parse(fs.readFileSync('data/history/history.json', 'utf8'));
        const userHistory = history.filter(entry => entry.username === email);

        if (index > 0 && index < userHistory.length) {
            const temp = userHistory[index - 1];
            userHistory[index - 1] = userHistory[index];
            userHistory[index] = temp;

            const updatedHistory = history.filter(entry => entry.username !== email).concat(userHistory);
            fs.writeFileSync('data/history/history.json', JSON.stringify(updatedHistory, null, 2));
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid index' });
        }
    } catch (error) {
        console.error('Error moving history entry up:', error);
        res.status(500).json({ success: false, message: 'Failed to move history entry up' });
    }
});

app.post('/api/history/move-down/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const email = req.headers['user-email'];

    try {
        const history = JSON.parse(fs.readFileSync('data/history/history.json', 'utf8'));
        const userHistory = history.filter(entry => entry.username === email);

        if (index >= 0 && index < userHistory.length - 1) {
            const temp = userHistory[index + 1];
            userHistory[index + 1] = userHistory[index];
            userHistory[index] = temp;

            const updatedHistory = history.filter(entry => entry.username !== email).concat(userHistory);
            fs.writeFileSync('data/history/history.json', JSON.stringify(updatedHistory, null, 2));
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid index' });
        }
    } catch (error) {
        console.error('Error moving history entry down:', error);
        res.status(500).json({ success: false, message: 'Failed to move history entry down' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});