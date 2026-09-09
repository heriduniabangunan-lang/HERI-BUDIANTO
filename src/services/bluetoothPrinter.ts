import { Transaction, StoreSettings } from "../types";

// Ambient Web Bluetooth types
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<any>;
    disconnect: () => void;
  };
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
}

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice: (options: any) => Promise<BluetoothDevice>;
    };
  }
}

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
}

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnecting: boolean = false;

  public isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  public getConnectedDevice(): BluetoothDeviceInfo | null {
    if (this.device && this.characteristic) {
      return {
        id: this.device.id,
        name: this.device.name || "Bluetooth Thermal Printer",
        connected: this.device.gatt?.connected || false,
      };
    }
    return null;
  }

  public async connect(): Promise<BluetoothDeviceInfo> {
    if (!this.isSupported()) {
      throw new Error("Web Bluetooth API tidak didukung di browser ini. Gunakan Google Chrome versi Android.");
    }

    this.isConnecting = true;
    try {
      // Standard Serial / POS Printer Services
      const printerServices = [
        "000018f0-0000-1000-8000-00805f9b34fb", // Common thermal printer service
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        0xffe0, // common BLE serial
      ];

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: printerServices,
      });

      if (!device.gatt) {
        throw new Error("GATT Server tidak tersedia pada printer.");
      }

      const server = await device.gatt.connect();

      // Find writable characteristic across available services
      let targetCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

      for (const serviceUuid of printerServices) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // Continue checking other services
        }
      }

      if (!targetCharacteristic) {
        // Try fallback to any primary service
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char;
              break;
            }
          }
          if (targetCharacteristic) break;
        }
      }

      if (!targetCharacteristic) {
        throw new Error("Karakteristik penulisan printer (write characteristic) tidak ditemukan.");
      }

      this.device = device;
      this.characteristic = targetCharacteristic;
      this.isConnecting = false;

      return {
        id: device.id,
        name: device.name || "Bluetooth Thermal Printer",
        connected: true,
      };
    } catch (err: unknown) {
      this.isConnecting = false;
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Gagal menghubungkan printer: ${message}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  // Format currency helper
  private formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Pad line for thermal print (e.g. 32 chars for 58mm, 48 chars for 80mm)
  private makeTwoColumn(left: string, right: string, width: number): string {
    const spaceCount = width - left.length - right.length;
    if (spaceCount <= 0) {
      return left.slice(0, width - right.length - 1) + " " + right;
    }
    return left + " ".repeat(spaceCount) + right;
  }

  // Generate ESC/POS byte buffer for a receipt
  public generateReceiptBytes(tx: Transaction, settings: StoreSettings): Uint8Array {
    const width = settings.paperSize === "80mm" ? 48 : 32;
    const divider = "-".repeat(width);

    const encoder = new TextEncoder();
    const parts: number[] = [];

    // Init printer
    parts.push(ESC, 0x40);

    // Center Align
    parts.push(ESC, 0x61, 0x01);

    // Double height & width for Store Name
    parts.push(ESC, 0x21, 0x30);
    parts.push(...encoder.encode(settings.storeName + "\n"));

    // Normal text size
    parts.push(ESC, 0x21, 0x00);
    parts.push(...encoder.encode(settings.tagline + "\n"));
    parts.push(...encoder.encode(settings.address + "\n"));
    parts.push(...encoder.encode("Telp: " + settings.phone + "\n"));
    parts.push(...encoder.encode(divider + "\n"));

    // Left Align for Transaction Info
    parts.push(ESC, 0x61, 0x00);
    const dateFormatted = new Date(tx.timestamp).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    parts.push(...encoder.encode(this.makeTwoColumn("No: " + tx.receiptNumber, tx.cashierName, width) + "\n"));
    parts.push(...encoder.encode(this.makeTwoColumn("Tgl: " + dateFormatted, tx.paymentMethod.toUpperCase(), width) + "\n"));
    if (tx.customerName && tx.customerName !== "Pelanggan Teras") {
      parts.push(...encoder.encode("Plg: " + tx.customerName + "\n"));
    }
    parts.push(...encoder.encode(divider + "\n"));

    // Items
    for (const item of tx.items) {
      parts.push(...encoder.encode(item.name + "\n"));
      const qtyPrice = `${item.quantity} x ${this.formatRupiah(item.price)}`;
      const sub = this.formatRupiah(item.subtotal);
      parts.push(...encoder.encode(this.makeTwoColumn("  " + qtyPrice, sub, width) + "\n"));
    }

    parts.push(...encoder.encode(divider + "\n"));

    // Subtotal, Diskon, Total
    parts.push(...encoder.encode(this.makeTwoColumn("Subtotal", this.formatRupiah(tx.subtotal), width) + "\n"));
    if (tx.discount > 0) {
      parts.push(...encoder.encode(this.makeTwoColumn("Diskon", "-" + this.formatRupiah(tx.discount), width) + "\n"));
    }

    // Bold Total
    parts.push(ESC, 0x45, 0x01); // bold on
    parts.push(...encoder.encode(this.makeTwoColumn("TOTAL", this.formatRupiah(tx.total), width) + "\n"));
    parts.push(ESC, 0x45, 0x00); // bold off

    if (tx.paymentMethod === "cash") {
      parts.push(...encoder.encode(this.makeTwoColumn("Bayar Tunai", this.formatRupiah(tx.cashPaid), width) + "\n"));
      parts.push(...encoder.encode(this.makeTwoColumn("Kembalian", this.formatRupiah(tx.change), width) + "\n"));
    } else {
      parts.push(...encoder.encode(this.makeTwoColumn("Metode", tx.paymentMethod.toUpperCase(), width) + "\n"));
    }

    parts.push(...encoder.encode(divider + "\n"));

    // Center Footer
    parts.push(ESC, 0x61, 0x01);
    const footerLines = settings.footerMessage.split("\n");
    for (const line of footerLines) {
      parts.push(...encoder.encode(line + "\n"));
    }
    parts.push(...encoder.encode("Simpan struk ini sebagai bukti sah\n"));

    // Feed and Cut
    parts.push(ESC, 0x64, 0x04); // 4 line feeds
    parts.push(GS, 0x56, 0x41, 0x10); // Paper cut (partial)

    return new Uint8Array(parts);
  }

  // Print raw receipt bytes via Bluetooth
  public async printReceipt(tx: Transaction, settings: StoreSettings): Promise<void> {
    if (!this.characteristic) {
      throw new Error("Printer Bluetooth belum terhubung. Silakan hubungkan printer di Pengaturan.");
    }

    const data = this.generateReceiptBytes(tx, settings);

    // Send in chunks of 100 bytes to avoid BLE buffer overflow
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // Small pause between chunks
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  // Test Print
  public async printTest(settings: StoreSettings): Promise<void> {
    if (!this.characteristic) {
      throw new Error("Printer belum terhubung.");
    }

    const width = settings.paperSize === "80mm" ? 48 : 32;
    const divider = "=".repeat(width);
    const encoder = new TextEncoder();
    const parts: number[] = [];

    parts.push(ESC, 0x40);
    parts.push(ESC, 0x61, 0x01);
    parts.push(ESC, 0x21, 0x30);
    parts.push(...encoder.encode("TES PRINTER OK\n"));
    parts.push(ESC, 0x21, 0x00);
    parts.push(...encoder.encode(settings.storeName + "\n"));
    parts.push(...encoder.encode(divider + "\n"));
    parts.push(...encoder.encode(`Ukuran Kertas: ${settings.paperSize}\n`));
    parts.push(...encoder.encode(`Waktu: ${new Date().toLocaleTimeString("id-ID")}\n`));
    parts.push(...encoder.encode("Printer Bluetooth Siap Digunakan!\n"));
    parts.push(...encoder.encode(divider + "\n"));
    parts.push(ESC, 0x64, 0x04);
    parts.push(GS, 0x56, 0x41, 0x10);

    const data = new Uint8Array(parts);
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();
