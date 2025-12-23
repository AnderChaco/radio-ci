// ICY Metadata Parser - Uses local metadata server
export class IcyMetadataParser {
  static async fetchStreamMetadata(url) {
    try {
      console.log('Fetching metadata from server...');
      
      // Call local metadata server
      const response = await fetch('http://192.168.0.19:3000/metadata');
      const metadata = await response.json();

      console.log('Metadata received:', metadata);

      return metadata;

    } catch (error) {
      console.log('Error fetching metadata:', error.message || error);
      // Fallback to stream headers if server is not available
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'Icy-MetaData': '1',
          },
        });

        return {
          station: response.headers.get('icy-name'),
          genre: response.headers.get('icy-genre'),
          bitrate: response.headers.get('icy-br'),
          title: null,
          artist: null,
        };
      } catch (e) {
        return null;
      }
    }
  }
}
