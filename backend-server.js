const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.post('/api/process-upload', (req, res) => {
    const { userType, fileName, outputType, email } = req.body;
    
    try {
        if (userType === 'researcher') {
            const users = JSON.parse(fs.readFileSync('data/users/users.json', 'utf8'));
            const user = users.find(u => u.email === email);

            if (user) {
                const history = JSON.parse(fs.readFileSync('data/history/history.json', 'utf8'));
                history.push({ 
                    username: user.email, 
                    filename: fileName, 
                    outputType: outputType,
                    timestamp: new Date().toISOString()
                });
                
                fs.writeFileSync('data/history/history.json', JSON.stringify(history, null, 2));
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to process upload'
        });
    }
});

app.delete('/api/history/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const email = req.headers['user-email'];

    try {
        const history = JSON.parse(fs.readFileSync('data/history/history.json', 'utf8'));
        const userHistory = history.filter(entry => entry.username === email);

        if (index >= 0 && index < userHistory.length) {
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