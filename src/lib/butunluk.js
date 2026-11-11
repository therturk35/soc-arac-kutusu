// Dosya bütünlüğü: SHA-256 parmak izi. Hesap tarayıcının Web Crypto API'si ile yapılır.

export async function sha256Hex(veri) {
  const ozet = await crypto.subtle.digest('SHA-256', veri)
  return [...new Uint8Array(ozet)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hashGecerliMi(metin) {
  return /^[a-f0-9]{64}$/i.test(metin.trim())
}

export function hashEsitMi(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

// Kayıtlı parmak iziyle karşılaştırır: 'yeni' | 'ayni' | 'degismis'
export function durumBul(kayitlar, ad, hash) {
  const kayit = kayitlar.find((k) => k.ad === ad)
  if (!kayit) return 'yeni'
  return hashEsitMi(kayit.hash, hash) ? 'ayni' : 'degismis'
}

export function boyutYaz(bayt) {
  if (bayt < 1024) return `${bayt} B`
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`
  return `${(bayt / 1024 / 1024).toFixed(1)} MB`
}
