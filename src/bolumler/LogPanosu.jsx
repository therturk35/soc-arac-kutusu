import { useEffect, useMemo, useState } from 'react'
import { analizEt, csvUret, SEVIYE_ADI } from '../lib/parser.js'
import { ORNEK_LOG } from '../lib/ornekLog.js'
import { indir, kayitliOku, kayitliYaz } from '../lib/depo.js'
import { boyutYaz, sha256Hex } from '../lib/butunluk.js'

const AZAMI_BOYUT = 5 * 1024 * 1024 // 5 MB
const AZAMI_SATIR = 300

// Log içeriği saklanmaz; yalnızca eşik ve analist notları LocalStorage'a yazılır.
export default function LogPanosu() {
  const [metin, setMetin] = useState('')
  const [esik, setEsik] = useState(() => kayitliOku('soc.esik', 3))
  const [notlar, setNotlar] = useState(() => kayitliOku('soc.notlar', {}))
  const [seviyeSuzgeci, setSeviyeSuzgeci] = useState('hepsi')
  const [arama, setArama] = useState('')
  const [hata, setHata] = useState('')
  const [dosyaBilgi, setDosyaBilgi] = useState(null)

  useEffect(() => kayitliYaz('soc.esik', esik), [esik])
  useEffect(() => kayitliYaz('soc.notlar', notlar), [notlar])

  const sonuc = useMemo(() => analizEt(metin, esik), [metin, esik])
  const bos = sonuc.ozet.satir === 0

  const gorunenSatirlar = useMemo(() => {
    const aranan = arama.trim().toLowerCase()
    return sonuc.satirlar.filter(
      (s) => (seviyeSuzgeci === 'hepsi' || s.seviye === seviyeSuzgeci) && (!aranan || s.ham.toLowerCase().includes(aranan)),
    )
  }, [sonuc.satirlar, seviyeSuzgeci, arama])

  async function dosyaSec(olay) {
    const dosya = olay.target.files?.[0]
    olay.target.value = ''
    if (!dosya) return
    if (dosya.size > AZAMI_BOYUT) {
      setHata(`Dosya çok büyük (${(dosya.size / 1024 / 1024).toFixed(1)} MB). En fazla 5 MB yükleyebilirsin.`)
      return
    }
    setHata('')
    const tampon = await dosya.arrayBuffer()
    setDosyaBilgi({ ad: dosya.name, boyut: dosya.size, hash: await sha256Hex(tampon) })
    setMetin(new TextDecoder().decode(tampon))
  }

  function csvIndir() {
    indir('\uFEFF' + csvUret(sonuc.ipTablosu, notlar), 'soc-ip-raporu.csv', 'text/csv;charset=utf-8')
  }

  const enYuksekSaat = Math.max(1, ...sonuc.saatlik.map((d) => d.toplam))
  const enYuksekSeviye = Math.max(1, ...Object.values(sonuc.seviyeler))

  return (
    <>
      <section className="kart" aria-labelledby="giris-baslik">
        <h2 id="giris-baslik">1. Log girişi</h2>
        <textarea
          value={metin}
          onChange={(e) => { setMetin(e.target.value); setDosyaBilgi(null) }}
          placeholder="[2026-01-01 10:20:45] FAILED: Unauthorized access attempt from 203.0.113.7"
          spellCheck={false}
          aria-label="Log metni"
        />
        <div className="dugmeler">
          <button type="button" className="birincil" onClick={() => { setHata(''); setDosyaBilgi(null); setMetin(ORNEK_LOG) }}>Örnek log yükle</button>
          <label className="dugme">
            Dosya seç (.log, .txt)
            <input type="file" accept=".log,.txt,text/plain" onChange={dosyaSec} hidden />
          </label>
          <button type="button" onClick={() => { setMetin(''); setDosyaBilgi(null) }} disabled={!metin}>Temizle</button>
          <label className="esik">
            Şüpheli eşiği
            <input type="number" min="1" max="99" value={esik} onChange={(e) => setEsik(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} />
            <span>başarısız deneme</span>
          </label>
        </div>
        {hata && <p className="hata" role="alert">{hata}</p>}
        {dosyaBilgi && (
          <p className="parmak-izi">
            {dosyaBilgi.ad} · {boyutYaz(dosyaBilgi.boyut)} · SHA-256: <code>{dosyaBilgi.hash}</code>
          </p>
        )}
      </section>

      {bos ? (
        <p className="bos-durum">Henüz log yok. Denemek için “Örnek log yükle” düğmesine bas.</p>
      ) : (
        <>
          <section className="ozet" aria-label="Özet">
            <Sayi etiket="Satır" deger={sonuc.ozet.satir} />
            <Sayi etiket="Başarısız giriş" deger={sonuc.ozet.basarisiz} ton="kirmizi" />
            <Sayi etiket="Tekil IP" deger={sonuc.ozet.tekilIp} />
            <Sayi etiket="Şüpheli IP" deger={sonuc.ozet.supheli} ton="sari" />
          </section>

          {sonuc.gecersizIpler.length > 0 && (
            <p className="uyari-kutu">
              Geçersiz biçimli IP bulundu: <code>{sonuc.gecersizIpler.join(', ')}</code>. Log bozulmuş ya da değiştirilmiş olabilir.
            </p>
          )}

          <div className="iki-sutun">
            <section className="kart" aria-labelledby="saat-baslik">
              <h2 id="saat-baslik">2. Saatlik dağılım</h2>
              <div className="saatler" role="img" aria-label="Saatlere göre satır ve başarısız giriş sayısı">
                {sonuc.saatlik.map((d, saat) => (
                  <div className="saat" key={saat} title={`${String(saat).padStart(2, '0')}:00  toplam ${d.toplam}, başarısız ${d.basarisiz}`}>
                    <div className="cubuk-alan">
                      <div className="cubuk" style={{ height: `${(d.toplam / enYuksekSaat) * 100}%` }}>
                        <div className="cubuk kirmizi" style={{ height: d.toplam ? `${(d.basarisiz / d.toplam) * 100}%` : 0 }} />
                      </div>
                    </div>
                    <span>{saat % 3 === 0 ? String(saat).padStart(2, '0') : ''}</span>
                  </div>
                ))}
              </div>
              <p className="aciklama"><i className="nokta" /> toplam satır <i className="nokta kirmizi" /> başarısız giriş</p>
            </section>

            <section className="kart" aria-labelledby="seviye-baslik">
              <h2 id="seviye-baslik">3. Olay türleri</h2>
              <ul className="seviyeler">
                {Object.entries(sonuc.seviyeler).map(([ad, sayi]) => (
                  <li key={ad}>
                    <span>{SEVIYE_ADI[ad]}</span>
                    <div className="yatay"><div className={`dolgu s-${ad}`} style={{ width: `${(sayi / enYuksekSeviye) * 100}%` }} /></div>
                    <b>{sayi}</b>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="kart" aria-labelledby="ip-baslik">
            <div className="kart-ust">
              <h2 id="ip-baslik">4. IP adresleri</h2>
              <button type="button" onClick={csvIndir}>CSV indir</button>
            </div>
            <div className="tablo-sarmal">
              <table>
                <thead>
                  <tr><th>IP</th><th className="sag">Toplam</th><th className="sag">Başarısız</th><th>Durum</th><th>Son görülme</th><th>Analist notu</th></tr>
                </thead>
                <tbody>
                  {sonuc.ipTablosu.map((k) => (
                    <tr key={k.ip} className={k.supheli ? 'supheli' : ''}>
                      <td><code>{k.ip}</code>{k.ozel && <span className="rozet">iç ağ</span>}</td>
                      <td className="sag">{k.toplam}</td>
                      <td className="sag">{k.basarisiz}</td>
                      <td>{k.supheli ? <span className="rozet sari">Şüpheli</span> : <span className="soluk">Normal</span>}</td>
                      <td className="soluk">{k.son ?? '-'}</td>
                      <td>
                        <input
                          type="text"
                          maxLength={120}
                          value={notlar[k.ip] ?? ''}
                          onChange={(e) => setNotlar({ ...notlar, [k.ip]: e.target.value })}
                          placeholder="Not ekle"
                          aria-label={`${k.ip} için not`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="kart" aria-labelledby="satir-baslik">
            <div className="kart-ust">
              <h2 id="satir-baslik">5. Log satırları</h2>
              <div className="suzgec">
                <select value={seviyeSuzgeci} onChange={(e) => setSeviyeSuzgeci(e.target.value)} aria-label="Olay türü süzgeci">
                  <option value="hepsi">Tüm türler</option>
                  {Object.entries(SEVIYE_ADI).map(([ad, etiket]) => <option key={ad} value={ad}>{etiket}</option>)}
                </select>
                <input type="search" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ara: IP, kullanıcı, kelime" aria-label="Satırlarda ara" />
              </div>
            </div>
            <ol className="satirlar">
              {gorunenSatirlar.slice(0, AZAMI_SATIR).map((s) => (
                <li key={s.no} className={`s-${s.seviye}`}><span className="no">{s.no}</span><code>{s.ham}</code></li>
              ))}
            </ol>
            <p className="aciklama">
              {gorunenSatirlar.length === 0
                ? 'Süzgece uyan satır yok.'
                : `${Math.min(gorunenSatirlar.length, AZAMI_SATIR)} / ${gorunenSatirlar.length} satır gösteriliyor.`}
            </p>
          </section>
        </>
      )}

    </>
  )
}

function Sayi({ etiket, deger, ton = '' }) {
  return (
    <div className={`sayi ${ton}`}>
      <b>{deger}</b>
      <span>{etiket}</span>
    </div>
  )
}
