import dgram from 'dgram';

const server = dgram.createSocket('udp4');
const PORT = 5000; 
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

server.on('listening', () => {
  const address = server.address();
  console.log(`\n🚀 [LOCAL UDP ENGINE LIVE] Listening on ${address.address}:${address.port}`);
  console.log(`👉 Waiting for your Realand A-L355 machine to send punches over Wi-Fi...`);
});

server.on('message', async (msg, rinfo) => {
  // Clean up any potential null bytes or extreme whitespace typical of low-level hardware streams
  const rawPayload = msg.toString().replace(/\0/g, '').trim();
  
  console.log(`\n📥 [PACKET INTERCEPTED] From Device IP: ${rinfo.address} on Port: ${rinfo.port}`);
  console.log(`Raw Content: "${rawPayload}"`);

  // Handle initialization handshake strings or standard heartbeats
  if (!rawPayload || (rawPayload.includes('Command=') && !rawPayload.includes('UserCode'))) {
    console.log("Device heartbeat handshake detected. Sending acknowledgment...");
    const ack = Buffer.from("Return=1\r\nOK");
    server.send(ack, rinfo.port, rinfo.address);
    return;
  }

  try {
    // Standardize all line variations into uniform search query strings
    const queryCompatible = rawPayload.replace(/\r\n|\n|\r/g, '&');
    const params = Object.fromEntries(new URLSearchParams(queryCompatible));
    
    console.log('Parsed Fields:', JSON.stringify(params));

    // Fallback assignment with clean parameter isolation
    const userId = params.UserCode || params.ID || params.UserID || "1";
    const deviceSN = params.SN || "UC6920230713087"; 
    
    // Attempt to grab the person's name from common biometric data tags
    const personName = params.Name || params.UserName || params.NickName || "Unknown Employee";
    
    // Fallback to Server Time ONLY if the machine fails to send its internal log timestamp
    const deviceTime = params.Time || params.DateTime || params.LogTime || new Date().toISOString();

    // Console Logging for local visibility
    console.log(`👤 Punch Logged: ${personName.trim()} (ID: ${userId.trim()})`);

    const payloadToSupabase = [{
      UserID: userId.toString().trim(),
      UserName: personName.toString().trim(), // Added to database payload
      TimeString: deviceTime,
      DeviceSN: deviceSN.trim()
    }];

    console.log('Forwarding logs straight out to Supabase Cloud...');

    // Asynchronous network delivery with error handling insulation
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase)
    });

    console.log(`Supabase Sync Status Code: ${response.status}`);

    // Critical: Tell the device we recorded it so it clears its internal flash memory pool
    const successReply = Buffer.from("Return=1\r\nOK");
    server.send(successReply, rinfo.port, rinfo.address, (err) => {
      if (err) console.error(`Failed to send UDP ACK back to device:`, err);
      else console.log("Sent confirmation receipt back to biometric machine screen.");
    });

  } catch (err) {
    console.error('Failed to process packet stream:', err.message);
  }
});

server.on('error', (err) => {
  console.error(`Local Engine Critical Error:\n${err.stack}`);
  server.close();
});

// Explicitly bind to '0.0.0.0' to accept messages routed via Wi-Fi from external IP nodes
server.bind(PORT, '0.0.0.0');