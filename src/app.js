import express from 'express';
const app = express();
const PORT = 3021;

// Basic route to verify the server works
app.get('/', (req, res) => {
    res.send('TuckMate Backend is Running! 🚀');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});