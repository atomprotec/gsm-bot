const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal'); // Asegurate de tener esta línea

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // Ya no usamos esto
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // AQUÍ ES DONDE APARECE EL QR
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Conectado a WhatsApp correctamente!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();

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
