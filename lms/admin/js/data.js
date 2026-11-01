window.SEED = {
  peserta: [
    { id: 'p1', nama: 'Aditya Setiawan Sahir', email: 'aditya@contoh.id' },
    { id: 'p2', nama: 'Sari Wulandari', email: 'sari@contoh.id' },
    { id: 'p3', nama: 'Dewi Lestari', email: 'dewi@contoh.id' },
    { id: 'p4', nama: 'Rina Marlina', email: 'rina@contoh.id' },
    { id: 'p5', nama: 'Maya Putri', email: 'maya@contoh.id' },
    { id: 'p6', nama: 'Nur Aini', email: 'nur@contoh.id' },
    { id: 'p7', nama: 'Fitri Handayani', email: 'fitri@contoh.id' },
    { id: 'p8', nama: 'Lilis Suryani', email: 'lilis@contoh.id' }
  ],
  programs: [
    {
      id: 'dsa', nama: 'Digital Skill Academy', kategori: 'Digital',
      tujuan: 'Adaptasi teknologi dan inovasi', periode: 'Triwulanan', angkatan: 'Triwulan IV 2026',
      kuota: 30, status: 'buka',
      peserta: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'], selesai: [],
      sesi: [
        { id: 'dsa1', no: 1, judul: 'Pengenalan Digital Marketing', tanggal: '2026-09-17', jam: '09.00-12.00', mode: 'Luring', tempat: 'Aula 2', materi: { nama: 'pengenalan-digital-marketing.pdf', kb: 1240 }, hadir: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] },
        { id: 'dsa2', no: 2, judul: 'Self Branding', tanggal: '2026-09-24', jam: '09.00-12.00', mode: 'Luring', tempat: 'Aula 2', materi: { nama: 'self-branding.pdf', kb: 980 }, hadir: ['p1', 'p2', 'p3', 'p5', 'p6', 'p7'] },
        { id: 'dsa3', no: 3, judul: 'Content creator untuk Produk', tanggal: '2026-10-01', jam: '09.00-12.00', mode: 'Daring', tempat: 'Tautan kelas', materi: { nama: 'content-creator-produk.pdf', kb: 2100 }, hadir: ['p1', 'p2', 'p4', 'p5', 'p7'] },
        { id: 'dsa4', no: 4, judul: 'Media sosial untuk pemasaran', tanggal: '2026-10-08', jam: '09.00-12.00', mode: 'Luring', tempat: 'Aula 2', materi: null, hadir: [] },
        { id: 'dsa5', no: 5, judul: 'Praktik memasarkan produk', tanggal: '2026-10-15', jam: '09.00-12.00', mode: 'Daring', tempat: 'Tautan kelas', materi: null, hadir: [] }
      ]
    },
    {
      id: 'ink', nama: 'Inkubator Bisnis', kategori: 'Usaha',
      tujuan: 'Menyusun rencana usaha yang siap dijalankan', periode: 'Triwulanan', angkatan: 'Triwulan IV 2026',
      kuota: 25, status: 'tutup',
      peserta: ['p1', 'p3', 'p5', 'p8'], selesai: [],
      sesi: [
        { id: 'ink1', no: 1, judul: 'Menemukan gagasan usaha', tanggal: '2026-09-29', jam: '09.00-11.00', mode: 'Luring', tempat: 'Aula 1', materi: { nama: 'gagasan-usaha.pdf', kb: 760 }, hadir: ['p1', 'p3', 'p8'] },
        { id: 'ink2', no: 2, judul: 'Model bisnis sederhana', tanggal: '2026-10-06', jam: '09.00-11.00', mode: 'Luring', tempat: 'Aula 1', materi: { nama: 'model-bisnis.pdf', kb: 1100 }, hadir: [] },
        { id: 'ink3', no: 3, judul: 'Menghitung modal dan harga jual', tanggal: '2026-10-13', jam: '09.00-11.00', mode: 'Daring', tempat: 'Tautan kelas', materi: null, hadir: [] },
        { id: 'ink4', no: 4, judul: 'Presentasi rencana usaha', tanggal: '2026-10-20', jam: '09.00-11.00', mode: 'Luring', tempat: 'Aula 1', materi: null, hadir: [] }
      ]
    },
    {
      id: 'mkt', nama: 'Pemasaran Produk di Marketplace', kategori: 'Digital',
      tujuan: 'Peserta mampu berjualan lewat marketplace', periode: 'Sekali jalan', angkatan: 'Gelombang 1 2026',
      kuota: 30, status: 'buka', peserta: [], selesai: [],
      sesi: [
        { id: 'mkt1', no: 1, judul: 'Membuka toko di marketplace', tanggal: '2026-11-03', jam: '09.00-12.00', mode: 'Daring', tempat: 'Tautan kelas', materi: null, hadir: [] },
        { id: 'mkt2', no: 2, judul: 'Foto dan deskripsi produk', tanggal: '2026-11-10', jam: '09.00-12.00', mode: 'Daring', tempat: 'Tautan kelas', materi: null, hadir: [] }
      ]
    },
    {
      id: 'kri', nama: 'Kriya Kreatif Lanjutan', kategori: 'Kriya',
      tujuan: 'Produk kriya peserta layak jual dan rapi', periode: 'Sekali jalan', angkatan: 'Gelombang 1 2026',
      kuota: 20, status: 'buka', peserta: ['p4', 'p6'], selesai: [],
      sesi: [
        { id: 'kri1', no: 1, judul: 'Standar mutu produk kriya', tanggal: '2026-10-22', jam: '09.00-11.00', mode: 'Luring', tempat: 'Aula 2', materi: null, hadir: [] },
        { id: 'kri2', no: 2, judul: 'Kemasan dan foto produk', tanggal: '2026-10-29', jam: '09.00-11.00', mode: 'Luring', tempat: 'Aula 2', materi: null, hadir: [] }
      ]
    },
    {
      id: 'lit', nama: 'Literasi Keuangan Usaha', kategori: 'Keuangan',
      tujuan: 'Peserta mampu mencatat dan mengatur keuangan usahanya', periode: 'Sekali jalan', angkatan: 'Gelombang 1 2026',
      kuota: 40, status: 'buka', peserta: ['p2'], selesai: [],
      sesi: [
        { id: 'lit1', no: 1, judul: 'Mencatat uang masuk dan keluar', tanggal: '2026-10-10', jam: '13.00-15.00', mode: 'Daring', tempat: 'Tautan kelas', materi: null, hadir: [] },
        { id: 'lit2', no: 2, judul: 'Menyusun anggaran bulanan', tanggal: '2026-10-17', jam: '13.00-15.00', mode: 'Daring', tempat: 'Tautan kelas', materi: null, hadir: [] }
      ]
    },
    {
      id: 'kep', nama: 'Kepemimpinan Perempuan', kategori: 'Kepemimpinan',
      tujuan: 'Peserta percaya diri memimpin kelompok', periode: 'Sekali jalan', angkatan: 'Gelombang 1 2027',
      kuota: 25, status: 'segera', peserta: [], selesai: [], sesi: []
    }
  ],
  pendaftaran: [
    { id: 'r1', pid: 'p1', prog: 'mkt', tgl: '2026-10-06', status: 'menunggu', alasan: '' },
    { id: 'r2', pid: 'p8', prog: 'mkt', tgl: '2026-10-05', status: 'menunggu', alasan: '' },
    { id: 'r3', pid: 'p6', prog: 'mkt', tgl: '2026-10-05', status: 'menunggu', alasan: '' },
    { id: 'r4', pid: 'p4', prog: 'lit', tgl: '2026-10-04', status: 'menunggu', alasan: '' }
  ]
};