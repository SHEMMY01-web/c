import dgram from 'dgram';

const server = dgram.createSocket('udp4');
const PORT = 5000; 
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

server.on('listening', () => {
  const address = server.address();
  console.log(`\n🚀 [BINARY UDP ENGINE LIVE] Listening on ${address.address}:${address.port}`);
  console.log(`👉 Punch on the device to inspect the raw binary structure...`);
});

server.on('message', async (msg, rinfo) => {
  // 1. Convert the raw buffer directly into a Hexadecimal string for inspection
  const hexPayload = msg.toString('hex').toUpperCase();
  const hexGroups = hexPayload.match(/.{1,2}/g)?.join(' ') || hexPayload;
  
  console.log(`\n📥 [PACKET INTERCEPTED] From IP: ${rinfo.address}`);
  console.log(`📦 Raw Hex Bytes (${msg.length} bytes): [ ${hexGroups} ]`);

  try {
    // Temporary extraction logic based on common biometric binary standards:
    // (We will lock this down perfectly once we see your exact hex output!)
    let userId = "1";
    let deviceTime = new Date().toISOString();

    // If packet is small, it might just be a heartbeat or handshake
    if (msg.length < 10) {
      console.log("Short packet detected (likely handshake/heartbeat).");
      const ack = Buffer.from([0x01, 0x00, 0x00, 0x00]); // Standard binary ACK
      server.send(ack, rinfo.port, rinfo.address);
      return;
    }

    // For now, let's keep sending a baseline payload to keep your Supabase endpoint happy
    const payloadToSupabase = [{
      UserID: userId,
      UserName: "Decoding Binary...",
      TimeString: deviceTime,
      DeviceSN: "UC6920230713087"
    }];

    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase)
    });

    console.log(`Cloud Sync: ${response.status}`);

    // Send a standard 2-byte or 4-byte success reply to see if the device accepts it
    const successReply = Buffer.from([0x4F, 0x4B]); // "OK" in hex
    server.send(successReply, rinfo.port, rinfo.address);

  } catch (err) {
    console.error('Processing error:', err.message);
  }
});

server.on('error', (err) => {
  console.error(`Critical Error: ${err.stack}`);
  server.close();
});

server.bind(PORT, '0.0.0.0');