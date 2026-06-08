import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
      <div style={{background:'#111',border:'1px solid #222',borderRadius:16,padding:32,width:320}}>
        <h1 style={{color:'#fff',marginBottom:8,fontSize:24}}>MeCuido 🥗</h1>
        <p style={{color:'#666',marginBottom:24,fontSize:14}}>Tu nutrición personal</p>
        {error && <p style={{color:'#ef4444',marginBottom:16,fontSize:13}}>{error}</p>}
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',marginBottom:12,fontSize:14,boxSizing:'border-box'}}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',marginBottom:16,fontSize:14,boxSizing:'border-box'}}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{width:'100%',padding:'12px',background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p style={{color:'#666',fontSize:13,textAlign:'center',marginTop:16}}>
          ¿No tienes cuenta? <a href="/registro" style={{color:'#0F6E56'}}>Regístrate</a>
        </p>
      </div>
    </div>
  )
}