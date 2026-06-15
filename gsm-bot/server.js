const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let ultimoQR = ""; 

async function connectToWhatsApp() {
    // Si da error de disco, intentamos conectar sin persistencia de estado para que no falle al arrancar
    sock = makeWASocket({
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            ultimoQR = qr;
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 5000); // Reintento automático
            }
        } else if (connection === 'open') {
            ultimoQR = "CONECTADO";
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
