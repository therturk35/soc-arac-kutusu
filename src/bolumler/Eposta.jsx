import { useMemo, useState } from 'react'
import { epostaAnalizEt } from '../lib/eposta.js'
import { ORNEK_EPOSTA } from '../lib/ornekEposta.js'

const RISK = {
  yuksek: { etiket: 'Yüksek risk', sinif: 'kirmizi' },
  orta: { etiket: 'Dikkat', sinif: 'sari' },
  dusuk: { etiket: 'Belirgin işaret yok', sinif: 'yesil' },
}
const SEVIYE = { yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' }

function dogrulamaSinifi(sonuc) {
  if (sonuc === 'pass') return 'yesil'
  if (!sonuc || sonuc === 'none' || sonuc === 'neutral') return 'sari'
  return 'kirmizi'
}

function sureYaz(sn) {
  if (sn === null) return ''
  if (sn < 0) return 'saat uyumsuz'
  return sn < 60 ? `+${sn} sn` : `+${Math.round(sn / 60)} dk`
}

export default function Eposta() {
  const [metin, setMetin] = useState('')
  const s = useMemo(() => epostaAnalizEt(metin), [metin])
  const risk = RISK[s.risk]

  return (
    <>
      <section className="kart" aria-labelledby="e-giris">
        <h2 id="e-giris">1. E-posta başlığı</h2>
        <p className="aciklama ust-aciklama">
          Şüpheli e-postanın ham başlığını yapıştır (Gmail: “Orijinali göster”, Outlook: “İleti kaynağını görüntüle”). Yalnızca başlık kısmı incelenir.
        </p>
        <textarea value={metin} onChange={(e) => setMetin(e.target.value)} placeholder="Received: from ...&#10;From: ...&#10;Subject: ..." spellCheck={false} aria-label="E-posta başlığı" />
        <div className="dugmeler">
          <button type="button" className="birincil" onClick={() => setMetin(ORNEK_EPOSTA)}>Örnek başlık yükle</button>
          <button type="button" onClick={() => setMetin('')} disabled={!metin}>Temizle</button>
        </div>
      </section>

      {!metin.trim() ? (
        <p className="bos-durum">Henüz başlık yok. Denemek için “Örnek başlık yükle” düğmesine bas.</p>
      ) : !s.gecerli ? (
        <p className="uyari-kutu">Bu metinde e-posta başlığı bulunamadı. “From:” satırını içeren ham başlığı yapıştırdığından emin ol.</p>
      ) : (
        <>
          <section className={`kart sonuc ${risk.sinif}`} aria-labelledby="e-sonuc">
            <h2 id="e-sonuc">2. Değerlendirme</h2>
            <p className="karar"><b>{risk.etiket}</b> · {s.isaretler.length} işaret bulundu</p>
            {s.isaretler.length > 0 && (
              <ul className="isaretler">
                {s.isaretler.map((i) => (
                  <li key={i.metin}><span className={`rozet duz ${RISK[i.seviye].sinif}`}>{SEVIYE[i.seviye]}</span>{i.metin}</li>
                ))}
              </ul>
            )}
            <p className="aciklama">Bu bir ön incelemedir. İşaret çıkmaması e-postanın güvenli olduğunu kanıtlamaz; bağlantılara ve eklere ayrıca bakılmalıdır.</p>
          </section>

          <div className="iki-sutun">
            <section className="kart" aria-labelledby="e-kimlik">
              <h2 id="e-kimlik">3. Kimlik bilgileri</h2>
              <dl className="alanlar">
                <dt>Kimden</dt><dd>{s.kimden.gorunenAd && <span>{s.kimden.gorunenAd} </span>}<code>{s.kimden.adres}</code></dd>
                <dt>Yanıt adresi</dt><dd>{s.yanit ? <code>{s.yanit.adres}</code> : <span className="soluk">yok</span>}</dd>
                <dt>Dönüş yolu</dt><dd>{s.donus ? <code>{s.donus.adres}</code> : <span className="soluk">yok</span>}</dd>
                <dt>Konu</dt><dd>{s.konu || <span className="soluk">yok</span>}</dd>
                <dt>Tarih</dt><dd>{s.tarih || <span className="soluk">yok</span>}</dd>
                <dt>Kaynak IP</dt><dd>{s.kaynakIp ? <code>{s.kaynakIp}</code> : <span className="soluk">bulunamadı</span>}</dd>
              </dl>
            </section>

            <section className="kart" aria-labelledby="e-dogrulama">
              <h2 id="e-dogrulama">4. Gönderen doğrulaması</h2>
              <ul className="dogrulama">
                {[['spf', 'SPF', 'Bu sunucu bu alan adına e-posta göndermeye yetkili mi?'], ['dkim', 'DKIM', 'İleti yolda değiştirilmiş mi, imza geçerli mi?'], ['dmarc', 'DMARC', 'Görünen gönderen, doğrulanan alanla uyuşuyor mu?']].map(([ad, etiket, aciklama]) => (
                  <li key={ad}>
                    <span className={`rozet duz ${dogrulamaSinifi(s.dogrulama[ad])}`}>{etiket}: {s.dogrulama[ad] ?? 'sonuç yok'}</span>
                    <span className="soluk">{aciklama}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="kart" aria-labelledby="e-yol">
            <h2 id="e-yol">5. İletinin izlediği yol</h2>
            {s.duraklar.length === 0 ? (
              <p className="soluk">Received başlığı yok.</p>
            ) : (
              <ol className="duraklar">
                {s.duraklar.map((d, i) => (
                  <li key={i}>
                    <div><code>{d.kimden ?? 'bilinmiyor'}</code> → <code>{d.kime ?? 'bilinmiyor'}</code></div>
                    <div className="soluk">
                      {d.ipler.length > 0 && <>IP: <code>{d.ipler.join(', ')}</code> · </>}
                      {d.zamanMetni || 'zaman yok'} {d.gecikmeSn !== null && <b className="gecikme">{sureYaz(d.gecikmeSn)}</b>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </>
  )
}
