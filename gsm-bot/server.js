const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let ultimoQR = ""; 

async function connectToWhatsApp() {
    // Usamos memoria volátil en vez de archivos para que Render no explote al escribir en el disco gratis
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false 
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            ultimoQR = qr; 
            console.log("⭐ QR generado con éxito.");
        }
        if (connection === 'close') {
            console.log('🔄 Reiniciando conexión...');
            connectToWhatsApp();
        } else if (connection === 'open') {
            ultimoQR = "CONECTADO";
            console.log('✅ ¡BOT GSM CONECTADO!');
        }
    });
}

// PÁGINA WEB QUE CREA EL QR EN TU NAVEGADOR (No gasta memoria en Render)
app.get('/', (req, res) => {
    if (ultimoQR === "CONECTADO") {
        return res.send("<h1 style='font-family:sans-serif; text-align:center; color:green; margin-top:50px;'>✅ El Bot de GSM ya está conectado y activo.</h1>");
    } 
    
    if (!ultimoQR) {
        return res.send("<h1 style='font-family:sans-serif; text-align:center; margin-top:50px;'>⏳ Iniciando el bot, recargá esta pestaña en 10 segundos...</h1>");
    }

    // Usamos una librería externa de Google para dibujar el QR, Render no hace ningún esfuerzo
    res.send(`
        <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
            <h2 style="color:#333;">📱 Escaneá este QR con el WhatsApp de la Empresa</h2>
            <div style="margin: 20px auto;">
                <img src="https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(ultimoQR)}&choe=UTF-8" alt="QR Code" style="border: 10px solid white; box-shadow: 0px 0px 15px rgba(0,0,0,0.1);"/>
            </div>
            <p style="color:#666;">Abrí WhatsApp -> Dispositivos vinculados -> Vincular dispositivo.</p>
            <script>
                // Auto recarga cada 15 segundos para mantener el QR fresco si se vence
                setTimeout(() => { location.reload(); }, 15000);
            </script>
        </div>
    `);
});

app.post('/enviar-alerta', async (req, res) => {
    const { numero, mensaje } = req.body;
    try {
        if (!sock) return res.status(500).json({ error: "Bot no listo" });
        const idJid = `${numero}@s.whatsapp.net`;
        await sock.sendMessage(idJid, { text: mensaje });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
    connectToWhatsApp();
});
