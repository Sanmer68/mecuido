import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function PatientPage({ profile }) {
  const [tab, setTab] = useState('inicio')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [logs, setLogs] = useState([])
  const fileRef = useRef()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function analyzePhoto(file) {
    setAnalyzing(true)
    setResult(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      try {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
                { type: 'text', text: `Analiza esta foto de comida y responde SOLO en JSON sin backticks así:
{"descripcion":"nombre del platillo","calorias":380,"proteina_g":25,"carbos_g":40,"grasa_g":12,"sodio_mg":600,"colesterol_mg":80,"confianza":"alta|media|baja","nota":"observación breve"}
Si no es comida responde: {"error":"No es comida"}` }
              ]
            }]
          })
        })
        const data = await res.json()
        const text = data.content[0].text
        const parsed = JSON.parse(text)
        setResult(parsed)
      } catch (e) {
        setResult({ error: 'Error al analizar la imagen' })
      }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }
  async function analyzeText() {
  setAnalyzing(true)
  setResult(null)
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analiza esta descripción de comida y responde SOLO en JSON sin backticks así:
{"descripcion":"nombre del platillo","calorias":380,"proteina_g":25,"carbos_g":40,"grasa_g":12,"sodio_mg":600,"colesterol_mg":80,"confianza":"alta|media|baja","nota":"observación breve"}

Descripción: ${descripcionManual}`
        }]
      })
    })
    const data = await res.json()
    const text = data.content[0].text
    const parsed = JSON.parse(text)
    setResult(parsed)
  } catch (e) {
    setResult({ error: 'Error al analizar' })
  }
  setAnalyzing(false)
}

  async function saveLog() {
    if (!result || result.error) return
    const { error } = await supabase.from('food_logs').insert({
      user_id: profile.id,
      meal_type: 'almuerzo',
      description: result.descripcion,
      calories: result.calorias,
      protein_g: result.proteina_g,
      carbs_g: result.carbos_g,
      fat_g: result.grasa_g,
      sodium_mg: result.sodio_mg,
      cholesterol_mg: result.colesterol_mg,
      is_estimated: true
    })
    if (!error) {
      setLogs([...logs, result])
      setResult(null)
      setPhoto(null)
      setTab('historial')
    }
  }

  const totalCals = logs.reduce((sum, l) => sum + (l.calorias || 0), 0)
  const meta = profile?.daily_calories || 1800

  const tabStyle = (t) => ({
    padding: '8px 16px', background: tab === t ? '#0F6E56' : 'transparent',
    border: 'none', borderRadius: 8, color: tab === t ? '#fff' : '#666',
    cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400
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
              <p style={{fontSize:32,fontWeight:700,color:'#0F6E56'}}>{totalCals} <span style={{fontSize:16,color:'#666'}}>/ {meta} kcal</span></p>
              <div style={{height:4,background:'#222',borderRadius:2,marginTop:8}}>
                <div style={{height:'100%',background:'#0F6E56',borderRadius:2,width:`${Math.min(100,(totalCals/meta)*100)}%`}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[
                ['Proteína', logs.reduce((s,l)=>s+(l.proteina_g||0),0)+'g', '62g'],
                ['Carbos', logs.reduce((s,l)=>s+(l.carbos_g||0),0)+'g', '220g'],
                ['Grasa', logs.reduce((s,l)=>s+(l.grasa_g||0),0)+'g', '60g']
              ].map(([name,val,meta]) => (
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
          <div>
            <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{display:'none'}}
              onChange={e => { const f = e.target.files[0]; if(f){setPhoto(URL.createObjectURL(f)); analyzePhoto(f)} }}/>

           {!photo && !analyzing && (
  <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20}}>
    <p style={{fontSize:32,textAlign:'center',marginBottom:12}}>📸</p>
    <button onClick={() => fileRef.current.click()}
      style={{width:'100%',padding:12,background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:12}}>
      Tomar foto
    </button>
    <p style={{color:'#555',fontSize:12,textAlign:'center',marginBottom:12}}>— o describe tu comida —</p>
    <textarea
      placeholder="Ej: 100g carne de res, 120g papa cocida, ensalada de lechuga..."
      value={descripcionManual}
      onChange={e => setDescripcionManual(e.target.value)}
      rows={3}
      style={{width:'100%',padding:'10px 12px',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,boxSizing:'border-box',resize:'none',marginBottom:8}}
    />
    <button onClick={analyzeText} disabled={!descripcionManual.trim()}
      style={{width:'100%',padding:12,background: descripcionManual.trim() ? '#0F6E56' : '#333',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
      Analizar descripción
    </button>
  </div>
)}

            {analyzing && (
              <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:40,textAlign:'center'}}>
                <p style={{fontSize:32,marginBottom:16}}>🤖</p>
                <p style={{color:'#0F6E56'}}>Analizando tu comida...</p>
              </div>
            )}

            {photo && result && !result.error && (
              <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20}}>
                <img src={photo} alt="plato" style={{width:'100%',borderRadius:8,marginBottom:16,maxHeight:200,objectFit:'cover'}}/>
                <div style={{background:'#0F6E5620',border:'1px solid #0F6E56',borderRadius:8,padding:12,marginBottom:12}}>
                  <p style={{color:'#0F6E56',fontWeight:600,marginBottom:4}}>🤖 IA detectó:</p>
                  <p style={{color:'#fff',marginBottom:8}}>{result.descripcion}</p>
                  <p style={{color:'#aaa',fontSize:12}}>aprox. <strong style={{color:'#0F6E56'}}>{result.calorias} kcal</strong> · {result.proteina_g}g proteína · {result.carbos_g}g carbos · {result.grasa_g}g grasa</p>
                  <p style={{color:'#666',fontSize:11,marginTop:4}}>Variación estimada 15-25% · Confianza: {result.confianza}</p>
                </div>
                {result.nota && <p style={{color:'#666',fontSize:12,marginBottom:12}}>💡 {result.nota}</p>}
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => {setPhoto(null);setResult(null)}}
                    style={{flex:1,padding:10,background:'transparent',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,cursor:'pointer'}}>
                    Ajustar
                  </button>
                  <button onClick={saveLog}
                    style={{flex:1,padding:10,background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                    Confirmar ✓
                  </button>
                </div>
              </div>
            )}

            {result?.error && (
              <div style={{background:'#111',border:'1px solid #ef4444',borderRadius:12,padding:20,textAlign:'center'}}>
                <p style={{color:'#ef4444'}}>{result.error}</p>
                <button onClick={() => {setPhoto(null);setResult(null)}}
                  style={{marginTop:12,padding:'8px 16px',background:'transparent',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,cursor:'pointer'}}>
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'historial' && (
          <div>
            {logs.length === 0 ? (
              <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20,textAlign:'center'}}>
                <p style={{color:'#666'}}>Sin registros todavía</p>
              </div>
            ) : logs.map((log, i) => (
              <div key={i} style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:12,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{fontWeight:500}}>{log.descripcion}</p>
                  <p style={{color:'#666',fontSize:12}}>{log.proteina_g}g prot · {log.carbos_g}g carbos · {log.grasa_g}g grasa</p>
                </div>
                <p style={{color:'#0F6E56',fontWeight:600}}>{log.calorias} kcal</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}