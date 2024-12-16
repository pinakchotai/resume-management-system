import app from '../server.js';

export default async function handler(req, res) {
    // Forward the request to Express
    await app(req, res);
} 