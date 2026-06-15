import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SMAE_GROUPS = [
  { key: 'verdura', label: 'Verdura', icon: '🥦' },
  { key: 'fruta', label: 'Fruta', icon: '🍎' },
  { key: 'cereal', label: 'Cereal', icon: '🌽' },
  { key: 'leguminosa', label: 'Leguminosa', icon: '🥜' },
  { key: 'aoa', label: 'AOA', icon: '🥩' },
  { key: 'grasa', label: 'Grasa', icon: '🥑' },
  { key: 'leche', label: 'Leche', icon: '🥛' },
  { key: 'azucar', label: 'Azúcar', icon: '🍯' },
]

const MEAL_TIMES = [
  { key: 'desayuno', label: 'Desayuno', icon: '☀️' },
  { key: 'colacion_am', label: 'Colación AM', icon: '🍎' },
  { key: 'comida', label: 'Comida', icon: '🍽️' },
  { key: 'colacion_pm', label: 'Colación PM', icon: '🥜' },
  { key: 'cena', label: 'Cena', icon: '🌙' },
]

export default function PatientPage({ profile }) {
  const [tab, setTab] = useState('inicio')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [logs, setLogs] = useState([])
  const [descripcionManual, setDescripcionManual] = useState('')
  const [planItems, setPlanItems] = useState([])
  const [activePlanItem, setActivePlanItem] = useState(null)
  const fileRef = useRef()

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    const { data: planData } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('patient_id', profile.id)
      .eq('active', true)
      .maybeSingle()

    if (planData) {
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', planData.id)
        .order('sort_order')
      setPlanItems(items || [])
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function analyzePhoto(file) {
    setAnalyzing(true)
    setResult(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      setPhoto(e.target.result)
      try {
        const res = await fetch('/.netlify/functions/claude-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
                { type: 'text', text: `Eres un nutriólogo experto. Analiza esta foto de comida con mucha precisión. Cuenta las porciones visibles, estima el tamaño de cada una, e identifica todos los ingredientes.
Responde SOLO en JSON sin backticks:
{"descripcion":"nombre exacto con cantidad estimada","calorias":380,"proteina_g":25,"carbos_g":40,"grasa_g":12,"sodio_mg":600,"colesterol_mg":80,"confianza":"alta|media|baja","nota":"observación sobre porción"}
Si no es comida: {"error":"No es comida"}` }
              ]
            }]
          })
        })
        const data = await res.json()
        const parsed = JSON.parse(data.content[0].text)
        setResult(parsed)
      } catch (e) {
        setResult({ error: 'Error al analizar la imagen' })
      }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function analyzeText() {
    setAnalyzing(true)
    setResult(null)
    try {
      const res = await fetch('/.netlify/functions/claude-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Eres un nutriólogo experto. Analiza esta descripción de comida con precisión y estima los valores nutricionales reales para las cantidades mencionadas.
Responde SOLO en JSON sin backticks:
{"descripcion":"nombre con cantidad","calorias":380,"proteina_g":25,"carbos_g":40,"grasa_g":12,"sodio_mg":600,"colesterol_mg":80,"confianza":"alta|media|baja","nota":"observación breve"}

Descripción: ${descripcionManual}`
          }]
        })
      })
      const data = await res.json()
      const parsed = JSON.parse(data.content[0].text)
      setResult(parsed)
    } catch (e) {
      setResult({ error: 'Error al analizar' })
    }
    setAnalyzing(false)
  }

  async function saveLog() {
    if (!result || result.error) return
    await supabase.from('food_logs').insert({
      user_id: profile.id,
      meal_type: 'almuerzo',
      description: result.descripcion,
      calories: result.calorias,
      protein_g: result.proteina_g,
      carbs_g: result.carbos_g,
      fat_g: result.grasa_g,
      sodium_mg: result.sodio_mg,
      cholesterol_mg: result.colesterol_mg,
      is_estimated: true
    })
    setLogs([...logs, result])
    setResult(null)
    setPhoto(null)
    setDescripcionManual('')
    setTab('historial')
  }

  const totalCals = logs.reduce((sum, l) => sum + (l.calorias || 0), 0)
  const meta = profile?.daily_calories || 1800
  const pct = Math.min(100, Math.round((totalCals / meta) * 100))
  const nombre = profile?.full_name?.split(' ')[0] || 'tú'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-lg">🥗</div>
          <div>
            <p className="text-sm font-bold text-gray-900">MeCuido</p>
            <p className="text-xs text-gray-400">Hola, {nombre}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">
          Salir
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-5 pb-24">

        {/* INICIO */}
        {tab === 'inicio' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Calorías de hoy</p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-extrabold text-emerald-700">{totalCals}</span>
                <span className="text-sm text-gray-400">/ {meta} kcal</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : 'bg-emerald-600'}`} style={{width:`${pct}%`}}/>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">{pct}% de tu meta</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Proteína', val:logs.reduce((s,l)=>s+(l.proteina_g||0),0), meta:'62g', color:'text-blue-500'},
                {label:'Carbos', val:logs.reduce((s,l)=>s+(l.carbos_g||0),0), meta:'220g', color:'text-amber-500'},
                {label:'Grasa', val:logs.reduce((s,l)=>s+(l.grasa_g||0),0), meta:'60g', color:'text-red-500'},
              ].map(m => (
                <div key={m.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                  <p className={`text-xl font-extrabold ${m.color}`}>{m.val}<span className="text-xs">g</span></p>
                  <p className="text-xs text-gray-500 font-semibold">{m.label}</p>
                  <p className="text-xs text-gray-300">meta {m.meta}</p>
                </div>
              ))}
            </div>

            {logs.length === 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="font-bold text-emerald-700 mb-1">Registra tu primera comida</p>
                <p className="text-sm text-gray-500 mb-4">Toma una foto o describe lo que comiste</p>
                <button onClick={() => setTab('registrar')}
                  className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-sm">
                  Registrar ahora
                </button>
              </div>
            )}
          </div>
        )}

        {/* MI PLAN */}
        {tab === 'plan' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-900">Mi plan de hoy</h2>

            {planItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-3xl mb-2">📋</p>
                <p className="font-bold text-gray-400">Sin plan asignado</p>
                <p className="text-sm text-gray-300 mt-1">Tu nutriólogo aún no ha creado tu plan</p>
              </div>
            ) : (
              planItems.map(item => {
                const mt = MEAL_TIMES.find(m => m.key === item.meal_time)
                const isOpen = activePlanItem === item.id
                const groups = SMAE_GROUPS.filter(g => parseFloat(item[g.key]) > 0)
                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setActivePlanItem(isOpen ? null : item.id)}
                      className="w-full flex justify-between items-center px-4 py-4 text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mt?.icon}</span>
                        <div>
                          <p className="font-bold text-gray-900">{item.meal_time_label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {groups.map(g => `${item[g.key]} ${g.label}`).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-300">{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                        {/* Equivalentes */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {groups.map(g => (
                            <div key={g.key} className="bg-gray-50 rounded-xl p-2 text-center">
                              <p className="text-xl">{g.icon}</p>
                              <p className="text-base font-extrabold text-emerald-700">{item[g.key]}</p>
                              <p className="text-xs text-gray-400">{g.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Receta */}
                        {item.recipe_text && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Receta sugerida</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{item.recipe_text}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* REGISTRAR */}
        {tab === 'registrar' && (
          <div className="flex flex-col gap-4">
            <input type="file" accept="image/*" id="foto-input" ref={fileRef} className="hidden"
              onChange={e => { const f = e.target.files[0]; if(f){ analyzePhoto(f) } }}/>

            {!photo && !analyzing && (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <label htmlFor="foto-input" className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-700 rounded-xl text-white font-bold text-base cursor-pointer">
                    <span className="text-xl">📸</span> Tomar foto
                  </label>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">O describe tu comida</p>
                  <textarea
                    placeholder="Ej: 2 tacos de pastor con tortilla de maíz, cebolla y cilantro"
                    value={descripcionManual}
                    onChange={e => setDescripcionManual(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm outline-none resize-none focus:border-emerald-500"
                  />
                  <button onClick={analyzeText} disabled={!descripcionManual.trim()}
                    className={`w-full mt-3 py-3 rounded-xl font-bold text-sm transition ${descripcionManual.trim() ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    Analizar
                  </button>
                </div>
              </>
            )}

            {analyzing && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {photo && <img src={photo} alt="plato" className="w-full max-h-52 object-cover"/>}
                <div className="p-8 text-center">
                  <div className="w-10 h-10 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderWidth:3,borderStyle:'solid'}}/>
                  <p className="font-bold text-emerald-700">Analizando tu comida...</p>
                  <p className="text-sm text-gray-400 mt-1">Esto toma unos segundos</p>
                </div>
              </div>
            )}

            {result && !result.error && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {photo && <img src={photo} alt="plato" className="w-full max-h-52 object-cover"/>}
                <div className="p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">
                    {photo ? 'IA detectó' : 'IA calculó'}
                  </p>
                  <p className="text-lg font-bold text-gray-900 mb-4">{result.descripcion}</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      {label:'Calorías', val:result.calorias, unit:'kcal', color:'text-emerald-700'},
                      {label:'Proteína', val:result.proteina_g, unit:'g', color:'text-blue-500'},
                      {label:'Carbos', val:result.carbos_g, unit:'g', color:'text-amber-500'},
                      {label:'Grasa', val:result.grasa_g, unit:'g', color:'text-red-500'},
                    ].map(n => (
                      <div key={n.label} className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className={`text-base font-extrabold ${n.color}`}>{n.val}<span className="text-xs">{n.unit}</span></p>
                        <p className="text-xs text-gray-400">{n.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Variación estimada 15-25% · Confianza: {result.confianza}</p>
                  <div className="flex gap-3">
                    <button onClick={() => {setPhoto(null);setResult(null)}}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl text-sm">
                      Ajustar
                    </button>
                    <button onClick={saveLog}
                      className="flex-[2] py-3 bg-emerald-700 text-white font-bold rounded-xl text-sm">
                      Confirmar ✓
                    </button>
                  </div>
                </div>
              </div>
            )}

            {result?.error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                <p className="text-2xl mb-2">⚠️</p>
                <p className="text-red-600 font-bold mb-3">{result.error}</p>
                <button onClick={() => {setPhoto(null);setResult(null)}}
                  className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 text-sm">
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div className="flex flex-col gap-3">
            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-3xl mb-2">📋</p>
                <p className="font-bold text-gray-400">Sin registros todavía</p>
                <p className="text-sm text-gray-300 mt-1">Tus comidas de hoy aparecerán aquí</p>
              </div>
            ) : logs.map((log, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{log.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.proteina_g}g prot · {log.carbos_g}g carbos · {log.grasa_g}g grasa</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-emerald-700">{log.calorias}</p>
                  <p className="text-xs text-gray-400">kcal</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex pb-5 pt-2 z-10">
        {[
          {id:'inicio', icon:'🏠', label:'Inicio'},
          {id:'plan', icon:'📋', label:'Mi Plan'},
          {id:'registrar', icon:'📸', label:'Registrar'},
          {id:'historial', icon:'📊', label:'Historial'},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer py-1">
            <span className="text-xl">{t.icon}</span>
            <span className={`text-xs ${tab===t.id ? 'font-bold text-emerald-700' : 'font-medium text-gray-400'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}