// The BarcodeDetector API is not yet part of TypeScript's DOM lib.
// https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector: typeof BarcodeDetector;
}
