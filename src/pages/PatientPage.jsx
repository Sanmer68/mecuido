import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function PatientPage({ profile }) {
  const [tab, setTab] = useState('inicio')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [logs, setLogs] = useState([])
  const [descripcionManual, setDescripcionManual] = useState('')
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
      setPhoto(e.target.result)
      try {
        const res = await fetch('/.netlify/functions/claude-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
                { type: 'text', text: `Eres un nutriólogo experto. Analiza esta foto de comida con mucha precisión.
Cuenta las porciones visibles, estima el tamaño de cada una, e identifica todos los ingredientes.
Responde SOLO en JSON sin backticks ni texto adicional:
{"descripcion":"nombre exacto del platillo con cantidad estimada","calorias":380,"proteina_g":25,"carbos_g":40,"grasa_g":12,"sodio_mg":600,"colesterol_mg":80,"confianza":"alta|media|baja","nota":"observación sobre tamaño de porción"}
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
      const res = await fetch('/.netlify/functions/claude-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Eres un nutriólogo experto. Analiza esta descripción de comida con precisión y estima los valores nutricionales reales para las cantidades mencionadas.
Responde SOLO en JSON sin backticks ni texto adicional:
{"descripcion":"nombre del platillo con cantidad","calorias":380,"proteina_g":25,"carbos_g":40,"grasa_g":12,"sodio_mg":600,"colesterol_mg":80,"confianza":"alta|media|baja","nota":"observación breve"}

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
    await supabase.from('food_logs').insert({
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
    setLogs([...logs, result])
    setResult(null)
    setPhoto(null)
    setDescripcionManual('')
    setTab('historial')
  }

  const totalCals = logs.reduce((sum, l) => sum + (l.calorias || 0), 0)
  const meta = profile?.daily_calories || 1800
  const pct = Math.min(100, Math.round((totalCals / meta) * 100))
  const nombre = profile?.full_name?.split(' ')[0] || 'tú'

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:'#1a1a1a'}}>

      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #EBEBEB',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'#0F6E56',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥗</div>
          <div>
            <p style={{fontSize:15,fontWeight:700,margin:0}}>MeCuido</p>
            <p style={{fontSize:11,color:'#888',margin:0}}>Hola, {nombre}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{background:'transparent',border:'1px solid #E0E0E0',borderRadius:8,color:'#888',padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:500}}>
          Salir
        </button>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px 100px'}}>

        {/* Tab Inicio */}
        {tab === 'inicio' && (
          <div>
            {/* Calorias card */}
            <div style={{background:'#fff',borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <p style={{color:'#888',fontSize:12,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',margin:'0 0 4px'}}>Calorías de hoy</p>
              <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12}}>
                <span style={{fontSize:40,fontWeight:800,color:'#0F6E56',lineHeight:1}}>{totalCals}</span>
                <span style={{fontSize:15,color:'#aaa'}}>/ {meta} kcal</span>
              </div>
              <div style={{height:6,background:'#F0F0F0',borderRadius:3}}>
                <div style={{height:'100%',background: pct > 90 ? '#ef4444' : '#0F6E56',borderRadius:3,width:`${pct}%`,transition:'width 0.4s ease'}}/>
              </div>
              <p style={{fontSize:12,color:'#aaa',marginTop:6,textAlign:'right'}}>{pct}% de tu meta</p>
            </div>

            {/* Macros */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
              {[
                {label:'Proteína', val: logs.reduce((s,l)=>s+(l.proteina_g||0),0), meta:'62g', color:'#3B82F6'},
                {label:'Carbos', val: logs.reduce((s,l)=>s+(l.carbos_g||0),0), meta:'220g', color:'#F59E0B'},
                {label:'Grasa', val: logs.reduce((s,l)=>s+(l.grasa_g||0),0), meta:'60g', color:'#EF4444'},
              ].map(m => (
                <div key={m.label} style={{background:'#fff',borderRadius:14,padding:'14px 12px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                  <p style={{fontSize:22,fontWeight:800,color:m.color,margin:'0 0 2px'}}>{m.val}<span style={{fontSize:12,fontWeight:600}}>g</span></p>
                  <p style={{fontSize:11,color:'#888',margin:'0 0 2px',fontWeight:600}}>{m.label}</p>
                  <p style={{fontSize:10,color:'#ccc',margin:0}}>meta {m.meta}</p>
                </div>
              ))}
            </div>

            {/* CTA registrar */}
            {logs.length === 0 && (
              <div style={{background:'#F0FAF6',border:'1px solid #C8EAE0',borderRadius:14,padding:20,textAlign:'center'}}>
                <p style={{fontSize:28,margin:'0 0 8px'}}>🍽️</p>
                <p style={{fontWeight:600,color:'#0F6E56',margin:'0 0 4px'}}>Registra tu primera comida</p>
                <p style={{fontSize:13,color:'#888',margin:'0 0 14px'}}>Toma una foto o describe lo que comiste</p>
                <button onClick={() => setTab('registrar')}
                  style={{padding:'10px 24px',background:'#0F6E56',border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                  Registrar ahora
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Registrar */}
        {tab === 'registrar' && (
          <div>
            <input type="file" accept="image/*" id="foto-input" ref={fileRef} style={{display:'none'}}
              onChange={e => { const f = e.target.files[0]; if(f){ analyzePhoto(f) } }}/>

            {!photo && !analyzing && (
              <div>
                <div style={{background:'#fff',borderRadius:16,padding:20,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                  <label htmlFor="foto-input" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,width:'100%',padding:14,background:'#0F6E56',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',boxSizing:'border-box'}}>
                    <span style={{fontSize:20}}>📸</span> Tomar foto
                  </label>
                </div>

                <div style={{background:'#fff',borderRadius:16,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                  <p style={{fontSize:13,color:'#888',fontWeight:600,margin:'0 0 10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>O describe tu comida</p>
                  <textarea
                    placeholder="Ej: 2 tacos de pastor con tortilla de maíz, cebolla y cilantro"
                    value={descripcionManual}
                    onChange={e => setDescripcionManual(e.target.value)}
                    rows={3}
                    style={{width:'100%',padding:'10px 12px',background:'#F7F8FA',border:'1px solid #E8E8E8',borderRadius:10,color:'#1a1a1a',fontSize:14,boxSizing:'border-box',resize:'none',outline:'none',fontFamily:'inherit'}}
                  />
                  <button onClick={analyzeText} disabled={!descripcionManual.trim()}
                    style={{width:'100%',marginTop:10,padding:13,background:descripcionManual.trim()?'#0F6E56':'#E0E0E0',border:'none',borderRadius:10,color:descripcionManual.trim()?'#fff':'#aaa',fontSize:14,fontWeight:700,cursor:descripcionManual.trim()?'pointer':'default',transition:'background 0.2s'}}>
                    Analizar
                  </button>
                </div>
              </div>
            )}

            {analyzing && (
              <div style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                {photo && <img src={photo} alt="plato" style={{width:'100%',maxHeight:220,objectFit:'cover'}}/>}
                <div style={{padding:30,textAlign:'center'}}>
                  <div style={{width:48,height:48,border:'3px solid #0F6E56',borderTopColor:'transparent',borderRadius:'50%',margin:'0 auto 16px',animation:'spin 0.8s linear infinite'}}/>
                  <p style={{fontWeight:600,color:'#0F6E56',margin:0}}>Analizando tu comida...</p>
                  <p style={{fontSize:13,color:'#aaa',margin:'4px 0 0'}}>Esto toma unos segundos</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {photo && result && !result.error && (
              <div style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <img src={photo} alt="plato" style={{width:'100%',maxHeight:220,objectFit:'cover'}}/>
                <div style={{padding:20}}>
                  <p style={{fontSize:11,color:'#0F6E56',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>IA detectó</p>
                  <p style={{fontSize:17,fontWeight:700,margin:'0 0 14px'}}>{result.descripcion}</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
                    {[
                      {label:'Calorías',val:result.calorias,unit:'kcal',color:'#0F6E56'},
                      {label:'Proteína',val:result.proteina_g,unit:'g',color:'#3B82F6'},
                      {label:'Carbos',val:result.carbos_g,unit:'g',color:'#F59E0B'},
                      {label:'Grasa',val:result.grasa_g,unit:'g',color:'#EF4444'},
                    ].map(n => (
                      <div key={n.label} style={{background:'#F7F8FA',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                        <p style={{fontSize:16,fontWeight:800,color:n.color,margin:'0 0 2px'}}>{n.val}<span style={{fontSize:10}}>{n.unit}</span></p>
                        <p style={{fontSize:10,color:'#888',margin:0}}>{n.label}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{fontSize:11,color:'#aaa',margin:'0 0 14px'}}>Variación estimada 15-25% · Confianza: {result.confianza}</p>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={() => {setPhoto(null);setResult(null)}}
                      style={{flex:1,padding:12,background:'#F7F8FA',border:'1px solid #E8E8E8',borderRadius:10,color:'#555',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                      Ajustar
                    </button>
                    <button onClick={saveLog}
                      style={{flex:2,padding:12,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                      Confirmar ✓
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!photo && result && !result.error && (
              <div style={{background:'#fff',borderRadius:16,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <p style={{fontSize:11,color:'#0F6E56',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>IA calculó</p>
                <p style={{fontSize:17,fontWeight:700,margin:'0 0 14px'}}>{result.descripcion}</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
                  {[
                    {label:'Calorías',val:result.calorias,unit:'kcal',color:'#0F6E56'},
                    {label:'Proteína',val:result.proteina_g,unit:'g',color:'#3B82F6'},
                    {label:'Carbos',val:result.carbos_g,unit:'g',color:'#F59E0B'},
                    {label:'Grasa',val:result.grasa_g,unit:'g',color:'#EF4444'},
                  ].map(n => (
                    <div key={n.label} style={{background:'#F7F8FA',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                      <p style={{fontSize:16,fontWeight:800,color:n.color,margin:'0 0 2px'}}>{n.val}<span style={{fontSize:10}}>{n.unit}</span></p>
                      <p style={{fontSize:10,color:'#888',margin:0}}>{n.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => setResult(null)}
                    style={{flex:1,padding:12,background:'#F7F8FA',border:'1px solid #E8E8E8',borderRadius:10,color:'#555',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                    Ajustar
                  </button>
                  <button onClick={saveLog}
                    style={{flex:2,padding:12,background:'#0F6E56',border:'none',borderRadius:10,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                    Confirmar ✓
                  </button>
                </div>
              </div>
            )}

            {result?.error && (
              <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:14,padding:20,textAlign:'center'}}>
                <p style={{fontSize:24,margin:'0 0 8px'}}>⚠️</p>
                <p style={{color:'#DC2626',fontWeight:600,margin:'0 0 12px'}}>{result.error}</p>
                <button onClick={() => {setPhoto(null);setResult(null)}}
                  style={{padding:'8px 20px',background:'#fff',border:'1px solid #E8E8E8',borderRadius:8,color:'#555',fontSize:13,cursor:'pointer'}}>
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Historial */}
        {tab === 'historial' && (
          <div>
            {logs.length === 0 ? (
              <div style={{background:'#fff',borderRadius:16,padding:40,textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <p style={{fontSize:32,margin:'0 0 8px'}}>📋</p>
                <p style={{fontWeight:600,color:'#888',margin:0}}>Sin registros todavía</p>
                <p style={{fontSize:13,color:'#aaa',marginTop:4}}>Tus comidas de hoy aparecerán aquí</p>
              </div>
            ) : logs.map((log, i) => (
              <div key={i} style={{background:'#fff',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{fontWeight:600,margin:'0 0 3px',fontSize:14}}>{log.descripcion}</p>
                  <p style={{color:'#aaa',fontSize:12,margin:0}}>{log.proteina_g}g prot · {log.carbos_g}g carbos · {log.grasa_g}g grasa</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{color:'#0F6E56',fontWeight:800,fontSize:16,margin:0}}>{log.calorias}</p>
                  <p style={{color:'#aaa',fontSize:10,margin:0}}>kcal</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #EBEBEB',display:'flex',padding:'8px 0 20px'}}>
        {[
          {id:'inicio', icon:'🏠', label:'Inicio'},
          {id:'registrar', icon:'📸', label:'Registrar'},
          {id:'historial', icon:'📊', label:'Historial'},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{flex:1,background:'transparent',border:'none',cursor:'pointer',padding:'6px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:11,fontWeight: tab===t.id ? 700 : 400, color: tab===t.id ? '#0F6E56' : '#aaa'}}>{t.label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}