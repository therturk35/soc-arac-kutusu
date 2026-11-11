// E-posta başlığı analizi. Başlıklar tarayıcıda çözümlenir, hiçbir yere gönderilmez.
import { ipGecerliMi, ozelIpMi } from './parser.js'

const IP_ADAYI = /(?<![\d.])\d{1,4}(?:\.\d{1,4}){3}(?![\d.])/g
const IKI_PARCALI_UZANTI = new Set(['com.tr', 'org.tr', 'net.tr', 'gov.tr', 'edu.tr', 'co.uk', 'org.uk', 'com.au', 'co.jp'])
const ACIL_KELIME = /\b(acil|urgent|hemen|askıya|suspend|verify|doğrula|şifre|parola|password|ödeme|invoice|fatura)/i

// Katlanmış satırları birleştirir ve "Ad: değer" çiftlerine ayırır.
export function basliklariAyir(ham) {
  const ust = ham.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)[0]
  return ust
    .replace(/\n[ \t]+/g, ' ')
    .split('\n')
    .map((satir) => {
      const i = satir.indexOf(':')
      return i > 0 ? { ad: satir.slice(0, i).trim().toLowerCase(), deger: satir.slice(i + 1).trim() } : null
    })
    .filter(Boolean)
}

export function adresCoz(deger = '') {
  // Gerçek adres en sondaki <...> içindedir; görünen ad içine sahte adres yazılabilir.
  const koseli = [...deger.matchAll(/<([^<>\s]+@[^<>\s]+)>/g)].at(-1)
  const m = koseli ?? deger.match(/([^\s<>"']+@[^\s<>"']+)/)
  if (!m) return null
  const adres = m[1].toLowerCase()
  const gorunenAd = deger.slice(0, m.index).replace(/["']/g, '').trim()
  return { adres, alan: adres.split('@')[1], gorunenAd }
}

// ornek.com.tr ve posta.ornek.com.tr aynı kök alan sayılır.
export function kokAlan(alan = '') {
  const p = alan.toLowerCase().split('.')
  const son2 = p.slice(-2).join('.')
  return IKI_PARCALI_UZANTI.has(son2) ? p.slice(-3).join('.') : son2
}

function receivedCoz(deger) {
  const zamanMetni = deger.includes(';') ? deger.slice(deger.lastIndexOf(';') + 1).trim() : ''
  const zaman = Date.parse(zamanMetni)
  return {
    kimden: deger.match(/\bfrom\s+(\S+)/i)?.[1] ?? null,
    kime: deger.match(/\bby\s+(\S+)/i)?.[1] ?? null,
    ipler: [...new Set((deger.match(IP_ADAYI) ?? []).filter(ipGecerliMi))],
    zaman: Number.isNaN(zaman) ? null : zaman,
    zamanMetni,
  }
}

export function epostaAnalizEt(ham) {
  const basliklar = basliklariAyir(ham)
  const ilk = (ad) => basliklar.find((b) => b.ad === ad)?.deger ?? ''
  const tumu = (ad) => basliklar.filter((b) => b.ad === ad).map((b) => b.deger)

  const kimden = adresCoz(ilk('from'))
  const yanit = adresCoz(ilk('reply-to'))
  const donus = adresCoz(ilk('return-path'))
  const mesajKimligi = adresCoz(ilk('message-id'))

  // Received başlıkları yukarıdan aşağıya yeniden eskiye doğrudur; ters çevirince yolculuk sırası çıkar.
  const duraklar = tumu('received').map(receivedCoz).reverse()
  duraklar.forEach((d, i) => {
    const onceki = duraklar[i - 1]
    d.gecikmeSn = i > 0 && d.zaman !== null && onceki.zaman !== null ? Math.round((d.zaman - onceki.zaman) / 1000) : null
  })
  const kaynakIp = duraklar.flatMap((d) => d.ipler).find((ip) => !ozelIpMi(ip)) ?? null

  const dogrulamaMetni = [...tumu('authentication-results'), ...tumu('arc-authentication-results')].join(' ')
  const dogrulama = {}
  for (const ad of ['spf', 'dkim', 'dmarc']) {
    dogrulama[ad] = dogrulamaMetni.match(new RegExp(`\\b${ad}=(\\w+)`, 'i'))?.[1].toLowerCase() ?? null
  }
  if (!dogrulama.spf) dogrulama.spf = ilk('received-spf').match(/^(\w+)/)?.[1].toLowerCase() ?? null

  const isaretler = []
  const ekle = (seviye, metin) => isaretler.push({ seviye, metin })

  if (basliklar.length === 0 || !kimden) {
    return { gecerli: false, basliklar, kimden, yanit, donus, konu: '', tarih: '', duraklar, kaynakIp, dogrulama, isaretler, risk: 'yok' }
  }

  for (const [ad, etiket] of [['spf', 'SPF'], ['dkim', 'DKIM'], ['dmarc', 'DMARC']]) {
    const s = dogrulama[ad]
    if (s && s !== 'pass') ekle(s === 'none' || s === 'neutral' ? 'orta' : 'yuksek', `${etiket} sonucu "${s}": gönderen sunucu doğrulanamadı.`)
  }
  if (!dogrulama.spf && !dogrulama.dkim && !dogrulama.dmarc) ekle('orta', 'SPF, DKIM ve DMARC sonucu yok: gönderenin kimliği doğrulanmamış.')
  if (yanit && kokAlan(yanit.alan) !== kokAlan(kimden.alan))
    ekle('yuksek', `Yanıt adresi farklı bir alanda (${yanit.alan}): cevabın görünen gönderene değil başkasına gider.`)
  if (donus && kokAlan(donus.alan) !== kokAlan(kimden.alan))
    ekle('orta', `Dönüş yolu (Return-Path) farklı bir alanda (${donus.alan}): e-postayı gerçekte başka bir sistem göndermiş olabilir.`)
  const addakiAdres = adresCoz(kimden.gorunenAd)
  if (addakiAdres && addakiAdres.adres !== kimden.adres)
    ekle('yuksek', `Görünen ad içinde başka bir adres var (${addakiAdres.adres}); gerçek adres ${kimden.adres}.`)
  if (mesajKimligi && kokAlan(mesajKimligi.alan) !== kokAlan(kimden.alan))
    ekle('dusuk', `Message-ID alanı (${mesajKimligi.alan}) gönderen alanından farklı. Toplu e-posta servislerinde normal olabilir.`)
  if (ACIL_KELIME.test(ilk('subject'))) ekle('dusuk', 'Konu satırı aciliyet ya da hesap/ödeme içeriyor; oltalamada sık görülür.')
  if (duraklar.length === 0) ekle('dusuk', 'Received başlığı yok: e-postanın izlediği yol görülemiyor.')

  const risk = isaretler.some((i) => i.seviye === 'yuksek') ? 'yuksek' : isaretler.some((i) => i.seviye === 'orta') ? 'orta' : 'dusuk'
  return { gecerli: true, basliklar, kimden, yanit, donus, konu: ilk('subject'), tarih: ilk('date'), duraklar, kaynakIp, dogrulama, isaretler, risk }
}
