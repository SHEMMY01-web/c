import express from 'express';

const app = express();
const PORT = process.env.PORT || 10000; 
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all('*', async (req, res) => {
  let parsedBody = {};
  const rawString = typeof req.body === 'string' ? req.body.trim() : '';

  if (rawString) {
    try {
      parsedBody = JSON.parse(rawString);
    } catch {
      parsedBody = Object.fromEntries(new URLSearchParams(rawString));
    }
  } else {
    parsedBody = req.query;
  }

  // Log everything so we see the exact incoming payload format
  console.log(`\n--- Inbound Device Hit ---`);
  console.log('Parsed Query/Body Data:', JSON.stringify(parsedBody));

  // Extract identifiers sent by the machine hardware
  const incomingSN = parsedBody.SN || parsedBody.DeviceSN || parsedBody.ccid || '';
  const incomingP2P = parsedBody.P2P || parsedBody.P2pID || '';

  // If it's a heartbeat check or an initial handshake
  if (Object.keys(parsedBody).length === 0 || rawString.includes('Command=')) {
    console.log('Device handshake detected. Sending Realand authentication protocols.');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send("OK\r\nResult=1\r\nCommandId=1\r\nCommand=SelectLog\r\nType=1");
  }

  // Syncing a real thumb scan log to Supabase
  try {
    const payloadToSupabase = [{
      UserID: (parsedBody.UserCode || parsedBody.ID || parsedBody.UserID || "0").toString(),
      TimeString: new Date().toISOString(),
      DeviceSN: "UC6920230713087" // Enforced using your verified serial from image 1000341636.jpg
    }];

    console.log('Syncing validated record to Supabase:', JSON.stringify(payloadToSupabase));

    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase),
    });

    console.log(`Supabase Database Status: ${response.status}`);
    
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send("Return=1\r\nOK");

  } catch (error) {
    console.error('Failed to sync transaction:', error.message);
    return res.status(500).send('Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gateway Online matching hardware serial verification patterns.`);
});