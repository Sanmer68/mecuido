import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NutritionistPage({ profile }) {
  const [tab, setTab] = useState('pacientes')

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const tabStyle = (t) => ({
    padding: '8px 16px',
    background: tab === t ? '#0F6E56' : 'transparent',
    border: 'none',
    borderRadius: 8,
    color: tab === t ? '#fff' : '#666',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: tab === t ? 600 : 400
  })

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',fontFamily:'system-ui',color:'#fff'}}>
      <div style={{maxWidth:480,margin:'0 auto',padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:600}}>Dra. {profile?.full_name?.split(' ')[0]} 👩‍⚕️</h2>
            <p style={{color:'#666',fontSize:13}}>Panel nutriólogo</p>
          </div>
          <button onClick={handleLogout} style={{background:'transparent',border:'1px solid #333',borderRadius:8,color:'#666',padding:'6px 12px',cursor:'pointer',fontSize:13}}>Salir</button>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:24,background:'#111',padding:4,borderRadius:10}}>
          <button style={tabStyle('pacientes')} onClick={() => setTab('pacientes')}>👥 Pacientes</button>
          <button style={tabStyle('resumen')} onClick={() => setTab('resumen')}>📊 Resumen</button>
        </div>

        {tab === 'pacientes' && (
          <div>
            <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20,textAlign:'center'}}>
              <p style={{color:'#666'}}>Sin pacientes todavía</p>
              <p style={{color:'#444',fontSize:13,marginTop:8}}>Los pacientes aparecerán aquí cuando se registren contigo</p>
            </div>
          </div>
        )}

        {tab === 'resumen' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[['0','Pacientes activos'],['0','Sin registro hoy']].map(([num,label]) => (
              <div key={label} style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:16}}>
                <p style={{fontSize:28,fontWeight:700,color:'#0F6E56'}}>{num}</p>
                <p style={{color:'#666',fontSize:12,marginTop:4}}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}