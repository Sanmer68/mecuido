import { useState, useEffect } from 'react'
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
  const [logs, setLogs] = useState([])
  const [descripcionManual, setDescripcionManual] = useState('')
  const [calorias, setCalorias] = useState('')
  const [planItems, setPlanItems] = useState([])
  const [activePlanItem, setActivePlanItem] = useState(null)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    const { data: planData } = await supabase
      .from('meal_plans').select('*')
      .eq('patient_id', profile.id).eq('active', true).maybeSingle()

    if (planData) {
      const { data: items } = await supabase
        .from('meal_plan_items').select('*')
        .eq('meal_plan_id', planData.id).order('sort_order')
      setPlanItems(items || [])
    }
  }

  async function handleLogout() { await supabase.auth.signOut() }

  async function saveLog() {
    if (!descripcionManual.trim()) return
    const cal = parseInt(calorias) || 0
    await supabase.from('food_logs').insert({
      user_id: profile.id,
      meal_type: 'almuerzo',
      description: descripcionManual,
      calories: cal,
      is_estimated: false
    })
    setLogs([...logs, { descripcion: descripcionManual, calorias: cal }])
    setDescripcionManual('')
    setCalorias('')
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
        <button onClick={handleLogout} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">Salir</button>
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

            {planItems.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-emerald-700 text-sm">Tu plan está listo 📋</p>
                  <p className="text-xs text-gray-500 mt-0.5">Tu nutriólogo asignó tu plan de hoy</p>
                </div>
                <button onClick={() => setTab('plan')}
                  className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl text-xs">
                  Ver plan
                </button>
              </div>
            )}

            {logs.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="font-bold text-gray-600 mb-1">Sin registros hoy</p>
                <p className="text-sm text-gray-400 mb-4">Lleva el control de lo que comes</p>
                <button onClick={() => setTab('registrar')}
                  className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-sm">
                  Registrar comida
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map((log, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
                    <p className="font-semibold text-gray-900 text-sm">{log.descripcion}</p>
                    {log.calorias > 0 && (
                      <div className="text-right">
                        <p className="text-base font-extrabold text-emerald-700">{log.calorias}</p>
                        <p className="text-xs text-gray-400">kcal</p>
                      </div>
                    )}
                  </div>
                ))}
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
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {groups.map(g => (
                            <div key={g.key} className="bg-gray-50 rounded-xl p-2 text-center">
                              <p className="text-xl">{g.icon}</p>
                              <p className="text-base font-extrabold text-emerald-700">{item[g.key]}</p>
                              <p className="text-xs text-gray-400">{g.label}</p>
                            </div>
                          ))}
                        </div>

                        {item.recipe_text && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Receta de tu nutriólogo</p>
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
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">¿Qué comiste?</p>
              <textarea
                placeholder="Ej: 2 tacos de pastor con tortilla de maíz, agua de Jamaica..."
                value={descripcionManual}
                onChange={e => setDescripcionManual(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm outline-none resize-none focus:border-emerald-500 mb-3"
              />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Calorías aproximadas (opcional)</p>
              <input
                type="number"
                placeholder="Ej: 350"
                value={calorias}
                onChange={e => setCalorias(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm outline-none focus:border-emerald-500 mb-4"
              />
              <button onClick={saveLog} disabled={!descripcionManual.trim()}
                className={`w-full py-3 rounded-xl font-bold text-sm transition ${descripcionManual.trim() ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                Guardar registro
              </button>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-900">Mi historial de hoy</h2>
            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-3xl mb-2">📋</p>
                <p className="font-bold text-gray-400">Sin registros todavía</p>
                <p className="text-sm text-gray-300 mt-1">Tus comidas de hoy aparecerán aquí</p>
              </div>
            ) : logs.map((log, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
                <p className="font-semibold text-gray-900 text-sm flex-1">{log.descripcion}</p>
                {log.calorias > 0 && (
                  <div className="text-right ml-3">
                    <p className="text-lg font-extrabold text-emerald-700">{log.calorias}</p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                )}
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
          {id:'registrar', icon:'✏️', label:'Registrar'},
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