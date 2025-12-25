# Changelog

## [Unreleased]

### Added
- Command `/letak_karies` untuk melihat gambar lokasi karies (D-car, L-car, M-car, O-car, V-car)
- Field "Letak Karies" dengan dropdown selection di flow `/newpatient`
- Dropdown otomatis muncul saat input data pasien mencapai field "Letak Karies"
- Support untuk edit field "Letak Karies" dengan dropdown (bukan text input)
- Gambar karies (D-car.jpeg, L-car.jpeg, M-car.jpeg, O-car.jpeg, V-car.jpeg) untuk referensi visual

### Changed
- Update struktur Google Sheets: tambah kolom "Letak Karies" di posisi T (sebelum "Keterangan lain")
- Update flow input data pasien: total field menjadi 19 (dari 18)
- Update README.md dengan instruksi kolom baru dan command `/letak_karies`

### Technical Details
- Tambah field `letakKaries` dengan type `dropdown` di `src/constants.js`
- Tambah callback handler `FIELD_KARIES_PREFIX` untuk handle dropdown selection saat input data
- Tambah method `showLetakKariesDropdown()` dan `handleFieldKariesSelection()` di `src/bot.js`
- Auto-detect dropdown field type untuk show dropdown instead of text prompt
- Support dropdown di edit mode (saat user pilih "Change" di confirmation)

## [1.0.0] - Initial Release

### Features
- Input data pasien melalui percakapan interaktif Telegram
- 18 field data pasien terstruktur
- Konfirmasi data sebelum disimpan
- Edit field sebelum submit
- Auto-increment ID dan timestamp otomatis
- Multi-user concurrent access
- Session management untuk melanjutkan input yang tertunda
- Integrasi langsung dengan Google Sheets
- Commands: `/start`, `/newpatient`, `/exit`
