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

  const features = [
    { icon:'📸', title:'Foto → calorías', desc:'Sin pesar ni contar' },
    { icon:'🎯', title:'Meta personalizada', desc:'Según tu peso y objetivo' },
    { icon:'🤖', title:'IA nutricional', desc:'Análisis en segundos' },
  ]

  const tips = [
    '"Lo que no se mide, no mejora."',
    '"Un pequeño cambio diario = gran resultado."',
    '"Conocer lo que comes es el primer paso."',
  ]
  const tip = tips[new Date().getDay() % tips.length]

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',padding:'32px 20px 40px'}}>
      <div style={{maxWidth:380,margin:'0 auto'}}>

        {/* Hero */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:64,height:64,background:'#0F6E56',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 12px',boxShadow:'0 4px 16px rgba(15,110,86,0.25)'}}>🥗</div>
          <h1 style={{fontSize:26,fontWeight:800,margin:'0 0 4px',color:'#1a1a1a'}}>MeCuido</h1>
          <p style={{color:'#888',fontSize:14,margin:0}}>Tu nutrición personal con IA</p>
        </div>

        {/* Login card */}
        <div style={{background:'#fff',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.08)',marginBottom:20}}>
          {error && (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',marginBottom:16}}>
              <p style={{color:'#DC2626',fontSize:13,margin:0}}>{error}</p>
            </div>
          )}
          <input type="email" placeholder="Correo electrónico" value={email}
            onChange={e => setEmail(e.target.value)} style={inp}/>
          <input type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)} style={{...inp, marginBottom:16}}/>
          <button onClick={handleLogin} disabled={loading}
            style={{width:'100%',padding:14,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(15,110,86,0.3)'}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p style={{color:'#888',fontSize:13,textAlign:'center',margin:'16px 0 0'}}>
            ¿No tienes cuenta?{' '}
            <a href="/registro" style={{color:'#0F6E56',fontWeight:700,textDecoration:'none'}}>Regístrate gratis</a>
          </p>
        </div>

        {/* Features */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
          {features.map(f => (
            <div key={f.title} style={{background:'#fff',borderRadius:14,padding:'14px 10px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <p style={{fontSize:24,margin:'0 0 6px'}}>{f.icon}</p>
              <p style={{fontSize:11,fontWeight:700,color:'#1a1a1a',margin:'0 0 2px',lineHeight:1.3}}>{f.title}</p>
              <p style={{fontSize:10,color:'#aaa',margin:0,lineHeight:1.3}}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Frase del día */}
        <div style={{background:'#F0FAF6',border:'1px solid #C8EAE0',borderRadius:14,padding:'14px 16px',textAlign:'center'}}>
          <p style={{fontSize:11,color:'#0F6E56',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>Frase del día</p>
          <p style={{fontSize:13,color:'#555',margin:0,fontStyle:'italic',lineHeight:1.5}}>{tip}</p>
        </div>

      </div>
    </div>
  )
}