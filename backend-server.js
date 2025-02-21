// backend-server.js - Handles data processing and authentication
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 4000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication endpoints
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

// Data management endpoints
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
        
        // Here you could add additional processing logic
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to process upload'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});