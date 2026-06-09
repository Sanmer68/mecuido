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
    width:'100%', padding:'12px 14px', background:'#F7F8FA',
    border:'1px solid #E8E8E8', borderRadius:10, color:'#1a1a1a',
    marginBottom:12, fontSize:14, boxSizing:'border-box',
    fontFamily:'inherit', outline:'none'
  }
  const sel = { ...inp, cursor:'pointer' }

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',padding:20}}>
      <div style={{background:'#fff',borderRadius:20,padding:32,width:'100%',maxWidth:360,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>

        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:56,height:56,background:'#0F6E56',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 12px'}}>🥗</div>
          <h1 style={{fontSize:22,fontWeight:800,margin:'0 0 4px',color:'#1a1a1a'}}>MeCuido</h1>
          <p style={{color:'#888',fontSize:13,margin:0}}>
            {step === 1 ? 'Crea tu cuenta' : step === 2 ? 'Tu perfil físico' : 'Tu objetivo'}
          </p>
        </div>

        {/* Progress */}
        <div style={{display:'flex',gap:6,marginBottom:24}}>
          {[1,2,3].map(n => (
            <div key={n} style={{flex:1,height:4,borderRadius:2,background: step >= n ? '#0F6E56' : '#E8E8E8',transition:'background 0.3s'}}/>
          ))}
        </div>

        {error && (
          <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',marginBottom:16}}>
            <p style={{color:'#DC2626',fontSize:13,margin:0}}>{error}</p>
          </div>
        )}

        {step === 1 && <>
          <input placeholder="Nombre completo" value={form.full_name}
            onChange={e => setForm({...form, full_name: e.target.value})} style={inp}/>
          <input type="email" placeholder="Correo electrónico" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} style={inp}/>
          <input type="password" placeholder="Contraseña" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} style={inp}/>
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={sel}>
            <option value="patient">Soy paciente</option>
            <option value="nutritionist">Soy nutriólogo/a</option>
          </select>
          <button onClick={() => setStep(form.role === 'nutritionist' ? 3 : 2)}
            style={{width:'100%',padding:14,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',marginTop:4}}>
            Continuar →
          </button>
        </>}

        {step === 2 && <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <input placeholder="Peso (kg)" type="number" value={form.weight_kg}
              onChange={e => setForm({...form, weight_kg: e.target.value})}
              style={{...inp, marginBottom:0}}/>
            <input placeholder="Altura (cm)" type="number" value={form.height_cm}
              onChange={e => setForm({...form, height_cm: e.target.value})}
              style={{...inp, marginBottom:0}}/>
          </div>
          <input placeholder="Edad" type="number" value={form.age}
            onChange={e => setForm({...form, age: e.target.value})} style={inp}/>
          <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})} style={sel}>
            <option value="female">Mujer</option>
            <option value="male">Hombre</option>
          </select>
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button onClick={() => setStep(1)}
              style={{flex:1,padding:13,background:'#F7F8FA',border:'1px solid #E8E8E8',borderRadius:10,color:'#555',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              ← Atrás
            </button>
            <button onClick={() => setStep(3)}
              style={{flex:2,padding:13,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>
              Continuar →
            </button>
          </div>
        </>}

        {step === 3 && <>
          <p style={{color:'#555',fontSize:13,fontWeight:600,margin:'0 0 8px'}}>¿Qué tan activo/a eres?</p>
          <select value={form.activity_level} onChange={e => setForm({...form, activity_level: e.target.value})} style={sel}>
            <option value="sedentary">Sedentario (poco o nada de ejercicio)</option>
            <option value="moderate">Moderado (ejercicio 3-5 días/semana)</option>
            <option value="active">Activo (ejercicio 6-7 días/semana)</option>
            <option value="very_active">Muy activo (ejercicio intenso diario)</option>
          </select>
          <p style={{color:'#555',fontSize:13,fontWeight:600,margin:'0 0 8px'}}>¿Cuál es tu objetivo?</p>
          <select value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} style={sel}>
            <option value="lose">Bajar de peso</option>
            <option value="maintain">Mantener peso</option>
            <option value="gain">Subir masa muscular</option>
          </select>

          {form.role === 'patient' && form.weight_kg && form.height_cm && form.age && (
            <div style={{background:'#F0FAF6',border:'1px solid #C8EAE0',borderRadius:12,padding:16,marginBottom:14,textAlign:'center'}}>
              <p style={{color:'#888',fontSize:12,margin:'0 0 4px'}}>Tu meta calórica diaria</p>
              <p style={{color:'#0F6E56',fontSize:32,fontWeight:800,margin:0}}>{calcCalories()} <span style={{fontSize:14,fontWeight:500}}>kcal</span></p>
            </div>
          )}

          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setStep(form.role === 'nutritionist' ? 1 : 2)}
              style={{flex:1,padding:13,background:'#F7F8FA',border:'1px solid #E8E8E8',borderRadius:10,color:'#555',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              ← Atrás
            </button>
            <button onClick={handleRegister} disabled={loading}
              style={{flex:2,padding:13,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </>}

        <p style={{color:'#888',fontSize:13,textAlign:'center',marginTop:20,margin:'20px 0 0'}}>
          ¿Ya tienes cuenta?{' '}
          <a href="/login" style={{color:'#0F6E56',fontWeight:600,textDecoration:'none'}}>Entra aquí</a>
        </p>
      </div>
    </div>
  )
}