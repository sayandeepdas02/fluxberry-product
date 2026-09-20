export interface ScanResult {
  clean: boolean;
  signature?: string;
}

export interface AvScanProvider {
  readonly name: string;
  scan(buffer: Buffer): Promise<ScanResult>;
}
