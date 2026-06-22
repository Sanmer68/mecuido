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

const emptyPatientForm = () => ({
  full_name: '', email: '', password: '',
  weight_kg: '', height_cm: '', age: '', sex: 'female',
  activity_level: 'moderate', goal: 'maintain'
})

async function callClaude(prompt) {
  const res = await fetch('/.netlify/functions/claude-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await res.json()
  return data.content[0].text
}

function calcCalories(form) {
  const w = parseFloat(form.weight_kg)
  const h = parseFloat(form.height_cm)
  const a = parseInt(form.age)
  if (!w || !h || !a) return 0
  let bmr = form.sex === 'female'
    ? 447.6 + (9.25 * w) + (3.1 * h) - (4.33 * a)
    : 88.36 + (13.4 * w) + (4.8 * h) - (5.7 * a)
  const factors = { sedentary: 1.2, moderate: 1.55, active: 1.725, very_active: 1.9 }
  let tdee = bmr * factors[form.activity_level]
  if (form.goal === 'lose') tdee -= 500
  if (form.goal === 'gain') tdee += 300
  return Math.round(tdee)
}

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
  const [suggestionOptions, setSuggestionOptions] = useState({})
  const [selectedOptions, setSelectedOptions] = useState({})
  const [loadingSuggestion, setLoadingSuggestion] = useState(null)
  const [loadingRecipe, setLoadingRecipe] = useState(null)

  // Nuevo paciente
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [patientForm, setPatientForm] = useState(emptyPatientForm())
  const [savingPatient, setSavingPatient] = useState(false)
  const [patientError, setPatientError] = useState('')

  useEffect(() => { loadPatients() }, [])

  async function loadPatients() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('role', 'patient')
    setPatients(data || [])
    setLoading(false)
  }

  async function registerPatient() {
    if (!patientForm.full_name || !patientForm.email || !patientForm.password) {
      setPatientError('Nombre, correo y contraseña son obligatorios')
      return
    }
    setSavingPatient(true)
    setPatientError('')

    const calories = calcCalories(patientForm)

    const { data, error } = await supabase.auth.admin
      ? null // admin API no disponible en cliente
      : { data: null, error: { message: 'use_signup' } }

    // Usamos signUp normal — el paciente recibirá el correo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: patientForm.email,
      password: patientForm.password,
      options: { data: { full_name: patientForm.full_name } }
    })

    if (authError) {
      setPatientError(authError.message)
      setSavingPatient(false)
      return
    }

    if (authData.user) {
      await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: patientForm.full_name,
        email: patientForm.email,
        role: 'patient',
        weight_kg: parseFloat(patientForm.weight_kg) || null,
        height_cm: parseFloat(patientForm.height_cm) || null,
        age: parseInt(patientForm.age) || null,
        sex: patientForm.sex,
        activity_level: patientForm.activity_level,
        goal: patientForm.goal,
        daily_calories: calories || null
      })
    }

    setSavingPatient(false)
    setShowNewPatient(false)
    setPatientForm(emptyPatientForm())
    await loadPatients()
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
    setSuggestionOptions({})
    setSelectedOptions({})

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

  async function getSuggestionOptions(item) {
    const itemKey = item._local_id || item.id
    setLoadingSuggestion(itemKey)

    const grupos = SMAE_GROUPS
      .filter(g => parseFloat(item[g.key]) > 0)
      .map(g => `{"grupo":"${g.label}","cantidad":${item[g.key]}}`)
      .join(',')

    const contexto = [
      clinicalProfile.alergias ? `Alergias: ${clinicalProfile.alergias}` : '',
      clinicalProfile.condiciones ? `Condiciones: ${clinicalProfile.condiciones}` : '',
      clinicalProfile.notas_clinicas ? `Notas: ${clinicalProfile.notas_clinicas}` : '',
    ].filter(Boolean).join('. ')

    try {
      const text = await callClaude(`Eres experto en SMAE (Sistema Mexicano de Alimentos Equivalentes).

Para el tiempo "${item.meal_time_label}" con estos equivalentes: [${grupos}].
Perfil del paciente: ${contexto || 'Sin restricciones'}.

Devuelve SOLO un JSON sin backticks con esta estructura exacta:
{
  "advertencia": "texto si hay restricción crítica o null",
  "grupos": [
    {
      "grupo": "Verdura",
      "icono": "🥦",
      "cantidad": 0.5,
      "opciones": [
        {"nombre": "Jitomate", "cantidad": "½ mediano", "gramos": 90, "apto": true},
        {"nombre": "Cebolla", "cantidad": "¼ taza", "gramos": 40, "apto": true},
        {"nombre": "Espinaca", "cantidad": "1 taza", "gramos": 30, "apto": true},
        {"nombre": "Calabacita", "cantidad": "½ pieza", "gramos": 80, "apto": true}
      ]
    }
  ]
}
Da exactamente 4 opciones por grupo. Marca apto:false si no es recomendable para el perfil del paciente.`)

      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setSuggestionOptions(prev => ({ ...prev, [itemKey]: parsed }))
      const initSelected = {}
      parsed.grupos.forEach(g => {
        const primera = g.opciones.find(o => o.apto)
        if (primera) initSelected[g.grupo] = primera
      })
      setSelectedOptions(prev => ({ ...prev, [itemKey]: initSelected }))
    } catch (e) {
      alert('Error al generar sugerencias.')
    }
    setLoadingSuggestion(null)
  }

  async function generateRecipe(item, index) {
    const itemKey = item._local_id || item.id
    const selected = selectedOptions[itemKey]
    if (!selected) return
    setLoadingRecipe(itemKey)

    const seleccionados = Object.entries(selected)
      .map(([grupo, opcion]) => `${grupo}: ${opcion.nombre} ${opcion.cantidad} (${opcion.gramos}g)`)
      .join(', ')

    const contexto = [
      clinicalProfile.alergias ? `Alergias: ${clinicalProfile.alergias}` : '',
      clinicalProfile.condiciones ? `Condiciones: ${clinicalProfile.condiciones}` : '',
      clinicalProfile.notas_clinicas ? `Notas: ${clinicalProfile.notas_clinicas}` : '',
    ].filter(Boolean).join('. ')

    try {
      const text = await callClaude(`Eres nutriólogo experto. El paciente tiene: ${contexto || 'sin restricciones'}.

Para el ${item.meal_time_label} se seleccionaron: ${seleccionados}.

Escribe una receta práctica y apetitosa para el paciente mexicano usando EXACTAMENTE esos ingredientes y cantidades. Incluye preparación breve. Tono amigable. Máximo 80 palabras. Solo la receta, sin formato markdown, sin asteriscos, sin hashtags.`)

      updateItem(index, 'recipe_text', text)
      setSuggestionOptions(prev => { const n = {...prev}; delete n[itemKey]; return n })
      setSelectedOptions(prev => { const n = {...prev}; delete n[itemKey]; return n })
    } catch (e) {
      alert('Error al generar receta.')
    }
    setLoadingRecipe(null)
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
  const inpCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-emerald-500"
  const selCls = inpCls + " cursor-pointer"

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
        {tab === 'pacientes' && !showNewPatient && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Mis pacientes</h2>
              <button onClick={() => setShowNewPatient(true)}
                className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1">
                + Agregar
              </button>
            </div>

            {loading ? (
              <p className="text-gray-400 text-center py-10">Cargando...</p>
            ) : patients.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-3xl mb-2">👤</p>
                <p className="font-bold text-gray-400">Sin pacientes registrados</p>
                <p className="text-sm text-gray-300 mt-1">Agrega tu primer paciente</p>
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

        {/* NUEVO PACIENTE */}
        {showNewPatient && (
          <div>
            <button onClick={() => { setShowNewPatient(false); setPatientError('') }}
              className="text-emerald-700 text-sm font-semibold mb-4 flex items-center gap-1">
              ← Pacientes
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nuevo paciente</h2>

            {patientError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-red-600 text-sm">{patientError}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Datos de acceso</p>
                <input placeholder="Nombre completo *" value={patientForm.full_name}
                  onChange={e => setPatientForm({...patientForm, full_name: e.target.value})} className={inpCls}/>
                <input type="email" placeholder="Correo electrónico *" value={patientForm.email}
                  onChange={e => setPatientForm({...patientForm, email: e.target.value})} className={inpCls}/>
                <input type="password" placeholder="Contraseña temporal *" value={patientForm.password}
                  onChange={e => setPatientForm({...patientForm, password: e.target.value})} className={inpCls}/>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Datos físicos</p>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Peso (kg)" type="number" value={patientForm.weight_kg}
                    onChange={e => setPatientForm({...patientForm, weight_kg: e.target.value})} className={inpCls}/>
                  <input placeholder="Altura (cm)" type="number" value={patientForm.height_cm}
                    onChange={e => setPatientForm({...patientForm, height_cm: e.target.value})} className={inpCls}/>
                </div>
                <input placeholder="Edad" type="number" value={patientForm.age}
                  onChange={e => setPatientForm({...patientForm, age: e.target.value})} className={inpCls}/>
                <select value={patientForm.sex} onChange={e => setPatientForm({...patientForm, sex: e.target.value})} className={selCls}>
                  <option value="female">Mujer</option>
                  <option value="male">Hombre</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Objetivo</p>
                <select value={patientForm.activity_level} onChange={e => setPatientForm({...patientForm, activity_level: e.target.value})} className={selCls}>
                  <option value="sedentary">Sedentario</option>
                  <option value="moderate">Moderado (3-5 días/semana)</option>
                  <option value="active">Activo (6-7 días/semana)</option>
                  <option value="very_active">Muy activo</option>
                </select>
                <select value={patientForm.goal} onChange={e => setPatientForm({...patientForm, goal: e.target.value})} className={selCls}>
                  <option value="lose">Bajar de peso</option>
                  <option value="maintain">Mantener peso</option>
                  <option value="gain">Subir masa muscular</option>
                </select>

                {patientForm.weight_kg && patientForm.height_cm && patientForm.age && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Meta calórica calculada</p>
                    <p className="text-2xl font-extrabold text-emerald-700">{calcCalories(patientForm)} <span className="text-sm font-normal text-gray-400">kcal/día</span></p>
                  </div>
                )}
              </div>

              <button onClick={registerPatient} disabled={savingPatient}
                className="w-full py-4 bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-base">
                {savingPatient ? 'Registrando...' : 'Registrar paciente ✓'}
              </button>
            </div>
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
              <p className="font-bold text-gray-900">{selectedPatient.full_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPatient.daily_calories} kcal/día · {selectedPatient.goal === 'lose' ? 'Bajar peso' : selectedPatient.goal === 'gain' ? 'Subir masa muscular' : 'Mantener peso'}
              </p>
            </div>

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

            {subTab === 'perfil' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Alergias e intolerancias</p>
                  <textarea placeholder="Ej: Intolerancia a la lactosa, alergia al gluten..."
                    value={clinicalProfile.alergias}
                    onChange={e => setClinicalProfile({ ...clinicalProfile, alergias: e.target.value })}
                    rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"/>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Condiciones médicas</p>
                  <textarea placeholder="Ej: Diabetes tipo 2, hipertensión, colesterol alto..."
                    value={clinicalProfile.condiciones}
                    onChange={e => setClinicalProfile({ ...clinicalProfile, condiciones: e.target.value })}
                    rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"/>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notas clínicas</p>
                  <textarea placeholder="Ej: No le gusta el pescado, vegetariano, trabaja de noche..."
                    value={clinicalProfile.notas_clinicas}
                    onChange={e => setClinicalProfile({ ...clinicalProfile, notas_clinicas: e.target.value })}
                    rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"/>
                </div>
                <button onClick={saveClinicalProfile} disabled={savingProfile}
                  className="w-full py-4 bg-emerald-700 text-white font-bold rounded-2xl shadow-md">
                  {savingProfile ? 'Guardando...' : 'Guardar perfil clínico ✓'}
                </button>
              </div>
            )}

            {subTab === 'plan' && (
              <div>
                {!plan ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="font-bold text-emerald-700 mb-2">Sin plan asignado</p>
                    <p className="text-sm text-gray-500 mb-4">Crea el primer plan de equivalentes para este paciente</p>
                    <button onClick={createPlan} className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-sm">Crear plan</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
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

                    {items.map((item, index) => {
                      const mt = MEAL_TIMES.find(m => m.key === item.meal_time)
                      const itemKey = item._local_id || item.id
                      const isOpen = activeItem === itemKey
                      const options = suggestionOptions[itemKey]
                      const selected = selectedOptions[itemKey] || {}
                      const isLoadingSugg = loadingSuggestion === itemKey
                      const isLoadingRec = loadingRecipe === itemKey

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

                              {!options && !isLoadingSugg && (
                                <button onClick={() => getSuggestionOptions(item)}
                                  className="w-full py-2.5 mb-3 bg-violet-50 border border-violet-200 text-violet-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
                                  💡 Pedir opciones de alimentos a IA
                                </button>
                              )}

                              {isLoadingSugg && (
                                <div className="bg-violet-50 rounded-xl p-4 text-center mb-3">
                                  <div className="w-6 h-6 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{borderWidth:2,borderStyle:'solid'}}/>
                                  <p className="text-sm text-violet-600 font-medium">Generando opciones personalizadas...</p>
                                </div>
                              )}

                              {options && (
                                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-3">
                                  <div className="flex justify-between items-center mb-3">
                                    <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">💡 Selecciona alimentos</p>
                                    <button onClick={() => setSuggestionOptions(prev => { const n={...prev}; delete n[itemKey]; return n })}
                                      className="text-xs text-gray-400">✕</button>
                                  </div>

                                  {options.advertencia && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                                      <p className="text-xs text-amber-700 font-semibold">⚠️ {options.advertencia}</p>
                                    </div>
                                  )}

                                  <div className="flex flex-col gap-4 mb-4">
                                    {options.grupos.map(grupo => (
                                      <div key={grupo.grupo}>
                                        <p className="text-xs font-bold text-gray-600 mb-2">{grupo.icono} {grupo.grupo} ({grupo.cantidad} equiv.)</p>
                                        <div className="flex flex-col gap-1.5">
                                          {grupo.opciones.map(opcion => {
                                            const isSelected = selected[grupo.grupo]?.nombre === opcion.nombre
                                            return (
                                              <button key={opcion.nombre}
                                                onClick={() => {
                                                  if (!opcion.apto) return
                                                  setSelectedOptions(prev => ({
                                                    ...prev,
                                                    [itemKey]: { ...prev[itemKey], [grupo.grupo]: opcion }
                                                  }))
                                                }}
                                                className={`flex justify-between items-center px-3 py-2 rounded-lg text-left text-sm transition ${
                                                  !opcion.apto
                                                    ? 'bg-red-50 border border-red-100 text-red-400 cursor-not-allowed opacity-60'
                                                    : isSelected
                                                    ? 'bg-violet-600 text-white border border-violet-600'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300'
                                                }`}>
                                                <span className="font-medium">{opcion.nombre}</span>
                                                <span className={`text-xs ${isSelected ? 'text-violet-200' : 'text-gray-400'}`}>
                                                  {opcion.cantidad} · {opcion.gramos}g {!opcion.apto && '· No recomendado'}
                                                </span>
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <button onClick={() => generateRecipe(item, index)} disabled={isLoadingRec}
                                    className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                                    {isLoadingRec ? (
                                      <>
                                        <div className="w-4 h-4 border-white border-t-transparent rounded-full animate-spin" style={{borderWidth:2,borderStyle:'solid'}}/>
                                        Generando receta...
                                      </>
                                    ) : '✨ Generar receta con selección'}
                                  </button>
                                </div>
                              )}

                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Receta para el paciente</p>
                              <textarea
                                placeholder="Escribe o ajusta la receta que verá el paciente..."
                                value={item.recipe_text}
                                onChange={e => updateItem(index, 'recipe_text', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"
                              />
                              <button onClick={() => removeItem(index)} className="mt-2 text-xs text-red-400 font-semibold">
                                Eliminar este tiempo de comida
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

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