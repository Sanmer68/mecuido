import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SMAE_GROUPS = [
  { key: 'verdura', label: 'Verdura', icon: '🥦', color: 'text-green-600' },
  { key: 'fruta', label: 'Fruta', icon: '🍎', color: 'text-red-500' },
  { key: 'cereal', label: 'Cereal', icon: '🌽', color: 'text-yellow-500' },
  { key: 'leguminosa', label: 'Leguminosa', icon: '🫘', color: 'text-amber-700' },
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
  meal_time: '',
  meal_time_label: '',
  verdura: 0, fruta: 0, cereal: 0, leguminosa: 0,
  aoa: 0, grasa: 0, leche: 0, azucar: 0,
  recipe_text: '', sort_order: 0
})

export default function NutritionistPage({ profile }) {
  const [tab, setTab] = useState('pacientes')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeItem, setActiveItem] = useState(null)

  useEffect(() => { loadPatients() }, [])

  async function loadPatients() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'patient')
    setPatients(data || [])
    setLoading(false)
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient)
    setTab('plan')
    // Buscar plan activo
    const { data: planData } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('active', true)
      .single()

    if (planData) {
      setPlan(planData)
      const { data: itemsData } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', planData.id)
        .order('sort_order')
      setItems(itemsData || [])
    } else {
      setPlan(null)
      setItems([])
    }
  }

  async function createPlan() {
    const { data } = await supabase
      .from('meal_plans')
      .insert({
        patient_id: selectedPatient.id,
        nutritionist_id: profile.id,
        name: 'Plan actual',
        active: true
      })
      .select()
      .single()
    setPlan(data)
    setItems([])
  }

  function addMealTime(mealTimeKey) {
    const mt = MEAL_TIMES.find(m => m.key === mealTimeKey)
    const newItem = {
      ...emptyItem(),
      meal_time: mealTimeKey,
      meal_time_label: mt.label,
      sort_order: items.length,
      _local_id: Date.now()
    }
    setItems([...items, newItem])
    setActiveItem(newItem._local_id || newItem.id)
  }

  function updateItem(index, field, value) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  async function savePlan() {
    if (!plan) return
    setSaving(true)

    // Borrar items existentes y reinsertarlos
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

    await supabase.from('meal_plan_items').insert(toInsert)
    setSaving(false)
    alert('Plan guardado ✓')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  // Totales del día
  const totals = SMAE_GROUPS.reduce((acc, g) => {
    acc[g.key] = items.reduce((s, item) => s + (parseFloat(item[g.key]) || 0), 0)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-lg">🥗</div>
          <div>
            <p className="text-sm font-bold text-gray-900">MeCuido</p>
            <p className="text-xs text-gray-400">Nutriólogo/a</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">
          Salir
        </button>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 pb-10">

        {/* Tab pacientes */}
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
                    className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center text-left w-full">
                    <div>
                      <p className="font-bold text-gray-900">{p.full_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.email} · {p.goal === 'lose' ? 'Bajar peso' : p.goal === 'gain' ? 'Subir masa' : 'Mantener'}</p>
                    </div>
                    <span className="text-gray-300 text-xl">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab plan */}
        {tab === 'plan' && selectedPatient && (
          <div>
            <button onClick={() => setTab('pacientes')} className="text-emerald-700 text-sm font-semibold mb-4 flex items-center gap-1">
              ← Pacientes
            </button>

            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="font-bold text-gray-900">{selectedPatient.full_name}</p>
              <p className="text-xs text-gray-400">{selectedPatient.daily_calories} kcal/día · {selectedPatient.goal === 'lose' ? 'Bajar peso' : selectedPatient.goal === 'gain' ? 'Subir masa' : 'Mantener peso'}</p>
            </div>

            {!plan ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <p className="font-bold text-emerald-700 mb-2">Sin plan asignado</p>
                <p className="text-sm text-gray-500 mb-4">Crea el primer plan de equivalentes para este paciente</p>
                <button onClick={createPlan} className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-sm">
                  Crear plan
                </button>
              </div>
            ) : (
              <div>
                {/* Totales del día */}
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Total del día</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SMAE_GROUPS.map(g => (
                      <div key={g.key} className="text-center">
                        <p className="text-lg">{g.icon}</p>
                        <p className={`text-sm font-bold ${g.color}`}>{totals[g.key]}</p>
                        <p className="text-xs text-gray-400">{g.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tiempos de comida */}
                <div className="flex flex-col gap-3 mb-4">
                  {items.map((item, index) => {
                    const mt = MEAL_TIMES.find(m => m.key === item.meal_time)
                    const isOpen = activeItem === (item._local_id || item.id)
                    return (
                      <div key={item._local_id || item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <button
                          onClick={() => setActiveItem(isOpen ? null : (item._local_id || item.id))}
                          className="w-full flex justify-between items-center p-4 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{mt?.icon}</span>
                            <span className="font-bold text-gray-900">{item.meal_time_label}</span>
                          </div>
                          <span className="text-gray-300">{isOpen ? '▲' : '▼'}</span>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-gray-50">
                            {/* Equivalentes */}
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-3 mb-2">Equivalentes</p>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                              {SMAE_GROUPS.map(g => (
                                <div key={g.key} className="text-center">
                                  <p className="text-sm mb-1">{g.icon}</p>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={item[g.key]}
                                    onChange={e => updateItem(index, g.key, e.target.value)}
                                    className="w-full text-center text-sm font-bold border border-gray-200 rounded-lg py-1 outline-none focus:border-emerald-500"
                                  />
                                  <p className="text-xs text-gray-400 mt-0.5">{g.label}</p>
                                </div>
                              ))}
                            </div>

                            {/* Receta */}
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Receta sugerida (opcional)</p>
                            <textarea
                              placeholder="Ej: Chilaquiles ligeros: 3 tortillas horneadas + 120g pechuga + salsa verde..."
                              value={item.recipe_text}
                              onChange={e => updateItem(index, 'recipe_text', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none resize-none focus:border-emerald-500"
                            />

                            <button onClick={() => removeItem(index)}
                              className="mt-3 text-xs text-red-400 font-semibold">
                              Eliminar tiempo de comida
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Agregar tiempo de comida */}
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Agregar tiempo de comida</p>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_TIMES.map(mt => (
                      <button key={mt.key} onClick={() => addMealTime(mt.key)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-emerald-400 hover:text-emerald-700">
                        <span>{mt.icon}</span> {mt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guardar */}
                <button onClick={savePlan} disabled={saving}
                  className="w-full py-4 bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-base">
                  {saving ? 'Guardando...' : 'Guardar plan ✓'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}