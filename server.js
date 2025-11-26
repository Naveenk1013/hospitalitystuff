const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'assets', 'data', 'jobs.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files so we can access admin/index.html

// Simple Auth Middleware
const ADMIN_PASSWORD = 'admin123';
const AUTH_TOKEN = 'secret-token-123'; // In a real app, use JWT

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: AUTH_TOKEN });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === AUTH_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Get all jobs
app.get('/api/jobs', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return res.json([]);
            return res.status(500).json({ error: 'Failed to read data' });
        }
        res.json(JSON.parse(data));
    });
});

// Add/Update job
app.post('/api/jobs', authenticate, (req, res) => {
    const newJob = req.body;

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        let jobs = [];
        if (!err && data) {
            jobs = JSON.parse(data);
        }

        if (newJob.id) {
            // Update existing
            const index = jobs.findIndex(j => j.id === newJob.id);
            if (index !== -1) {
                jobs[index] = newJob;
            } else {
                jobs.unshift(newJob);
            }
        } else {
            // Add new
            newJob.id = Date.now().toString();
            jobs.unshift(newJob);
        }

        fs.writeFile(DATA_FILE, JSON.stringify(jobs, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save data' });
            res.json(newJob);
        });
    });
});

// Delete job
app.delete('/api/jobs/:id', authenticate, (req, res) => {
    const id = req.params.id;
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read data' });

        let jobs = JSON.parse(data);
        jobs = jobs.filter(j => j.id !== id);

        fs.writeFile(DATA_FILE, JSON.stringify(jobs, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save data' });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin/index.html`);
});
