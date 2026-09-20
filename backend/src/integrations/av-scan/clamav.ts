import net from 'node:net';
import { config } from '../../config/env';
import type { AvScanProvider, ScanResult } from './types';

/**
 * Streams a buffer to clamd using the INSTREAM protocol:
 *   send chunk-length (4-byte big-endian) + chunk, then a zero-length chunk
 *   to signal end; clamd responds with "stream: OK\0" or "stream: <sig> FOUND\0".
 */
export class ClamAvProvider implements AvScanProvider {
  readonly name = 'clamav';

  async scan(buffer: Buffer): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(
        { host: config.providers.avScan.host, port: config.providers.avScan.port },
        () => {
          socket.write('zINSTREAM\0');

          const CHUNK_SIZE = 8192;
          for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
            const chunk = buffer.subarray(i, Math.min(i + CHUNK_SIZE, buffer.length));
            const header = Buffer.alloc(4);
            header.writeUInt32BE(chunk.length, 0);
            socket.write(header);
            socket.write(chunk);
          }

          // Zero-length chunk signals end of stream.
          const end = Buffer.alloc(4);
          end.writeUInt32BE(0, 0);
          socket.write(end);
        },
      );

      socket.setTimeout(30_000);

      const chunks: Buffer[] = [];
      socket.on('data', (data) => chunks.push(data));

      socket.on('end', () => {
        const reply = Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim();
        if (reply.endsWith('OK')) {
          resolve({ clean: true });
        } else {
          const match = reply.match(/stream:\s*(.+)\s+FOUND/i);
          resolve({ clean: false, signature: match?.[1] ?? reply });
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('clamd scan timed out'));
      });

      socket.on('error', (err) => reject(err));
    });
  }
}
