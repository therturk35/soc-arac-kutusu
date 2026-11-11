// LocalStorage yardımcıları. Depolama kapalıysa uygulama yine çalışır.
export function kayitliOku(anahtar, varsayilan) {
  try {
    const ham = localStorage.getItem(anahtar)
    return ham === null ? varsayilan : JSON.parse(ham)
  } catch {
    return varsayilan
  }
}

export function kayitliYaz(anahtar, deger) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger))
  } catch {
    /* yoksay */
  }
}

export function indir(icerik, dosyaAdi, tur) {
  const adres = URL.createObjectURL(new Blob([icerik], { type: tur }))
  const a = document.createElement('a')
  a.href = adres
  a.download = dosyaAdi
  a.click()
  URL.revokeObjectURL(adres)
}
