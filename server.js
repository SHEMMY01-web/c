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
  const rawPayload = msg.toString().trim();
  console.log(`\n📥 [PACKET INTERCEPTED] From Device IP: ${rinfo.address} on Port: ${rinfo.port}`);
  console.log(`Raw Content: "${rawPayload}"`);

  // Handle initialization handshake strings if the hardware requests it
  if (!rawPayload || (rawPayload.includes('Command=') && !rawPayload.includes('UserCode'))) {
    console.log("Device heartbeat handshake detected. Sending acknowledgment...");
    const ack = Buffer.from("Return=1\r\nOK");
    server.send(ack, rinfo.port, rinfo.address);
    return;
  }

  // Parse and sync data out to Supabase
  try {
    const queryCompatible = rawPayload.replace(/\r\n|\n|\r/g, '&');
    const params = Object.fromEntries(new URLSearchParams(queryCompatible));
    
    console.log('Parsed Fields:', JSON.stringify(params));

    const userId = params.UserCode || params.ID || params.UserID || "1";
    const deviceSN = params.SN || "UC6920230713087"; // Enforcing your serial verified from the photo

    const payloadToSupabase = [{
      UserID: userId.toString(),
      TimeString: new Date().toISOString(),
      DeviceSN: deviceSN
    }];

    console.log('Forwarding logs straight out to Supabase Cloud...');

    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase)
    });

    console.log(`Supabase Sync Status Code: ${response.status}`);

    // Confirm receipt back to the machine so it doesn't clear its buffer or keep re-sending
    const successReply = Buffer.from("Return=1\r\nOK");
    server.send(successReply, rinfo.port, rinfo.address);
    console.log("Sent confirmation receipt back to biometric machine screen.");

  } catch (err) {
    console.error('Failed to process packet stream:', err.message);
  }
});

server.on('error', (err) => {
  console.error(`Local Engine Error:\n${err.stack}`);
  server.close();
});

server.bind(PORT, '0.0.0.0');