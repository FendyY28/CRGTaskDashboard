import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailVerifierService {
  private readonly logger = new Logger(EmailVerifierService.name);
  
  // 🔴 PERBAIKAN: Ganti URL ke Email Reputation API sesuai gambar dashboard kamu
  private readonly baseUrl = 'https://emailreputation.abstractapi.com/v1/';

  constructor(private configService: ConfigService) {}

  async verify(email: string): Promise<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const apiKey = this.configService.get<string>('ABSTRACT_API_KEY');

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: apiKey,
          email: email,
        },
      });

      // 🔴 PERBAIKAN: Struktur response Email Reputation berbeda dengan Validation
      // Sesuai gambar kamu: kita cek email_deliverability.status
      const deliverability = response.data.email_deliverability?.status;

      return deliverability === 'deliverable'; 
    } catch (error) {
      this.logger.error(`Email Verification Failed: ${error.message}`);
      
      // 🟡 UNTUK TESTING: Ubah ke false agar kamu tahu kalau ada yang salah (seperti 401 tadi)
      // Jika sudah stabil, baru kembalikan ke true
      return false; 
    }
  }
}