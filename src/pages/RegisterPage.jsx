import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'patient',
    weight_kg: '', height_cm: '', age: '', sex: 'female',
    activity_level: 'moderate', goal: 'maintain'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function calcCalories() {
    const w = parseFloat(form.weight_kg)
    const h = parseFloat(form.height_cm)
    const a = parseInt(form.age)
    let bmr = form.sex === 'female'
      ? 447.6 + (9.25 * w) + (3.1 * h) - (4.33 * a)
      : 88.36 + (13.4 * w) + (4.8 * h) - (5.7 * a)
    const factors = { sedentary: 1.2, moderate: 1.55, active: 1.725, very_active: 1.9 }
    let tdee = bmr * factors[form.activity_level]
    if (form.goal === 'lose') tdee -= 500
    if (form.goal === 'gain') tdee += 300
    return Math.round(tdee)
  }

  async function handleRegister() {
    setLoading(true)
    setError('')
    const calories = form.role === 'patient' ? calcCalories() : null
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email, password: form.password
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      role: form.role,
      email: form.email,
      weight_kg: form.weight_kg || null,
      height_cm: form.height_cm || null,
      age: form.age || null,
      sex: form.sex,
      activity_level: form.activity_level,
      goal: form.goal,
      daily_calories: calories
    })
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '10px 12px', background: '#1a1a1a',
    border: '1px solid #333', borderRadius: 8, color: '#fff',
    marginBottom: 12, fontSize: 14, boxSizing: 'border-box'
  }
  const sel = { ...inp }

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
      <div style={{background:'#111',border:'1px solid #222',borderRadius:16,padding:32,width:340}}>
        <h1 style={{color:'#fff',marginBottom:4,fontSize:22}}>MeCuido 🥗</h1>
        <p style={{color:'#666',marginBottom:24,fontSize:13}}>
          {step === 1 ? 'Crea tu cuenta' : step === 2 ? 'Tu perfil físico' : 'Tu objetivo'}
        </p>

        <div style={{display:'flex',gap:6,marginBottom:24}}>
          {[1,2,3].map(n => (
            <div key={n} style={{flex:1,height:3,borderRadius:2,background: step >= n ? '#0F6E56' : '#333'}}/>
          ))}
        </div>

        {error && <p style={{color:'#ef4444',marginBottom:16,fontSize:13}}>{error}</p>}

        {step === 1 && <>
          <input placeholder="Nombre completo" value={form.full_name}
            onChange={e => setForm({...form, full_name: e.target.value})} style={inp}/>
          <input type="email" placeholder="Correo" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} style={inp}/>
          <input type="password" placeholder="Contraseña" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} style={inp}/>
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={sel}>
            <option value="patient">Soy paciente</option>
            <option value="nutritionist">Soy nutriólogo/a</option>
          </select>
          <button onClick={() => setStep(form.role === 'nutritionist' ? 3 : 2)}
            style={{width:'100%',padding:12,background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            Continuar →
          </button>
        </>}

        {step === 2 && <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <input placeholder="Peso (kg)" type="number" value={form.weight_kg}
              onChange={e => setForm({...form, weight_kg: e.target.value})}
              style={{...inp, marginBottom:0}}/>
            <input placeholder="Altura (cm)" type="number" value={form.height_cm}
              onChange={e => setForm({...form, height_cm: e.target.value})}
              style={{...inp, marginBottom:0}}/>
          </div>
          <div style={{height:12}}/>
          <input placeholder="Edad" type="number" value={form.age}
            onChange={e => setForm({...form, age: e.target.value})} style={inp}/>
          <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})} style={sel}>
            <option value="female">Mujer</option>
            <option value="male">Hombre</option>
          </select>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setStep(1)} style={{flex:1,padding:12,background:'transparent',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:14,cursor:'pointer'}}>
              ← Atrás
            </button>
            <button onClick={() => setStep(3)} style={{flex:1,padding:12,background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Continuar →
            </button>
          </div>
        </>}

        {step === 3 && <>
          <p style={{color:'#aaa',fontSize:13,marginBottom:12}}>¿Qué tan activo/a eres?</p>
          <select value={form.activity_level} onChange={e => setForm({...form, activity_level: e.target.value})} style={sel}>
            <option value="sedentary">Sedentario (poco o nada de ejercicio)</option>
            <option value="moderate">Moderado (ejercicio 3-5 días/semana)</option>
            <option value="active">Activo (ejercicio 6-7 días/semana)</option>
            <option value="very_active">Muy activo (ejercicio intenso diario)</option>
          </select>
          <p style={{color:'#aaa',fontSize:13,marginBottom:12}}>¿Cuál es tu objetivo?</p>
          <select value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} style={sel}>
            <option value="lose">Bajar de peso</option>
            <option value="maintain">Mantener peso</option>
            <option value="gain">Subir masa muscular</option>
          </select>
          {form.role === 'patient' && form.weight_kg && form.height_cm && form.age && (
            <div style={{background:'#0F6E5620',border:'1px solid #0F6E56',borderRadius:8,padding:12,marginBottom:12,textAlign:'center'}}>
              <p style={{color:'#aaa',fontSize:12}}>Tu meta calórica diaria</p>
              <p style={{color:'#0F6E56',fontSize:28,fontWeight:700}}>{calcCalories()} kcal</p>
            </div>
          )}
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setStep(form.role === 'nutritionist' ? 1 : 2)}
              style={{flex:1,padding:12,background:'transparent',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:14,cursor:'pointer'}}>
              ← Atrás
            </button>
            <button onClick={handleRegister} disabled={loading}
              style={{flex:1,padding:12,background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </>}

        <p style={{color:'#666',fontSize:13,textAlign:'center',marginTop:16}}>
          ¿Ya tienes cuenta? <a href="/login" style={{color:'#0F6E56'}}>Entra aquí</a>
        </p>
      </div>
    </div>
  )
}