import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

// Basic health check route for Render
app.get('/', (req, res) => res.send('WebSocket Bridge Online'));

// Handle incoming WebSocket tunnels from the Realand Machine
wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`\n⚡ [BIOMETRIC DEVICE CONNECTED] Source IP: ${ip}`);

  // Send initial authentication handshake string expected by Realand firmware
  const initHandshake = "OK\r\nResult=1\r\nCommandId=1\r\nCommand=SelectLog\r\nType=1";
  ws.send(initHandshake);
  console.log("Sent initialization handshake to device.");

  ws.on('message', async (data) => {
    const rawPayload = data.toString().trim();
    console.log(`\n📥 [DATA INBOUND] Received raw text payload:\n${rawPayload}`);

    // If it's an empty ping or heartbeat check-in
    if (!rawPayload || (rawPayload.includes('Command=') && !rawPayload.includes('UserCode'))) {
      console.log("Processing heartbeat sync event.");
      return ws.send("Return=1\r\nOK");
    }

    // Parse values from Realand parameter string format
    try {
      const params = Object.fromEntries(new URLSearchParams(rawPayload.replace(/\r\n|\n|\r/g, '&')));
      console.log('Parsed Hardware Key/Values:', JSON.stringify(params));

      const userId = params.UserCode || params.ID || params.UserID || "0";
      const timestamp = params.LogTime || params.Time || new Date().toISOString();
      const deviceSN = params.SN || "UC6920230713087";

      const payloadToSupabase = [{
        UserID: userId.toString(),
        TimeString: new Date(timestamp).toISOString(),
        DeviceSN: deviceSN
      }];

      console.log('Forwarding synchronized transaction payload to Supabase...');

      const response = await fetch(SUPABASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSupabase)
      });

      console.log(`Supabase Database Sync Status Code: ${response.status}`);

      // Respond back to the device over WebSocket to confirm storage receipt
      ws.send("Return=1\r\nOK");
      console.log("Sent success confirmation back to machine screen.");

    } catch (err) {
      console.error('Error handling transaction parse:', err.message);
    }
  });

  ws.on('close', () => console.log('❌ Biometric Device Connection Closed.'));
  ws.on('error', (err) => console.error('WebSocket Error:', err.message));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket Cloud Engine listening on port ${PORT}`);
});