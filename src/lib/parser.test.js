import { describe, it, expect } from 'vitest'
import { analizEt, ipGecerliMi, ozelIpMi, seviyeBul, csvHucre } from './parser.js'

describe('ipGecerliMi', () => {
  it('geçerli IP kabul edilir', () => expect(ipGecerliMi('192.168.1.5')).toBe(true))
  it('255 üstü parça reddedilir', () => expect(ipGecerliMi('256.1.1.1')).toBe(false))
  it('4 haneli parça reddedilir', () => expect(ipGecerliMi('45.77.12.2344')).toBe(false))
})

describe('ozelIpMi', () => {
  it('iç ağ adreslerini tanır', () => {
    expect(ozelIpMi('10.0.0.12')).toBe(true)
    expect(ozelIpMi('172.20.1.1')).toBe(true)
    expect(ozelIpMi('192.168.1.5')).toBe(true)
  })
  it('dış adresleri iç ağ saymaz', () => expect(ozelIpMi('203.0.113.7')).toBe(false))
})

describe('seviyeBul', () => {
  it('başarısız girişi yakalar', () => expect(seviyeBul('Failed password for root from 203.0.113.7')).toBe('basarisiz'))
  it('bilgi satırını ayırır', () => expect(seviyeBul('INFO: System update started.')).toBe('bilgi'))
  it('tanımadığı satıra diğer der', () => expect(seviyeBul('merhaba')).toBe('diger'))
})

describe('analizEt', () => {
  const log = [
    "[2026-01-01 10:15:01] INFO: User 'admin' login success from 192.168.1.5",
    '[2026-01-01 10:20:45] FAILED: Unauthorized access attempt from 203.0.113.7',
    "[2026-01-01 10:21:12] INVALID: Password error for user 'root' from 203.0.113.7",
    '[2026-01-01 11:30:11] FAILED: SSH connection dropped from 203.0.113.7',
    '[2026-01-01 11:31:00] FAILED: SSH connection dropped from 45.77.12.2344',
    '',
  ].join('\n')
  const sonuc = analizEt(log, 3)

  it('boş satırları saymaz', () => expect(sonuc.ozet.satir).toBe(5))
  it('başarısız denemeleri sayar', () => expect(sonuc.ozet.basarisiz).toBe(4))
  it('eşiği geçen IP şüpheli olur', () => {
    expect(sonuc.ipTablosu[0]).toMatchObject({ ip: '203.0.113.7', basarisiz: 3, supheli: true })
    expect(sonuc.ozet.supheli).toBe(1)
  })
  it('eşik yükselince şüpheli kalmaz', () => expect(analizEt(log, 4).ozet.supheli).toBe(0))
  it('geçersiz IP ayrı listelenir', () => expect(sonuc.gecersizIpler).toEqual(['45.77.12.2344']))
  it('saatlik dağılımı çıkarır', () => {
    expect(sonuc.saatlik[10]).toEqual({ toplam: 3, basarisiz: 2 })
    expect(sonuc.saatlik[11]).toEqual({ toplam: 2, basarisiz: 2 })
  })
})

describe('csvHucre', () => {
  it('formülle başlayan hücreyi etkisizleştirir', () => expect(csvHucre('=1+1')).toBe('"\'=1+1"'))
  it('tırnakları kaçırır', () => expect(csvHucre('a"b')).toBe('"a""b"'))
})
