import { describe, it, expect } from 'vitest'
import { boyutYaz, durumBul, hashGecerliMi, sha256Hex } from './butunluk.js'

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

describe('sha256Hex', () => {
  it('bilinen test vektörünü üretir', async () => expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe(ABC))
  it('tek karakter değişince hash değişir', async () => expect(await sha256Hex(new TextEncoder().encode('abd'))).not.toBe(ABC))
})

describe('hashGecerliMi', () => {
  it('64 haneli hex kabul edilir', () => expect(hashGecerliMi(` ${ABC.toUpperCase()} `)).toBe(true))
  it('kısa değer reddedilir', () => expect(hashGecerliMi('abc123')).toBe(false))
})

describe('durumBul', () => {
  const kayitlar = [{ ad: 'delil.img', hash: ABC }]
  it('kayıtta yoksa yeni', () => expect(durumBul(kayitlar, 'baska.txt', ABC)).toBe('yeni'))
  it('hash aynıysa değişmemiş', () => expect(durumBul(kayitlar, 'delil.img', ABC.toUpperCase())).toBe('ayni'))
  it('hash farklıysa değişmiş', () => expect(durumBul(kayitlar, 'delil.img', 'f'.repeat(64))).toBe('degismis'))
})

describe('boyutYaz', () => {
  it('birimleri seçer', () => {
    expect(boyutYaz(512)).toBe('512 B')
    expect(boyutYaz(2048)).toBe('2.0 KB')
    expect(boyutYaz(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
