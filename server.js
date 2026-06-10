import dgram from 'dgram';

const UDP_PORT = process.env.PORT || 8000; // Render sets the PORT env dynamically
const SUPABASE_URL = 'https://kkltrgjszsuozlrnjrnb.supabase.co/functions/v1/attendance-log';

const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.error(`UDP Server Error:\n${err.stack}`);
  server.close();
});

server.on('message', async (msg, rinfo) => {
  console.log(`\n--- [PACKET INBOUND] From ${rinfo.address}:${rinfo.port} ---`);
  
  // 1. Convert payload to strings and logs for debugging
  const hexData = msg.toString('hex');
  const textData = msg.toString('utf8').trim();
  
  console.log(`Raw Hex Buffer: ${hexData}`);
  console.log(`Raw Text Content: ${textData}`);

  try {
    let userId = "0";
    let timestamp = new Date().toISOString();
    let deviceSn = "A-L355-Device";

    // 2. Parse the payload data
    if (textData.includes('UserCode=') || textData.includes('ID=')) {
      // If it sends plain text data strings
      const params = new URLSearchParams(textData.replace(/\r\n|\n|\r/g, '&'));
      userId = params.get('UserCode') || params.get('ID') || params.get('UserID') || "0";
      deviceSn = params.get('SN') || params.get('DeviceSN') || deviceSn;
    } else if (msg.length >= 8) {
      // Fallback: If it sends raw binary, parse typical biometric structures 
      // Often bytes 4-7 or similar hold the User ID number
      userId = msg.readUInt32LE ? msg.readUInt32LE(4).toString() : "1";
    }

    const payloadToSupabase = [{
      UserID: userId.toString(),
      TimeString: timestamp,
      DeviceSN: deviceSn
    }];

    console.log(`Forwarding Parsed Event to Supabase:`, JSON.stringify(payloadToSupabase));

    // 3. Post cleanly over HTTPS straight to your functional Supabase backend
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToSupabase)
    });

    console.log(`Supabase Sync Response Status: ${response.status}`);

  } catch (error) {
    console.error(`Error processing device packet:`, error.message);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`Cloud UDP Engine listening on ${address.address}:${address.port}`);
});

// Bind to all incoming network interfaces
server.bind(UDP_PORT, '0.0.0.0');