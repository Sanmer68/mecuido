import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PatientPage({ profile }) {
  const [tab, setTab] = useState('inicio')

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
            <h2 style={{fontSize:18,fontWeight:600}}>Hola, {profile?.full_name?.split(' ')[0]} 👋</h2>
            <p style={{color:'#666',fontSize:13}}>MeCuido</p>
          </div>
          <button onClick={handleLogout} style={{background:'transparent',border:'1px solid #333',borderRadius:8,color:'#666',padding:'6px 12px',cursor:'pointer',fontSize:13}}>Salir</button>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:24,background:'#111',padding:4,borderRadius:10}}>
          <button style={tabStyle('inicio')} onClick={() => setTab('inicio')}>🏠 Inicio</button>
          <button style={tabStyle('registrar')} onClick={() => setTab('registrar')}>📸 Registrar</button>
          <button style={tabStyle('historial')} onClick={() => setTab('historial')}>📊 Historial</button>
        </div>

        {tab === 'inicio' && (
          <div>
            <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20,marginBottom:16}}>
              <p style={{color:'#666',fontSize:13,marginBottom:4}}>Calorías de hoy</p>
              <p style={{fontSize:32,fontWeight:700,color:'#0F6E56'}}>0 <span style={{fontSize:16,color:'#666'}}>/ 1,800 kcal</span></p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[['Proteína','0g','62g'],['Carbos','0g','220g'],['Grasa','0g','60g']].map(([name,val,meta]) => (
                <div key={name} style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:12,textAlign:'center'}}>
                  <p style={{fontSize:18,fontWeight:600}}>{val}</p>
                  <p style={{color:'#666',fontSize:11}}>{name}</p>
                  <p style={{color:'#333',fontSize:11}}>meta {meta}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'registrar' && (
          <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20,textAlign:'center'}}>
            <p style={{fontSize:48,marginBottom:16}}>📸</p>
            <p style={{color:'#666',marginBottom:16}}>Toma una foto de tu plato o describe tu comida</p>
            <button style={{width:'100%',padding:12,background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:8}}>
              Tomar foto
            </button>
            <button style={{width:'100%',padding:12,background:'transparent',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:14,cursor:'pointer'}}>
              Describir comida
            </button>
          </div>
        )}

        {tab === 'historial' && (
          <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20,textAlign:'center'}}>
            <p style={{color:'#666'}}>Sin registros todavía</p>
          </div>
        )}
      </div>
    </div>
  )
}