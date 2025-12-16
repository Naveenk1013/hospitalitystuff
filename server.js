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

// ==========================================
// Pages API (CMS)
// ==========================================
const PAGES_FILE = path.join(__dirname, 'assets', 'data', 'pages.json');

// Get all pages
app.get('/api/pages', (req, res) => {
    fs.readFile(PAGES_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return res.json([]);
            return res.status(500).json({ error: 'Failed to read pages data' });
        }
        res.json(JSON.parse(data));
    });
});

// Get single page by ID
app.get('/api/pages/:id', (req, res) => {
    const id = req.params.id;
    fs.readFile(PAGES_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read pages data' });
        const pages = JSON.parse(data);
        const page = pages.find(p => p.id === id);
        if (page) {
            res.json(page);
        } else {
            res.status(404).json({ error: 'Page not found' });
        }
    });
});

// Create or Update Page
app.post('/api/pages', authenticate, (req, res) => {
    const newPage = req.body;

    fs.readFile(PAGES_FILE, 'utf8', (err, data) => {
        let pages = [];
        if (!err && data) {
            pages = JSON.parse(data);
        }

        if (newPage.id) {
            // Update
            const index = pages.findIndex(p => p.id === newPage.id);
            if (index !== -1) {
                pages[index] = { ...pages[index], ...newPage, lastUpdated: new Date().toISOString().split('T')[0] };
            } else {
                return res.status(404).json({ error: 'Page ID not found to update' });
            }
        } else {
            // Create
            newPage.id = Date.now().toString();
            newPage.lastUpdated = new Date().toISOString().split('T')[0];
            if (!newPage.slug) {
                newPage.slug = newPage.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            pages.unshift(newPage);
        }

        fs.writeFile(PAGES_FILE, JSON.stringify(pages, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save page' });
            res.json(newPage);
        });
    });
});

// Delete Page
app.delete('/api/pages/:id', authenticate, (req, res) => {
    const id = req.params.id;
    fs.readFile(PAGES_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read data' });

        let pages = JSON.parse(data);
        const initialLength = pages.length;
        pages = pages.filter(p => p.id !== id);

        if (pages.length === initialLength) {
            return res.status(404).json({ error: 'Page not found' });
        }

        fs.writeFile(PAGES_FILE, JSON.stringify(pages, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save data' });
            res.json({ success: true });
        });
    });
});
