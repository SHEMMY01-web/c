import dgram from 'dgram';

const server = dgram.createSocket('udp4');
const PORT = 5000; 

server.on('listening', () => {
  console.log(`\n🚀 [BINARY DECODER LIVE] Listening on port ${PORT}...`);
  console.log(`👉 Go scan your finger ONCE to break down the structure.`);
});

server.on('message', (msg, rinfo) => {
  if (msg.length !== 32) return; // Only look at our structural punch packet

  const hexGroups = msg.toString('hex').toUpperCase().match(/.{1,2}/g) || [];
  
  console.log(`\n🎯 [PUNCH DETECTED] Packet Size: 32 bytes.`);
  console.log(`Raw: [ ${hexGroups.join(' ')} ]`);
  console.log(`--------------------------------------------------`);
  console.log(`Let's unpack the numeric possibilities:`);

  // Extract common offsets as numbers
  const dword0_LE = msg.readUInt32LE(0);
  const dword0_BE = msg.readUInt32BE(0);
  
  const word4_LE  = msg.readUInt16LE(4);
  const dword4_LE = msg.readUInt32LE(4);
  
  const dword8_LE = msg.readUInt32LE(8);
  
  const dword16_LE = msg.readUInt32LE(16);
  const word20_LE  = msg.readUInt16LE(20);
  const word22_LE  = msg.readUInt16LE(22);

  console.log(`• Bytes 0-3   (Hex: ${hexGroups.slice(0,4).join('')}) -> As Number: ${dword0_LE} (LE) or ${dword0_BE} (BE)`);
  console.log(`• Bytes 4-5   (Hex: ${hexGroups.slice(4,6).join('')}) -> As Number: ${word4_LE}`);
  console.log(`• Bytes 4-7   (Hex: ${hexGroups.slice(4,8).join('')}) -> As Number: ${dword4_LE}`);
  console.log(`• Bytes 8-11  (Hex: ${hexGroups.slice(8,12).join('')}) -> As Number: ${dword8_LE}`);
  console.log(`• Bytes 16-19 (Hex: ${hexGroups.slice(16,20).join('')}) -> As Number: ${dword16_LE}`);
  console.log(`• Bytes 20-21 (Hex: ${hexGroups.slice(20,22).join('')}) -> As Number: ${word20_LE}`);
  console.log(`• Bytes 22-23 (Hex: ${hexGroups.slice(22,24).join('')}) -> As Number: ${word22_LE}`);
  
  console.log(`\n💡 To help me map this instantly, what is the exact ID number of the user registered on the machine you just scanned?`);
  console.log(`--------------------------------------------------`);
});

server.bind(PORT, '0.0.0.0');