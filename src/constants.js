/**
 * Constants module for Telegram Patient Bot
 * Defines patient data fields, bot messages, and callback data constants
 */

// Patient data fields in the exact order they should be collected
const FIELDS = [
  { key: 'namaPasien', label: 'Nama Pasien' },
  { key: 'nik', label: 'NIK / No. RM' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin' },
  { key: 'usia', label: 'Usia' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'noTelepon', label: 'No. Telepon' },
  { key: 'dokterPemeriksa', label: 'Dokter Pemeriksa' },
  { key: 'diagnosa', label: 'Diagnosa' },
  { key: 'tindakan', label: 'Tindakan' },
  { key: 'penyakitLainnya', label: 'penyakit lainnya' },
  { key: 'golonganDarah', label: 'Golongan Darah' },
  { key: 'tekananDarah', label: 'Tekanan Darah' },
  { key: 'gigiDikeluhkan', label: 'Gigi yang dikeluhkan' },
  { key: 'perawatanPersetujuan', label: 'Perawatan Persetujuan' },
  { key: 'biayaDokter', label: 'Biaya Dokter' },
  { key: 'biayaLab', label: 'Biaya Lab' },
  { key: 'totalBiaya', label: 'Total Biaya' },
  { key: 'letakKaries', label: 'Letak Karies', type: 'dropdown' },
  { key: 'keteranganLain', label: 'Keterangan lain' }
];

// Bot messages
const MESSAGES = {
  // Welcome messages
  ASK_DOCTOR_NAME: 'Masukkan Nama Dokter Pemeriksa',
  WELCOME: 'Hai dokter {name}, semangat kerjanya hari ini🤗!\nKetik /newpatient untuk memulai pendataan.',
  CONTINUE_SESSION: 'Anda memiliki input data yang belum selesai. Ingin melanjutkan?',
  
  // Prompts
  FIRST_FIELD_PROMPT: 'Masukkan nama pasien:',
  FIELD_PROMPT_PREFIX: 'Masukkan ',
  EDIT_FIELD_PROMPT_PREFIX: 'Masukkan ',
  EDIT_FIELD_PROMPT_SUFFIX: ' yang baru',
  
  // Confirmations
  SUMMARY_HEADER: '📋 *Ringkasan Data Pasien*\n\nSilakan periksa data berikut:\n\n',
  SUMMARY_QUESTION: '\nApakah data sudah benar?',
  SUCCESS: '✅ Data berhasil disimpan ke Google Sheets!\n\nKetik /start untuk memulai ulang pencatatan.',
  CANCELLED: '❌ Input data dibatalkan. Data tidak disimpan.',
  
  // Errors
  ERROR_SAVE_FAILED: 'Data gagal di simpan di google sheets',
  ERROR_NO_ACTIVE_SESSION: 'Tidak ada sesi aktif. Ketik /start untuk memulai.',
  ERROR_ALREADY_HAS_SESSION: 'Anda sudah memiliki sesi aktif. Selesaikan atau gunakan /exit untuk membatalkan.',
  
  // Instructions
  SELECT_FIELD_TO_EDIT: 'Pilih field yang ingin diubah:',
  SELECT_LETAK_KARIES: 'Pilih letak karies:'
};

// Callback data constants for inline keyboards
const CALLBACK_DATA = {
  // Confirmation callbacks
  CONFIRM_YES: 'confirm_yes',
  CONFIRM_NO: 'confirm_no',
  CONFIRM_CHANGE: 'confirm_change',
  
  // Session resume callbacks
  RESUME_CONTINUE: 'resume_continue',
  RESUME_START_NEW: 'resume_start_new',
  
  // Edit callbacks prefix
  EDIT_FIELD_PREFIX: 'edit_',
  EDIT_BACK: 'edit_back',
  
  // Karies callbacks prefix
  KARIES_PREFIX: 'karies_',
  
  // Field input karies callbacks prefix
  FIELD_KARIES_PREFIX: 'field_karies_'
};

// Karies types with their image file paths
const KARIES_TYPES = [
  { 
    key: 'D', 
    label: 'D-car', 
    file: 'D-car.jpeg',
    imageUrl: 'https://drive.google.com/uc?export=view&id=1RUcHKcumJLI33BdEI1NAmYQoRJYnV-hI'
  },
  { 
    key: 'L', 
    label: 'L-car', 
    file: 'L-car.jpeg',
    imageUrl: 'https://drive.google.com/uc?export=view&id=1YqkM3QxMjgAX-jj2ud3DutY8O0CMty5x'
  },
  { 
    key: 'M', 
    label: 'M-car', 
    file: 'M-car.jpeg',
    imageUrl: 'https://drive.google.com/uc?export=view&id=1B0-vG7584zjxlM0EMr3brUC6o-Ma4u-M'
  },
  { 
    key: 'O', 
    label: 'O-car', 
    file: 'O-car.jpeg',
    imageUrl: 'https://drive.google.com/uc?export=view&id=18tO2WkHWCwIUr09oDXY9x0sIQVSBJ2W0'
  },
  { 
    key: 'V', 
    label: 'V-car', 
    file: 'V-car.jpeg',
    imageUrl: 'https://drive.google.com/uc?export=view&id=1qg_M5fEU4NX6vG8vZLyCIo9dC_pTdnPt'
  }
];

module.exports = {
  FIELDS,
  MESSAGES,
  CALLBACK_DATA,
  KARIES_TYPES
};
