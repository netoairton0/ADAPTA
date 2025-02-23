const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});

const app = express();
const port = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GENERATED_DIR = 'generated';
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR);

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

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    try {
        const users = JSON.parse(fs.readFileSync('data/users/users.json', 'utf8'));
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            res.json({
                success: true,
                userType: user.type
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
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
                console.log('Extracted text:', extractedText);
                outputFilename = req.file.filename.replace(/\.[^.]+$/, '.txt');
                outputFilePath = path.join(GENERATED_DIR, outputFilename);
                fs.writeFileSync(outputFilePath, extractedText);
    
            } else if (inputType === 'image' && outputType === 'audio') {
                // Image -> Text -> Audio
                const imageBuffer = fs.readFileSync(inputFilePath);
                const extractedTextResponse = await openai.chat.completions.create({
                    model: 'gpt-4-vision-preview',
                    messages: [
                        {
                            role: 'system',
                            content: 'Describe this image in a detailed and informative way.'
                        },
                        {
                            role: 'user',
                            content: [{ type: 'image', image: imageBuffer }]
                        }
                    ],
                    max_tokens: 500
                });
    
                const extractedText = extractedTextResponse.choices[0].message.content;
    
                // Convert extracted text to speech
                responseData = await openai.audio.speech.create({
                    model: 'tts-1',
                    input: extractedText,
                    voice: 'alloy'
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
                    voice: 'alloy'
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