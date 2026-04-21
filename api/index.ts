import { readFileSync } from 'fs';
import { join } from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we only handle the root path
  if (req.url !== '/' && req.url !== '/index.html') {
    return res.status(404).send('Not Found');
  }

  try {
    // Read the index.html from the root of the project
    // On Vercel, the files are in the root of the deployment
    const filePath = join(process.cwd(), 'index.html');
    const html = readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Internal Server Error');
  }
}
