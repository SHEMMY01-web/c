import dgram from 'dgram';

const server = dgram.createSocket('udp4');
const PORT = 5000; 
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

server.on('listening', () => {
  const address = server.address();
  console.log(`\n🚀 [SECURE UDP ENGINE LIVE] Listening on ${address.address}:${address.port}`);
  console.log(`👉 Noise filter active. Waiting exclusively for your Realand machine...`);
});

server.on('message', async (msg, rinfo) => {
  const rawPayload = msg.toString().replace(/\0/g, '').trim();
  
  // 1. INTERNET NOISE FILTER: Discard packets that look like junk data, HTTP requests, or random port scans
  if (rawPayload.startsWith('GET ') || rawPayload.startsWith('POST ') || rawPayload.length < 4) {
    return; // Silently drop public internet scanners
  }

  // 2. Separate handshakes from real punches
  if (rawPayload.includes('Command=') && !rawPayload.includes('UserCode')) {
    console.log(`🤖 [MACHINE HANDSHAKE] Device alive signal received from tunnel proxy.`);
    const ack = Buffer.from("Return=1\r\nOK");
    server.send(ack, rinfo.port, rinfo.address);
    return;
  }

  // 3. Only look for packets that actually contain biometric device markers
  const isRealDevice = rawPayload.includes('UserCode') || rawPayload.includes('SN=') || rawPayload.includes('LogNo=');
  
  if (!isRealDevice) {
    // If it's the garbled/binary packet, let's look at it just in case it's a binary punch variant
    if (msg.length > 10 && (rawPayload.includes('') || rawPayload.includes('\\'))) {
      console.log(`\n📦 [POTENTIAL BINARY PUNCH] ${msg.length} bytes received.`);
      console.log(`Raw Hex: [ ${msg.toString('hex').toUpperCase().match(/.{1,2}/g)?.join(' ') } ]`);
    }
    return; // Drop anything else that doesn't look like our biometric machine
  }

  // 4. Valid Biometric String Packet Process
  console.log(`\n🎯 [VALID PUNCH INTERCEPTED] Processing real device payload...`);
  
  try {
    const queryCompatible = rawPayload.replace(/\r\n|\n|\r/g, '&');
    const params = Object.fromEntries(new URLSearchParams(queryCompatible));

    const userId = params.UserCode || params.ID || "Unknown ID";
    const personName = params.Name || "Employee";
    const deviceTime = params.Time || new Date().toISOString();
    const deviceSN = params.SN || "UC6920230713087";

    console.log(`👤 Verified Log: ${personName} (ID: ${userId}) at ${deviceTime}`);

    const payloadToSupabase = [{
      UserID: userId.trim(),
      UserName: personName.trim(),
      TimeString: deviceTime,
      DeviceSN: deviceSN.trim()
    }];

    // Forward clean data to Cloud
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase)
    });

    console.log(`☁️ Supabase Cloud Sync: ${response.status}`);

    // Confirm back to device
    const successReply = Buffer.from("Return=1\r\nOK");
    server.send(successReply, rinfo.port, rinfo.address);

  } catch (err) {
    console.error('⚠️ Processing glitch:', err.message);
  }
});

server.on('error', (err) => {
  console.error(`Critical Failure: ${err.stack}`);
  server.close();
});

server.bind(PORT, '0.0.0.0');