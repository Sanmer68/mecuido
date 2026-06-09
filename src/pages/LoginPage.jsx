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

  const inp = {
    width:'100%', padding:'12px 14px', background:'#F7F8FA',
    border:'1px solid #E8E8E8', borderRadius:10, color:'#1a1a1a',
    marginBottom:12, fontSize:14, boxSizing:'border-box',
    fontFamily:'inherit', outline:'none'
  }

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',padding:20}}>
      <div style={{background:'#fff',borderRadius:20,padding:32,width:'100%',maxWidth:360,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>

        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:56,height:56,background:'#0F6E56',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 12px'}}>🥗</div>
          <h1 style={{fontSize:22,fontWeight:800,margin:'0 0 4px',color:'#1a1a1a'}}>MeCuido</h1>
          <p style={{color:'#888',fontSize:14,margin:0}}>Tu nutrición personal</p>
        </div>

        {error && (
          <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',marginBottom:16}}>
            <p style={{color:'#DC2626',fontSize:13,margin:0}}>{error}</p>
          </div>
        )}

        <input type="email" placeholder="Correo electrónico" value={email}
          onChange={e => setEmail(e.target.value)} style={inp}/>
        <input type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{...inp, marginBottom:20}}/>

        <button onClick={handleLogin} disabled={loading}
          style={{width:'100%',padding:14,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p style={{color:'#888',fontSize:13,textAlign:'center',marginTop:20,margin:'20px 0 0'}}>
          ¿No tienes cuenta?{' '}
          <a href="/registro" style={{color:'#0F6E56',fontWeight:600,textDecoration:'none'}}>Regístrate</a>
        </p>
      </div>
    </div>
  )
}