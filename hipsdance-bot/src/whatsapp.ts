import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// Initialize the WhatsApp Client
// Using LocalAuth to persist the session so it doesn't require scanning QR code every time
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate and display QR code in terminal
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code generated. Scan it with your WhatsApp mobile app.');
});

// Client is ready
client.on('ready', () => {
    console.log('¡Cliente listo! El bot de WhatsApp se ha conectado exitosamente.');
});

export { client };
