const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('/opt/render/project/src/node_modules/express');
const app = express();

// Usamos el puerto que asigne Render o el 3000 por defecto
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot GSM Activo'));
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor iniciado en puerto ${PORT}`));

// Definimos el número del admin usando la variable de entorno
const ADMIN_NUMBER = process.env.ADMIN_NUMBER; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
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

    // FUNCIÓN PARA AVISAR AL ADMIN (la vas a llamar cuando recibas el formulario)
    async function avisarAdmin(mensaje) {
        if (ADMIN_NUMBER) {
            await sock.sendMessage(ADMIN_NUMBER + '@s.whatsapp.net', { text: mensaje });
        }
    }
}

startBot();
