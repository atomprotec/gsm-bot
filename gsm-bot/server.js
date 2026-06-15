const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let ultimoQR = ""; // Guardamos el QR acá para mostrarlo en la web

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // APAGAMOS la terminal para que Render no explote
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            ultimoQR = qr; // Guardamos el código para la página
            console.log("⭐ ¡Nuevo código QR generado! Miralo en la web.");
        }
        if (connection === 'close') {
            console.log('🔄 Conexión cerrada, reinstanciando...');
            connectToWhatsApp();
        } else if (connection === 'open') {
            ultimoQR = "CONECTADO";
            console.log('✅ ¡GSM BOT CONECTADO A WHATSAPP DE FORMA EXITOSA!');
        }
    });
}

// RUTA PARA VER EL QR DESDE EL NAVEGADOR
app.get('/', (req, res) => {
    if (ultimoQR === "CONECTADO") {
        res.send("<h1>✅ El Bot de GSM ya está conectado y activo.</h1>");
    } else if (ultimoQR) {
        // Te genera una página web con un generador de QR directo para escanear con el celu
        res.send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
                <h2>📱 Escaneá este QR con el WhatsApp de la Empresa</h2>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ultimoQR)}" />
                <p>Al escanearlo, el sistema quedará automatizado.</p>
            </div>
        `);
    } else {
        res.send("<h1>⏳ Iniciando el bot, recargá en 5 segundos...</h1>");
    }
});

// RUTA QUE LLAMA TU APP.JS PARA ENVIAR MENSAJES
app.post('/enviar-alerta', async (req, res) => {
    const { numero, mensaje } = req.body;
    try {
        if (!sock) return res.status(500).json({ error: "Bot no listo" });
        const idJid = `${numero}@s.whatsapp.net`;
        await sock.sendMessage(idJid, { text: mensaje });
        res.json({ success: true, status: "Mensaje enviado por la empresa" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Bot GSM corriendo en puerto ${PORT}`);
    connectToWhatsApp();
});