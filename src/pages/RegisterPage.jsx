import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'patient' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      role: form.role,
      email: form.email
    })
    if (profileError) setError(profileError.message)
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
      <div style={{background:'#111',border:'1px solid #222',borderRadius:16,padding:32,width:320}}>
        <h1 style={{color:'#fff',marginBottom:8,fontSize:24}}>Crear cuenta 🥗</h1>
        <p style={{color:'#666',marginBottom:24,fontSize:14}}>MeCuido</p>
        {error && <p style={{color:'#ef4444',marginBottom:16,fontSize:13}}>{error}</p>}
        <input
          placeholder="Nombre completo"
          value={form.full_name}
          onChange={e => setForm({...form, full_name: e.target.value})}
          style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',marginBottom:12,fontSize:14,boxSizing:'border-box'}}
        />
        <input
          type="email"
          placeholder="Correo"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',marginBottom:12,fontSize:14,boxSizing:'border-box'}}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',marginBottom:12,fontSize:14,boxSizing:'border-box'}}
        />
        <select
          value={form.role}
          onChange={e => setForm({...form, role: e.target.value})}
          style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',marginBottom:16,fontSize:14,boxSizing:'border-box'}}
        >
          <option value="patient">Soy paciente</option>
          <option value="nutritionist">Soy nutriólogo/a</option>
        </select>
        <button
          onClick={handleRegister}
          disabled={loading}
          style={{width:'100%',padding:'12px',background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p style={{color:'#666',fontSize:13,textAlign:'center',marginTop:16}}>
          ¿Ya tienes cuenta? <a href="/login" style={{color:'#0F6E56'}}>Entra aquí</a>
        </p>
      </div>
    </div>
  )
}