import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SMAE_GROUPS = [
  { key: 'verdura', label: 'Verdura', icon: '🥦', color: 'text-green-600' },
  { key: 'fruta', label: 'Fruta', icon: '🍎', color: 'text-red-500' },
  { key: 'cereal', label: 'Cereal', icon: '🌽', color: 'text-yellow-500' },
  { key: 'leguminosa', label: 'Leguminosa', icon: '🥜', color: 'text-amber-700' },
  { key: 'aoa', label: 'AOA', icon: '🥩', color: 'text-rose-500' },
  { key: 'grasa', label: 'Grasa', icon: '🥑', color: 'text-lime-600' },
  { key: 'leche', label: 'Leche', icon: '🥛', color: 'text-blue-400' },
  { key: 'azucar', label: 'Azúcar', icon: '🍯', color: 'text-orange-400' },
]

const MEAL_TIMES = [
  { key: 'desayuno', label: 'Desayuno', icon: '☀️' },
  { key: 'colacion_am', label: 'Colación AM', icon: '🍎' },
  { key: 'comida', label: 'Comida', icon: '🍽️' },
  { key: 'colacion_pm', label: 'Colación PM', icon: '🥜' },
  { key: 'cena', label: 'Cena', icon: '🌙' },
]

const emptyItem = () => ({
  meal_time: '', meal_time_label: '',
  verdura: 0, fruta: 0, cereal: 0, leguminosa: 0,
  aoa: 0, grasa: 0, leche: 0, azucar: 0,
  recipe_text: '', sort_order: 0
})

export default function NutritionistPage({ profile }) {
  const [tab, setTab] = useState('pacientes')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [clinicalProfile, setClinicalProfile] = useState({ alergias: '', condiciones: '', notas_clinicas: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeItem, setActiveItem] = useState(null)
  const [subTab, setSubTab] = useState('perfil')
  const [suggestions, setSuggestions] = useState({})
  const [loadingSuggestion, setLoadingSuggestion] = useState(null)

  useEffect(() => { loadPatients() }, [])

  async function loadPatients() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('role', 'patient')
    setPatients(data || [])
    setLoading(false)
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient)
    setClinicalProfile({
      alergias: patient.alergias || '',
      condiciones: patient.condiciones || '',
      notas_clinicas: patient.notas_clinicas || ''
    })
    setTab('plan')
    setSubTab('perfil')
    setItems([])
    setPlan(null)
    setActiveItem(null)
    setSuggestions({})

    const { data: planData } = await supabase
      .from('meal_plans').select('*')
      .eq('patient_id', patient.id).eq('active', true).maybeSingle()

    if (planData) {
      setPlan(planData)
      const { data: itemsData } = await supabase
        .from('meal_plan_items').select('*')
        .eq('meal_plan_id', planData.id).order('sort_order')
      setItems(itemsData || [])
    }
  }

  async function saveClinicalProfile() {
    setSavingProfile(true)
    await supabase.from('profiles').update({
      alergias: clinicalProfile.alergias,
      condiciones: clinicalProfile.condiciones,
      notas_clinicas: clinicalProfile.notas_clinicas
    }).eq('id', selectedPatient.id)
    setSavingProfile(false)
    alert('Perfil clínico guardado ✓')
  }

  async function createPlan() {
    const { data } = await supabase.from('meal_plans').insert({
      patient_id: selectedPatient.id,
      nutritionist_id: profile.id,
      name: 'Plan actual', active: true
    }).select().single()
    setPlan(data)
    setItems([])
  }

  function addMealTime(mealTimeKey) {
    if (items.some(i => i.meal_time === mealTimeKey)) return
    const mt = MEAL_TIMES.find(m => m.key === mealTimeKey)
    const newItem = { ...emptyItem(), meal_time: mealTimeKey, meal_time_label: mt.label, sort_order: items.length, _local_id: Date.now() }
    const newItems = [...items, newItem].sort((a, b) => {
      const order = MEAL_TIMES.map(m => m.key)
      return order.indexOf(a.meal_time) - order.indexOf(b.meal_time)
    })
    setItems(newItems)
    setActiveItem(newItem._local_id)
  }

  function updateItem(index, field, value) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
    setActiveItem(null)
  }

  async function getSuggestions(item, index) {
    const itemKey = item._local_id || item.id
    setLoadingSuggestion(itemKey)

    const grupos = SMAE_GROUPS
      .filter(g => parseFloat(item[g.key]) > 0)
      .map(g => `${item[g.key]} equivalente(s) de ${g.label}`)
      .join(', ')

    const contexto = [
      clinicalProfile.alergias ? `Alergias e intolerancias: ${clinicalProfile.alergias}` : '',
      clinicalProfile.condiciones ? `Condiciones médicas: ${clinicalProfile.condiciones}` : '',
      clinicalProfile.notas_clinicas ? `Notas clínicas: ${clinicalProfile.notas_clinicas}` : '',
    ].filter(Boolean).join('. ')

    try {
      const res = await fetch('/.netlify/functions/claude-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Eres un asistente de nutrición clínica experto en el Sistema Mexicano de Alimentos Equivalentes (SMAE).

El nutriólogo está elaborando el plan para "${item.meal_time_label}" con: ${grupos}.

Perfil del paciente: ${contexto || 'Sin restricciones especiales'}.

Sugiere 2-3 opciones concretas de alimentos mexicanos para cubrir cada equivalente del plan, considerando el perfil clínico. Sé específico con cantidades. Si hay restricciones importantes, adviértelas claramente.

El nutriólogo tomará la decisión final. Responde en español, de forma concisa y práctica. Máximo 120 palabras.`
          }]
        })
      })
      const data = await res.json()
      const text = data.content[0].text
      setSuggestions(prev => ({ ...prev, [itemKey]: text }))
    } catch (e) {
      setSuggestions(prev => ({ ...prev, [itemKey]: 'Error al generar sugerencias.' }))
    }
    setLoadingSuggestion(null)
  }

  async function useSuggestion(suggestion, index) {
    updateItem(index, 'recipe_text', suggestion)
    const itemKey = items[index]._local_id || items[index].id
    setSuggestions(prev => { const n = {...prev}; delete n[itemKey]; return n })
  }

  async function savePlan() {
    if (!plan) return
    setSaving(true)
    await supabase.from('meal_plan_items').delete().eq('meal_plan_id', plan.id)
    const toInsert = items.map((item, i) => ({
      meal_plan_id: plan.id,
      meal_time: item.meal_time,
      meal_time_label: item.meal_time_label,
      verdura: parseFloat(item.verdura) || 0,
      fruta: parseFloat(item.fruta) || 0,
      cereal: parseFloat(item.cereal) || 0,
      leguminosa: parseFloat(item.leguminosa) || 0,
      aoa: parseFloat(item.aoa) || 0,
      grasa: parseFloat(item.grasa) || 0,
      leche: parseFloat(item.leche) || 0,
      azucar: parseFloat(item.azucar) || 0,
      recipe_text: item.recipe_text || '',
      sort_order: i
    }))
    if (toInsert.length > 0) await supabase.from('meal_plan_items').insert(toInsert)
    setSaving(false)
    alert('Plan guardado ✓')
  }

  async function handleLogout() { await supabase.auth.signOut() }

  const totals = SMAE_GROUPS.reduce((acc, g) => {
    acc[g.key] = items.reduce((s, item) => s + (parseFloat(item[g.key]) || 0), 0)
    return acc
  }, {})

  const usedMealTimes = items.map(i => i.meal_time)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-lg">🥗</div>
          <div>
            <p className="text-sm font-bold text-gray-900">MeCuido</p>
            <p className="text-xs text-gray-400">Nutriólogo/a</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">Salir</button>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 pb-10">

        {/* PACIENTES */}
        {tab === 'pacientes' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Mis pacientes</h2>
            {loading ? (
              <p className="text-gray-400 text-center py-10">Cargando...</p>
            ) : patients.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-3xl mb-2">👤</p>
                <p className="font-bold text-gray-400">Sin pacientes registrados</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {patients.map(p => (
                  <button key={p.id} onClick={() => selectPatient(p)}
                    className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center text-left w-full hover:shadow-md transition">
                    <div>
                      <p className="font-bold text-gray-900">{p.full_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.daily_calories} kcal/día · {p.goal === 'lose' ? 'Bajar peso' : p.goal === 'gain' ? 'Subir masa' : 'Mantener'}
                        {p.condiciones && <span className="ml-1 text-amber-500">· {p.condiciones}</span>}
                      </p>
                    </div>
                    <span className="text-gray-300 text-xl">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PLAN */}
        {tab === 'plan' && selectedPatient && (
          <div>
            <button onClick={() => { setTab('pacientes'); setSelectedPatient(null) }}
              className="text-emerald-700 text-sm font-semibold mb-4 flex items-center gap-1">
              ← Pacientes
            </button>

            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="font-bold text-gray-900 text-base">{selectedPatient.full_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPatient.daily_calories} kcal/día · {selectedPatient.goal === 'lose' ? 'Bajar peso' : selectedPatient.goal === 'gain' ? 'Subir masa muscular' : 'Mantener peso'}
              </p>
            </div>

            {/* SubTabs */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
              {[
                { id: 'perfil', label: '🩺 Perfil clínico' },
                { id: 'plan', label: '📋 Plan SMAE' },
              ].map(t => (
                <button key={t.id} onClick={() => setSubTab(t.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${subTab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* PERFIL CLINICO */}
            {subTab === 'perfil' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Alergias e intolerancias</p>
                  <textarea
                    placeholder="Ej: Intolerancia a la lactosa, alergia al gluten, alergia a mariscos..."
                    value={clinicalProfile.alergias}
                    onChange={e => setClinicalProfile({ ...clinicalProfile, alergias: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"
                  />
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Condiciones médicas</p>
                  <textarea
                    placeholder="Ej: Diabetes tipo 2, hipertensión, colesterol alto, hipotiroidismo..."
                    value={clinicalProfile.condiciones}
                    onChange={e => setClinicalProfile({ ...clinicalProfile, condiciones: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"
                  />
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notas clínicas</p>
                  <textarea
                    placeholder="Ej: No le gusta el pescado, vegetariano, trabaja de noche..."
                    value={clinicalProfile.notas_clinicas}
                    onChange={e => setClinicalProfile({ ...clinicalProfile, notas_clinicas: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"
                  />
                </div>
                <button onClick={saveClinicalProfile} disabled={savingProfile}
                  className="w-full py-4 bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-base">
                  {savingProfile ? 'Guardando...' : 'Guardar perfil clínico ✓'}
                </button>
              </div>
            )}

            {/* PLAN SMAE */}
            {subTab === 'plan' && (
              <div>
                {!plan ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="font-bold text-emerald-700 mb-2">Sin plan asignado</p>
                    <p className="text-sm text-gray-500 mb-4">Crea el primer plan de equivalentes para este paciente</p>
                    <button onClick={createPlan} className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-sm">
                      Crear plan
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">

                    {/* Totales */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Total del día</p>
                      <div className="grid grid-cols-4 gap-3">
                        {SMAE_GROUPS.map(g => (
                          <div key={g.key} className="text-center">
                            <p className="text-xl mb-1">{g.icon}</p>
                            <p className={`text-lg font-extrabold ${g.color}`}>{totals[g.key]}</p>
                            <p className="text-xs text-gray-400">{g.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tiempos */}
                    {items.map((item, index) => {
                      const mt = MEAL_TIMES.find(m => m.key === item.meal_time)
                      const itemKey = item._local_id || item.id
                      const isOpen = activeItem === itemKey
                      const hasSuggestion = suggestions[itemKey]
                      const isLoadingSuggestion = loadingSuggestion === itemKey

                      return (
                        <div key={itemKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                          <button onClick={() => setActiveItem(isOpen ? null : itemKey)}
                            className="w-full flex justify-between items-center px-4 py-3 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{mt?.icon}</span>
                              <span className="font-bold text-gray-900">{item.meal_time_label}</span>
                              <span className="text-xs text-gray-400">
                                {SMAE_GROUPS.filter(g => parseFloat(item[g.key]) > 0).map(g => `${item[g.key]} ${g.label}`).join(' · ')}
                              </span>
                            </div>
                            <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Equivalentes</p>
                              <div className="grid grid-cols-4 gap-3 mb-4">
                                {SMAE_GROUPS.map(g => (
                                  <div key={g.key} className="text-center">
                                    <p className="text-base mb-1">{g.icon}</p>
                                    <input type="number" min="0" step="0.5" value={item[g.key]}
                                      onChange={e => updateItem(index, g.key, e.target.value)}
                                      className="w-full text-center text-sm font-bold border border-gray-200 rounded-lg py-1.5 outline-none focus:border-emerald-500"/>
                                    <p className="text-xs text-gray-400 mt-1">{g.label}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Sugerencias IA */}
                              {!hasSuggestion && !isLoadingSuggestion && (
                                <button onClick={() => getSuggestions(item, index)}
                                  className="w-full py-2.5 mb-3 bg-violet-50 border border-violet-200 text-violet-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
                                  💡 Pedir sugerencias a IA
                                </button>
                              )}

                              {isLoadingSuggestion && (
                                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center mb-3">
                                  <div className="w-6 h-6 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{borderWidth:2,borderStyle:'solid'}}/>
                                  <p className="text-sm text-violet-600 font-medium">Generando sugerencias...</p>
                                </div>
                              )}

                              {hasSuggestion && (
                                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-3">
                                  <p className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-2">💡 Sugerencias IA — revisa antes de usar</p>
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">{hasSuggestion}</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => useSuggestion(hasSuggestion, index)}
                                      className="flex-1 py-2 bg-violet-600 text-white font-semibold rounded-lg text-xs">
                                      Usar como receta
                                    </button>
                                    <button onClick={() => getSuggestions(item, index)}
                                      className="flex-1 py-2 bg-white border border-violet-200 text-violet-600 font-semibold rounded-lg text-xs">
                                      Regenerar
                                    </button>
                                    <button onClick={() => setSuggestions(prev => { const n = {...prev}; delete n[itemKey]; return n })}
                                      className="px-3 py-2 bg-white border border-gray-200 text-gray-400 font-semibold rounded-lg text-xs">
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}

                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Receta para el paciente</p>
                              <textarea
                                placeholder="Escribe o ajusta la receta que verá el paciente..."
                                value={item.recipe_text}
                                onChange={e => updateItem(index, 'recipe_text', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"
                              />
                              <button onClick={() => removeItem(index)} className="mt-3 text-xs text-red-400 font-semibold">
                                Eliminar este tiempo de comida
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Agregar */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Agregar tiempo de comida</p>
                      <div className="flex flex-wrap gap-2">
                        {MEAL_TIMES.map(mt => {
                          const used = usedMealTimes.includes(mt.key)
                          return (
                            <button key={mt.key} onClick={() => addMealTime(mt.key)} disabled={used}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${used ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700'}`}>
                              <span>{mt.icon}</span> {mt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <button onClick={savePlan} disabled={saving}
                      className="w-full py-4 bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-base">
                      {saving ? 'Guardando...' : 'Guardar plan ✓'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}