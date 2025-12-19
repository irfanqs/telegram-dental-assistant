# Telegram Patient Data Bot

Bot Telegram untuk pencatatan data pasien yang terintegrasi dengan Google Spreadsheet. Bot ini memungkinkan dokter untuk memasukkan data pasien melalui percakapan interaktif di Telegram, dengan data yang langsung tersimpan ke Google Sheets.

## Fitur

- ✅ Input data pasien melalui percakapan interaktif
- ✅ 18 field data pasien yang terstruktur
- ✅ Konfirmasi data sebelum disimpan
- ✅ Edit field sebelum submit
- ✅ Auto-increment ID dan timestamp otomatis
- ✅ Multi-user concurrent access
- ✅ Session management untuk melanjutkan input yang tertunda
- ✅ Integrasi langsung dengan Google Sheets

## Prerequisites

- Node.js v18 atau lebih tinggi
- npm atau yarn
- Akun Telegram
- Google Cloud Project dengan Sheets API enabled
- Google Service Account credentials

## Quick Start

### 1. Clone dan Install Dependencies

```bash
git clone <repository-url>
cd telegram-patient-bot
npm install
```

### 2. Setup Google Cloud dan Service Account

Ikuti panduan lengkap di [SETUP_GOOGLE.md](./SETUP_GOOGLE.md) untuk:
- Membuat Google Cloud Project
- Enable Google Sheets API
- Membuat Service Account
- Download credentials JSON
- Share spreadsheet dengan service account

### 3. Setup Telegram Bot

1. Buka Telegram dan cari [@BotFather](https://t.me/botfather)
2. Kirim command `/newbot`
3. Ikuti instruksi untuk memberi nama bot
4. Copy token yang diberikan oleh BotFather

### 4. Setup Google Spreadsheet

1. Buat spreadsheet baru di Google Sheets
2. Buat header di baris pertama dengan kolom:
   - A1: `ID`
   - B1: `Tanggal`
   - C1: `Nama Pasien`
   - D1: `NIK / No. RM`
   - E1: `Jenis Kelamin`
   - F1: `Usia`
   - G1: `Alamat`
   - H1: `No. Telepon`
   - I1: `Dokter Pemeriksa`
   - J1: `Diagnosa`
   - K1: `Tindakan`
   - L1: `Penyakit lainnya`
   - M1: `Golongan darah`
   - N1: `Tekanan Darah`
   - O1: `Gigi yang dikeluhkan`
   - P1: `Perawatan Persetujuan`
   - Q1: `Biaya dokter`
   - R1: `Biaya lab`
   - S1: `Total Biaya`
   - T1: `Keterangan lain`

3. Copy Spreadsheet ID dari URL (bagian setelah `/d/` dan sebelum `/edit`)
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

4. Share spreadsheet dengan service account email (dari credentials.json)
   - Klik tombol "Share"
   - Paste email service account (format: `xxx@xxx.iam.gserviceaccount.com`)
   - Berikan akses "Editor"

### 5. Configure Environment Variables

1. Copy file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit file `.env` dan isi dengan credentials Anda:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   SPREADSHEET_ID=your_spreadsheet_id_from_url
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   ```

3. Letakkan file credentials JSON dari Google Cloud di root folder project dengan nama `credentials.json`

### 6. Run the Bot

```bash
npm start
```

Bot akan mulai berjalan dan siap menerima perintah di Telegram.

## Cara Menggunakan Bot

### Command yang Tersedia

- `/start` - Memulai bot dan menerima sambutan
- `/newpatient` - Memulai proses input data pasien baru
- `/exit` - Membatalkan proses input yang sedang berjalan

### Flow Input Data Pasien

1. Kirim command `/newpatient` ke bot
2. Bot akan meminta input untuk setiap field secara berurutan:
   - Nama Pasien
   - NIK / No. RM
   - Jenis Kelamin
   - Usia
   - Alamat
   - No. Telepon
   - Dokter Pemeriksa
   - Diagnosa
   - Tindakan
   - Penyakit lainnya
   - Golongan darah
   - Tekanan Darah
   - Gigi yang dikeluhkan
   - Perawatan Persetujuan
   - Biaya dokter
   - Biaya lab
   - Total Biaya
   - Keterangan lain

3. Setelah semua field diisi, bot akan menampilkan ringkasan data
4. Pilih salah satu opsi:
   - **Yes** - Simpan data ke Google Sheets
   - **No** - Batalkan dan hapus data
   - **Change** - Edit field tertentu sebelum menyimpan

5. Jika memilih "Change":
   - Pilih field yang ingin diedit
   - Masukkan nilai baru
   - Kembali ke ringkasan dengan data yang sudah diupdate
   - Bisa edit beberapa field sebelum konfirmasi final

### Melanjutkan Session yang Tertunda

Jika Anda keluar di tengah proses input:
1. Kirim `/start` lagi
2. Bot akan menanyakan apakah ingin melanjutkan input sebelumnya
3. Pilih "Lanjutkan" untuk melanjutkan dari field terakhir
4. Atau pilih "Mulai Baru" untuk memulai dari awal

### Membatalkan Input

Kirim `/exit` kapan saja untuk membatalkan proses input dan menghapus data yang sudah dimasukkan.

## Development

### Project Structure

```
telegram-patient-bot/
├── src/
│   ├── bot.js              # Bot initialization and command handlers
│   ├── sessionManager.js   # Session management logic
│   ├── sheetsService.js    # Google Sheets integration
│   ├── config.js           # Environment configuration
│   ├── constants.js        # Field definitions and messages
│   └── index.js            # Application entry point
├── tests/
│   ├── bot.test.js
│   ├── bot.property.test.js
│   ├── sessionManager.test.js
│   ├── sessionManager.property.test.js
│   ├── sheetsService.test.js
│   └── sheetsService.property.test.js
├── .env                    # Environment variables (not in git)
├── .env.example            # Example environment variables
├── credentials.json        # Google Service Account key (not in git)
├── package.json
└── README.md
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Strategy

The project uses two complementary testing approaches:

1. **Unit Tests** - Test specific examples and edge cases
2. **Property-Based Tests** - Test universal properties across many random inputs using fast-check

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `SPREADSHEET_ID` | ID dari Google Spreadsheet | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path ke credentials JSON | `./credentials.json` |

## Troubleshooting

### Bot tidak merespon

- Pastikan bot sudah running dengan `npm start`
- Check apakah token Telegram valid
- Pastikan tidak ada error di console

### Error "Data gagal di simpan di google sheets"

- Pastikan Spreadsheet ID benar
- Pastikan credentials.json valid dan path-nya benar
- Pastikan spreadsheet sudah di-share dengan service account email
- Check apakah Google Sheets API sudah enabled di Google Cloud Console

### Error "Missing required environment variable"

- Pastikan file `.env` ada dan berisi semua variable yang diperlukan
- Pastikan tidak ada typo di nama variable
- Pastikan credentials.json ada di lokasi yang benar

### Session hilang setelah restart

- Session disimpan di memory, jadi akan hilang saat bot restart
- Ini adalah behavior yang diharapkan
- User bisa memulai input baru dengan `/newpatient`

## Security Notes

⚠️ **PENTING**: Jangan commit file berikut ke git:
- `.env` - Berisi credentials sensitif
- `credentials.json` - Berisi Google Service Account key

File-file ini sudah ada di `.gitignore`. Pastikan tidak menghapus entry tersebut.

## Multi-User Support

Bot mendukung multiple users secara bersamaan:
- Setiap user memiliki session terpisah
- Data user tidak akan tercampur
- Concurrent writes ke Google Sheets ditangani secara otomatis
- Setiap record mendapat ID unik

## License

[Your License Here]

## Support

Untuk pertanyaan atau issue, silakan buat issue di repository ini.
