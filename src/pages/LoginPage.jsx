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
    width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.12)',
    border:'1px solid rgba(255,255,255,0.25)', borderRadius:10, color:'#fff',
    marginBottom:10, fontSize:14, boxSizing:'border-box',
    fontFamily:'inherit', outline:'none'
  }

  const features = [
    { icon:'📸', text:'Foto → calorías al instante' },
    { icon:'🎯', text:'Meta calórica personalizada' },
    { icon:'🤖', text:'IA nutricional en segundos' },
  ]

  const tips = [
    '"Lo que no se mide, no mejora."',
    '"Un pequeño cambio diario = gran resultado."',
    '"Conocer lo que comes es el primer paso."',
  ]
  const tip = tips[new Date().getDay() % tips.length]

  return (
    <div style={{minHeight:'100vh',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',display:'flex',flexDirection:'column'}}>

      {/* Hero verde */}
      <div style={{background:'linear-gradient(160deg,#0a4a38 0%,#0F6E56 60%,#1a8a6a 100%)',padding:'40px 24px 60px',textAlign:'center',position:'relative'}}>
        <div style={{width:52,height:52,background:'rgba(255,255,255,0.15)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 12px',backdropFilter:'blur(10px)'}}>🥗</div>
        <h1 style={{fontSize:28,fontWeight:800,color:'#fff',margin:'0 0 6px',letterSpacing:'-0.5px'}}>MeCuido</h1>
        <p style={{color:'rgba(255,255,255,0.75)',fontSize:14,margin:'0 0 24px'}}>Nutrición inteligente con IA</p>

        {/* Features inline */}
        <div style={{display:'flex',flexDirection:'column',gap:8,maxWidth:300,margin:'0 auto'}}>
          {features.map(f => (
            <div key={f.text} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'8px 14px',backdropFilter:'blur(10px)'}}>
              <span style={{fontSize:16}}>{f.icon}</span>
              <span style={{fontSize:13,color:'rgba(255,255,255,0.9)',fontWeight:500}}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario — sube sobre el hero */}
      <div style={{background:'#F7F8FA',flex:1,borderRadius:'24px 24px 0 0',marginTop:-24,padding:'28px 24px 40px'}}>
        <div style={{maxWidth:380,margin:'0 auto'}}>

          <h2 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',margin:'0 0 20px',textAlign:'center'}}>Inicia sesión</h2>

          {error && (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',marginBottom:14}}>
              <p style={{color:'#DC2626',fontSize:13,margin:0}}>{error}</p>
            </div>
          )}

          <input type="email" placeholder="Correo electrónico" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{...inp, background:'#fff', border:'1px solid #E8E8E8', color:'#1a1a1a'}}/>
          <input type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{...inp, background:'#fff', border:'1px solid #E8E8E8', color:'#1a1a1a', marginBottom:16}}/>

          <button onClick={handleLogin} disabled={loading}
            style={{width:'100%',padding:14,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 12px rgba(15,110,86,0.3)',marginBottom:14}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p style={{color:'#888',fontSize:13,textAlign:'center',margin:'0 0 24px'}}>
            ¿No tienes cuenta?{' '}
            <a href="/registro" style={{color:'#0F6E56',fontWeight:700,textDecoration:'none'}}>Regístrate gratis</a>
          </p>

          {/* Frase del día */}
          <div style={{background:'#F0FAF6',border:'1px solid #C8EAE0',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
            <p style={{fontSize:10,color:'#0F6E56',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 4px'}}>Frase del día</p>
            <p style={{fontSize:12,color:'#555',margin:0,fontStyle:'italic',lineHeight:1.5}}>{tip}</p>
          </div>

        </div>
      </div>

    </div>
  )
}