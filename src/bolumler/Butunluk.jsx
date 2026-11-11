import { useEffect, useState } from 'react'
import { boyutYaz, durumBul, hashEsitMi, hashGecerliMi, sha256Hex } from '../lib/butunluk.js'
import { indir, kayitliOku, kayitliYaz } from '../lib/depo.js'

const AZAMI_BOYUT = 200 * 1024 * 1024 // 200 MB

const DURUM = {
  yeni: { etiket: 'Kayıtta yok', sinif: '' },
  ayni: { etiket: 'Değişmemiş', sinif: 'yesil' },
  degismis: { etiket: 'DEĞİŞMİŞ', sinif: 'kirmizi' },
}

// Dosyanın kendisi saklanmaz; kayda yalnızca ad, boyut, parmak izi ve zaman yazılır.
export default function Butunluk() {
  const [dosyalar, setDosyalar] = useState([])
  const [kayitlar, setKayitlar] = useState(() => kayitliOku('soc.butunluk', []))
  const [beklenen, setBeklenen] = useState('')
  const [mesgul, setMesgul] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => kayitliYaz('soc.butunluk', kayitlar), [kayitlar])

  async function dosyaSec(olay) {
    const secilen = [...(olay.target.files ?? [])]
    olay.target.value = ''
    const buyuk = secilen.filter((d) => d.size > AZAMI_BOYUT)
    setHata(buyuk.length ? `200 MB üstü dosyalar atlandı: ${buyuk.map((d) => d.name).join(', ')}` : '')
    setMesgul(true)
    const sonuclar = []
    for (const d of secilen.filter((x) => x.size <= AZAMI_BOYUT)) {
      sonuclar.push({ ad: d.name, boyut: d.size, hash: await sha256Hex(await d.arrayBuffer()) })
    }
    setDosyalar(sonuclar)
    setMesgul(false)
  }

  function kaydaEkle() {
    const zaman = new Date().toISOString()
    const yeni = dosyalar.map((d) => ({ ...d, zaman }))
    setKayitlar([...kayitlar.filter((k) => !yeni.some((y) => y.ad === k.ad)), ...yeni])
  }

  const beklenenGecerli = hashGecerliMi(beklenen)

  return (
    <>
      <section className="kart" aria-labelledby="b-giris">
        <h2 id="b-giris">1. Dosya seç</h2>
        <p className="aciklama ust-aciklama">
          Seçtiğin dosyanın SHA-256 parmak izi tarayıcında hesaplanır. Dosyada tek bir bayt değişirse parmak izi tamamen değişir; delilin bozulmadığı böyle gösterilir.
        </p>
        <div className="dugmeler">
          <label className="dugme birincil">
            Dosya seç
            <input type="file" multiple onChange={dosyaSec} hidden />
          </label>
          {mesgul && <span className="soluk" role="status">Hesaplanıyor…</span>}
        </div>
        {hata && <p className="hata" role="alert">{hata}</p>}
      </section>

      {dosyalar.length > 0 && (
        <section className="kart" aria-labelledby="b-sonuc">
          <div className="kart-ust">
            <h2 id="b-sonuc">2. Parmak izleri</h2>
            <button type="button" onClick={kaydaEkle}>Kayda ekle</button>
          </div>
          <label className="beklenen">
            Beklenen SHA-256 (isteğe bağlı)
            <input type="text" value={beklenen} onChange={(e) => setBeklenen(e.target.value)} placeholder="64 haneli hash değerini yapıştır" spellCheck={false} />
          </label>
          {beklenen && !beklenenGecerli && <p className="hata">Bu bir SHA-256 değeri değil: 64 haneli olmalı ve yalnızca 0-9, a-f içermeli.</p>}
          <ul className="dosya-listesi">
            {dosyalar.map((d) => {
              const durum = DURUM[durumBul(kayitlar, d.ad, d.hash)]
              return (
                <li key={d.ad}>
                  <div className="dosya-ust">
                    <b>{d.ad}</b>
                    <span className="soluk">{boyutYaz(d.boyut)}</span>
                    <span className={`rozet duz ${durum.sinif}`}>{durum.etiket}</span>
                    {beklenenGecerli && (
                      <span className={`rozet duz ${hashEsitMi(beklenen, d.hash) ? 'yesil' : 'kirmizi'}`}>
                        {hashEsitMi(beklenen, d.hash) ? 'Beklenenle eşleşiyor' : 'Beklenenle eşleşmiyor'}
                      </span>
                    )}
                  </div>
                  <code className="hash">{d.hash}</code>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="kart" aria-labelledby="b-kayit">
        <div className="kart-ust">
          <h2 id="b-kayit">3. Kayıt (manifest)</h2>
          <div className="dugmeler sifir">
            <button type="button" disabled={!kayitlar.length} onClick={() => indir(JSON.stringify(kayitlar, null, 2), 'butunluk-kaydi.json', 'application/json')}>JSON indir</button>
            <button type="button" disabled={!kayitlar.length} onClick={() => setKayitlar([])}>Kaydı temizle</button>
          </div>
        </div>
        {kayitlar.length === 0 ? (
          <p className="soluk">Kayıt boş. Dosya seçip “Kayda ekle” dersen parmak izi burada saklanır; aynı dosyayı sonra yeniden seçtiğinde değişip değişmediği gösterilir.</p>
        ) : (
          <div className="tablo-sarmal">
            <table>
              <thead><tr><th>Dosya</th><th className="sag">Boyut</th><th>SHA-256</th><th>Kayıt zamanı</th></tr></thead>
              <tbody>
                {kayitlar.map((k) => (
                  <tr key={k.ad}>
                    <td>{k.ad}</td>
                    <td className="sag">{boyutYaz(k.boyut)}</td>
                    <td><code title={k.hash}>{k.hash.slice(0, 16)}…</code></td>
                    <td className="soluk">{k.zaman.replace('T', ' ').slice(0, 19)} UTC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
