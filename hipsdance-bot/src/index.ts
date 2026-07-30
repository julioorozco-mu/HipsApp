import express, { Request, Response } from 'express';
import cors from 'cors';
import { client } from './whatsapp';

const app = express();

app.use(cors());
app.use(express.json());

// Ping endpoint to keep Render awake
app.get('/ping', (req: Request, res: Response) => {
    res.status(200).send('pong');
});

// Send message endpoint
app.post('/api/send-message', async (req: Request, res: Response): Promise<void> => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        res.status(400).json({ success: false, error: 'Phone and message are required' });
        return;
    }

    try {
        // Format phone number to include the @c.us suffix
        const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        
        // Send the message
        await client.sendMessage(formattedPhone, message);
        
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

const PORT = process.env.PORT || 3002;

// Initialize WhatsApp client
client.initialize();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
