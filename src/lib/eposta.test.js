import { describe, it, expect } from 'vitest'
import { adresCoz, basliklariAyir, epostaAnalizEt, kokAlan } from './eposta.js'
import { ORNEK_EPOSTA } from './ornekEposta.js'

describe('basliklariAyir', () => {
  it('katlanmış satırları birleştirir', () => {
    const b = basliklariAyir('Subject: uzun\n\tkonu\nFrom: a@ornek.com')
    expect(b).toEqual([{ ad: 'subject', deger: 'uzun konu' }, { ad: 'from', deger: 'a@ornek.com' }])
  })
  it('gövdeyi başlık saymaz', () => expect(basliklariAyir('From: a@ornek.com\n\nGovde: x')).toHaveLength(1))
})

describe('adresCoz', () => {
  it('görünen adı ve adresi ayırır', () =>
    expect(adresCoz('"Ali Veli" <Ali@Ornek.com>')).toEqual({ adres: 'ali@ornek.com', alan: 'ornek.com', gorunenAd: 'Ali Veli' }))
  it('adres yoksa null döner', () => expect(adresCoz('merhaba')).toBeNull())
})

describe('kokAlan', () => {
  it('alt alanı köke indirir', () => expect(kokAlan('posta.ornek.com')).toBe('ornek.com'))
  it('com.tr uzantısını tanır', () => expect(kokAlan('posta.ornek.com.tr')).toBe('ornek.com.tr'))
})

describe('epostaAnalizEt', () => {
  const s = epostaAnalizEt(ORNEK_EPOSTA)
  it('gönderen ve yanıt adresini bulur', () => {
    expect(s.kimden.adres).toBe('guvenlik@banka-dogrulama.example.net')
    expect(s.yanit.adres).toBe('tahsilat@odeme.example.org')
  })
  it('durakları yolculuk sırasına dizer', () => {
    expect(s.duraklar).toHaveLength(3)
    expect(s.duraklar[0].ipler).toContain('203.0.113.77')
    expect(s.duraklar[1].gecikmeSn).toBe(23)
  })
  it('ilk dış IP kaynak sayılır', () => expect(s.kaynakIp).toBe('203.0.113.77'))
  it('doğrulama sonuçlarını okur', () => expect(s.dogrulama).toEqual({ spf: 'softfail', dkim: 'none', dmarc: 'fail' }))
  it('oltalama örneği yüksek risk çıkar', () => {
    expect(s.risk).toBe('yuksek')
    expect(s.isaretler.some((i) => i.metin.includes('Yanıt adresi'))).toBe(true)
    expect(s.isaretler.some((i) => i.metin.includes('Görünen ad'))).toBe(true)
  })
  it('temiz e-posta düşük risk çıkar', () => {
    const temiz = [
      'Return-Path: <ali@ornek.com>',
      'Received: from posta.ornek.com (posta.ornek.com [198.51.100.5]) by mx.alici.example.org; Mon, 05 Jan 2026 09:00:00 +0300',
      'Authentication-Results: mx.alici.example.org; spf=pass; dkim=pass; dmarc=pass',
      'From: Ali Veli <ali@ornek.com>',
      'Subject: Toplanti notlari',
      'Message-ID: <1@ornek.com>',
    ].join('\n')
    const t = epostaAnalizEt(temiz)
    expect(t.isaretler).toEqual([])
    expect(t.risk).toBe('dusuk')
  })
  it('başlık olmayan metni geçersiz sayar', () => expect(epostaAnalizEt('merhaba dünya').gecerli).toBe(false))
})
