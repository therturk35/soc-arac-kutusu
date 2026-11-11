// Log satırlarını tarayıcıda çözümler. Hiçbir veri sunucuya gönderilmez.

const IP_ADAYI = /(?<![\d.])\d{1,4}(?:\.\d{1,4}){3}(?![\d.])/g
const TARIH = /(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
const SAAT = /\b([01]\d|2[0-3]):([0-5]\d):([0-5]\d)\b/

const KURALLAR = [
  ['basarisiz', /\b(failed|failure|invalid|unauthorized|denied|refused)\b/i],
  ['hata', /\b(error|critical|fatal)\b/i],
  ['uyari', /\b(warn|warning)\b/i],
  ['bilgi', /\b(info|success|accepted|started|completed)\b/i],
]

export const SEVIYE_ADI = {
  basarisiz: 'Başarısız giriş',
  hata: 'Hata',
  uyari: 'Uyarı',
  bilgi: 'Bilgi',
  diger: 'Diğer',
}

// Her parça 0-255 arasında ve en fazla 3 haneli olmalı.
export function ipGecerliMi(ip) {
  const parcalar = ip.split('.')
  return parcalar.length === 4 && parcalar.every((p) => p.length <= 3 && Number(p) <= 255)
}

// 10.x, 172.16-31.x, 192.168.x ve 127.x iç ağ adresleridir.
export function ozelIpMi(ip) {
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

export function seviyeBul(satir) {
  for (const [ad, desen] of KURALLAR) if (desen.test(satir)) return ad
  return 'diger'
}

export function satirCozumle(ham, no) {
  const adaylar = ham.match(IP_ADAYI) ?? []
  const tarih = ham.match(TARIH)
  const saat = tarih ? tarih[2] : ham.match(SAAT)?.[1]
  return {
    no,
    ham,
    zaman: tarih ? `${tarih[1]} ${tarih[2]}:${tarih[3]}:${tarih[4]}` : null,
    saat: saat ?? null,
    seviye: seviyeBul(ham),
    ipler: adaylar.filter(ipGecerliMi),
    gecersizIpler: adaylar.filter((ip) => !ipGecerliMi(ip)),
  }
}

// esik: bir IP kaç başarısız denemeden sonra "şüpheli" sayılır.
export function analizEt(metin, esik = 3) {
  const satirlar = metin
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => satirCozumle(s, i + 1))

  const seviyeler = { basarisiz: 0, hata: 0, uyari: 0, bilgi: 0, diger: 0 }
  const saatlik = Array.from({ length: 24 }, () => ({ toplam: 0, basarisiz: 0 }))
  const ipHaritasi = new Map()
  const gecersiz = new Set()

  for (const s of satirlar) {
    seviyeler[s.seviye] += 1
    if (s.saat !== null) {
      const dilim = saatlik[Number(s.saat)]
      dilim.toplam += 1
      if (s.seviye === 'basarisiz') dilim.basarisiz += 1
    }
    s.gecersizIpler.forEach((ip) => gecersiz.add(ip))
    for (const ip of new Set(s.ipler)) {
      const kayit = ipHaritasi.get(ip) ?? { ip, toplam: 0, basarisiz: 0, ilk: s.zaman, son: s.zaman, ozel: ozelIpMi(ip) }
      kayit.toplam += 1
      if (s.seviye === 'basarisiz') kayit.basarisiz += 1
      if (s.zaman) kayit.son = s.zaman
      ipHaritasi.set(ip, kayit)
    }
  }

  const ipTablosu = [...ipHaritasi.values()]
    .map((k) => ({ ...k, supheli: k.basarisiz >= esik }))
    .sort((a, b) => b.basarisiz - a.basarisiz || b.toplam - a.toplam)

  return {
    satirlar,
    seviyeler,
    saatlik,
    ipTablosu,
    gecersizIpler: [...gecersiz],
    ozet: {
      satir: satirlar.length,
      basarisiz: seviyeler.basarisiz,
      tekilIp: ipTablosu.length,
      supheli: ipTablosu.filter((k) => k.supheli).length,
    },
  }
}

// Excel benzeri programlarda formül çalışmasını (CSV injection) önler.
export function csvHucre(deger) {
  let s = String(deger ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replaceAll('"', '""')}"`
}

export function csvUret(ipTablosu, notlar = {}) {
  const baslik = ['IP', 'Toplam', 'Başarısız', 'Şüpheli', 'İç ağ', 'İlk görülme', 'Son görülme', 'Analist notu']
  const satirlar = ipTablosu.map((k) =>
    [k.ip, k.toplam, k.basarisiz, k.supheli ? 'Evet' : 'Hayır', k.ozel ? 'Evet' : 'Hayır', k.ilk ?? '', k.son ?? '', notlar[k.ip] ?? '']
      .map(csvHucre)
      .join(','),
  )
  return [baslik.map(csvHucre).join(','), ...satirlar].join('\n')
}
