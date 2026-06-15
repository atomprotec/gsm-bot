const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express'); // NUEVO
const app = express(); // NUEVO

// NUEVO: Servidor Express para mantener vivo el bot en Render
app.get('/', (req, res) => res.send('Bot GSM Activo'));
app.listen(process.env.PORT || 3000, () => console.log('Servidor web iniciado'));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // Lo ponemos en true para obtener el QR al subirlo
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
