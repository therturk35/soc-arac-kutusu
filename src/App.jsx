import { useEffect, useState } from 'react'
import LogPanosu from './bolumler/LogPanosu.jsx'
import Butunluk from './bolumler/Butunluk.jsx'
import Eposta from './bolumler/Eposta.jsx'
import { kayitliOku, kayitliYaz } from './lib/depo.js'

const SEKMELER = [
  { id: 'log', ad: 'Log analizi', Bolum: LogPanosu },
  { id: 'butunluk', ad: 'Dosya bütünlüğü', Bolum: Butunluk },
  { id: 'eposta', ad: 'E-posta başlığı', Bolum: Eposta },
]

export default function App() {
  const [tema, setTema] = useState(() => kayitliOku('soc.tema', 'koyu'))
  const [sekme, setSekme] = useState(() => {
    const kayitli = kayitliOku('soc.sekme', 'log')
    return SEKMELER.some((s) => s.id === kayitli) ? kayitli : 'log'
  })

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    kayitliYaz('soc.tema', tema)
  }, [tema])
  useEffect(() => kayitliYaz('soc.sekme', sekme), [sekme])

  return (
    <div className="sayfa">
      <header className="ust">
        <div>
          <h1>SOC Araç Kutusu</h1>
          <p>Log analizi, dosya bütünlüğü ve e-posta başlığı incelemesi tek yerde.</p>
        </div>
        <div className="ust-sag">
          <span className="gizlilik" title="Bütün işlemler tarayıcında yapılır">Veriler cihazından çıkmaz</span>
          <button type="button" onClick={() => setTema(tema === 'koyu' ? 'acik' : 'koyu')} aria-pressed={tema === 'acik'}>
            {tema === 'koyu' ? 'Açık tema' : 'Koyu tema'}
          </button>
        </div>
      </header>

      <nav className="sekmeler" role="tablist" aria-label="Araçlar">
        {SEKMELER.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={sekme === s.id} className={sekme === s.id ? 'secili' : ''} onClick={() => setSekme(s.id)}>
            {s.ad}
          </button>
        ))}
      </nav>

      {/* Sekmeler gizlenir ama kaldırılmaz; böylece sekme değiştirince yapıştırılan veri kaybolmaz. */}
      {SEKMELER.map(({ id, Bolum }) => (
        <main key={id} role="tabpanel" hidden={sekme !== id} className="panel">
          <Bolum />
        </main>
      ))}

      <footer>Tuğçe Ertürk · React + Vite · İşlemler tarayıcıda yapılır, içerik saklanmaz.</footer>
    </div>
  )
}
