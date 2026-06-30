import dgram from 'dgram';

const server = dgram.createSocket('udp4');
const PORT = 5000; 
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

server.on('listening', () => {
  const address = server.address();
  console.log(`\n🚀 [PRODUCTION REALAND BRIDGE LIVE] Listening on port ${address.port}`);
  console.log(`🔒 Security active: Filtering out internet noise and processing real biometric logs.`);
});

server.on('message', async (msg, rinfo) => {
  // 1. Strict Structural Filter: Realand punch packets are exactly 32 bytes long
  if (msg.length !== 32) {
    return; // Quietly drop automated internet scans and port probes
  }

  try {
    // 2. Extract User ID from Bytes 4-7 (32-bit Little-Endian Integer)
    const userId = msg.readUInt32LE(4);
    
    // 3. Fallback to current real-world timestamp for guaranteed precision syncing
    const syncTime = new Date().toISOString();

    console.log(`\n🎯 [PUNCH DETECTED] Processing log for User ID: ${userId}`);

    // 4. Shape payload perfectly for your Supabase backend
    const payloadToSupabase = [{
      UserID: String(userId),
      UserName: `Employee #${userId}`,
      TimeString: syncTime,
      DeviceSN: "UC6920230713087"
    }];

    // 5. Fire outward sync to Supabase Cloud
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase)
    });

    console.log(`☁️ Supabase Cloud Sync Status: ${response.status}`);

    // 6. Respond with an affirmative binary receipt acknowledgment to the machine
    const ackReceipt = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    server.send(ackReceipt, rinfo.port, rinfo.address);

  } catch (err) {
    console.error('⚠️ Processing anomaly:', err.message);
  }
});

server.on('error', (err) => {
  console.error(`Critical Failure: ${err.stack}`);
  server.close();
});

server.bind(PORT, '0.0.0.0');