import type { AvScanProvider, ScanResult } from './types';

const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

export class MockAvScanProvider implements AvScanProvider {
  readonly name = 'mock';

  async scan(buffer: Buffer): Promise<ScanResult> {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 256));
    if (content.includes(EICAR_SIGNATURE)) {
      return { clean: false, signature: 'Win.Test.EICAR_HDB-1' };
    }
    return { clean: true };
  }
}
