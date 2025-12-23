const express = require('express');
const http = require('http');

const app = express();
const PORT = 3000;

let currentMetadata = {
  title: null,
  artist: null,
  station: 'Christian International Online',
  genre: 'adoracion',
};

// Parse ICY metadata from stream
function parseIcyMetadata(streamUrl) {
  const url = new URL(streamUrl);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: 'GET',
    headers: {
      'Icy-MetaData': '1',
    },
  };

  const req = http.request(options, (res) => {
    const metaint = parseInt(res.headers['icy-metaint'] || '0');
    
    if (metaint === 0) {
      console.log('No metadata interval in stream');
      return;
    }

    console.log(`Metadata interval: ${metaint} bytes`);
    
    let buffer = Buffer.alloc(0);
    let bytesRead = 0;

    res.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      bytesRead += chunk.length;

      // Check if we have enough data to read metadata
      while (buffer.length >= metaint + 1) {
        // Extract audio data
        const audioData = buffer.slice(0, metaint);
        
        // Get metadata length
        const metaLengthByte = buffer[metaint];
        const metadataLength = metaLengthByte * 16;

        if (buffer.length < metaint + 1 + metadataLength) {
          // Not enough data yet
          break;
        }

        // Extract metadata
        if (metadataLength > 0) {
          const metadataBuffer = buffer.slice(metaint + 1, metaint + 1 + metadataLength);
          const metadata = metadataBuffer.toString('utf8');
          
          // Parse StreamTitle
          const titleMatch = metadata.match(/StreamTitle='([^']*)'/);
          if (titleMatch && titleMatch[1]) {
            const fullTitle = titleMatch[1].trim();
            const parts = fullTitle.split(' - ');
            
            currentMetadata = {
              title: parts.length > 1 ? parts[1].trim() : fullTitle,
              artist: parts.length > 1 ? parts[0].trim() : null,
              station: res.headers['icy-name'] || 'Christian International Online',
              genre: res.headers['icy-genre'] || 'adoracion',
              raw: fullTitle,
            };
            
            console.log('Updated metadata:', currentMetadata);
          }
        }

        // Remove processed data from buffer
        buffer = buffer.slice(metaint + 1 + metadataLength);
      }
    });

    res.on('error', (err) => {
      console.error('Stream error:', err);
      setTimeout(() => parseIcyMetadata(streamUrl), 5000);
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err);
    setTimeout(() => parseIcyMetadata(streamUrl), 5000);
  });

  req.end();
}

// Start parsing metadata
parseIcyMetadata('http://server.radiostreaming.com.ar:8308/stream.mp3');

// API endpoint
app.get('/metadata', (req, res) => {
  res.json(currentMetadata);
});

app.listen(PORT, () => {
  console.log(`Metadata server running on http://localhost:${PORT}`);
  console.log(`Access metadata at http://localhost:${PORT}/metadata`);
});
