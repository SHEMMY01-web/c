import express from 'express';

const app = express();
const PORT = process.env.PORT || 10000; 
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

// Capture raw body text strings sent by the device hardware
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. SECURITY & TARGET LOGGING
app.use((req, res, next) => {
  const callerIP = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
  console.log(`\n--- [SECURITY CHECK] ---`);
  console.log(`Path: ${req.url} | Method: ${req.method}`);
  console.log(`Source IP: ${callerIP} | Agent: ${req.headers['user-agent']}`);
  next();
});

// 2. CATCH-ALL ROUTE FOR THE DEVICE HANDSHAKE AND DATA PUSH
app.all('*', async (req, res) => {
  let parsedBody = {};
  const rawString = typeof req.body === 'string' ? req.body.trim() : '';

  if (rawString) {
    console.log('Raw Payload Received:', rawString);
    try {
      parsedBody = JSON.parse(rawString);
    } catch {
      parsedBody = Object.fromEntries(new URLSearchParams(rawString));
    }
  } else {
    // Fallback to query params if no body content
    parsedBody = req.query;
  }

  console.log('Parsed Dataset:', JSON.stringify(parsedBody));

  // If payload dataset is empty, process it as a Keep-Alive Handshake
  if (Object.keys(parsedBody).length === 0) {
    console.log('Sending Realand heartbeat authorization sequence.');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send("OK\r\nResult=1\r\nCommandId=1\r\nCommand=SelectLog\r\nType=1");
  }

  // If actual fingerprint punch logs are present, bundle them up for Supabase
  try {
    const items = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
    const normalizedData = items.map(item => {
      const safeItem = item || {};
      const rawTime = safeItem.TimeString || safeItem.timestamp || safeItem.time || safeItem.LogTime || safeItem.date || Date.now();
      const dateObj = new Date(rawTime);

      return {
        UserID: (safeItem.UserID || safeItem.user_id || safeItem.u_id || safeItem.uid || safeItem.UserId || safeItem.id || "0").toString(),
        TimeString: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString(), 
        DeviceSN: safeItem.DeviceSN || safeItem.sn || safeItem.device_sn || safeItem.ccid || "A-L355-Device"
      };
    });

    console.log('--- FORWARDING ACTIVE TRANSACTION TO SUPABASE ---', JSON.stringify(normalizedData));

    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedData),
    });

    console.log(`Supabase Sync Status Code: ${response.status}`);
    
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send("Return=1\r\nOK");

  } catch (error) {
    console.error('Data Processing Exception:', error.message);
    return res.status(500).send('Proxy Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP Cloud Gateway active on port ${PORT}`);
});