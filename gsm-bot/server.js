const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let ultimoQR = "";

async function connectToWhatsApp() {
    // Seguridad: Asegurar que la carpeta existe para evitar el error 'undefined'
    const authFolder = 'auth_info_baileys';
    if (!fs.existsSync(authFolder)){
        fs.mkdirSync(authFolder);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, console),
        },
        printQRInTerminal: false,
        browser: ["GSM-Bot", "Chrome", "1.0"]
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) ultimoQR = qr;
        if (connection === 'close') {
            console.log('🔄 Conexión cerrada, reconectando...');
            setTimeout(connectToWhatsApp, 5000);
        } else if (connection === 'open') {
            ultimoQR = "CONECTADO";
            console.log('✅ ¡CONECTADO!');
        }
    });
}

app.get('/', (req, res) => {
    if (ultimoQR === "CONECTADO") return res.send("<h1>✅ BOT CONECTADO</h1>");
    if (!ultimoQR) return res.send("<h1>⏳ Iniciando... Si esto no cambia en 10s, revisá los Logs en Render.</h1>");
    
    res.send(`
        <div style="text-align:center; margin-top:50px;">
            <h2>📱 Escaneá este QR</h2>
            <img src="https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(ultimoQR)}&choe=UTF-8" />
            <script>setTimeout(() => location.reload(), 10000);</script>
        </div>
    `);
});

app.post('/enviar-alerta', async (req, res) => {
    const { numero, mensaje } = req.body;
    try {
        await sock.sendMessage(`${numero}@s.whatsapp.net`, { text: mensaje });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Bot no listo" }); }
});

app.listen(process.env.PORT || 3000, () => connectToWhatsApp());
