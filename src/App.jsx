import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PatientPage from './pages/PatientPage'
import NutritionistPage from './pages/NutritionistPage'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0a0a0a',color:'#fff'}}>Cargando...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/registro" element={!session ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/" element={
          !session ? <Navigate to="/login" /> :
          profile?.role === 'nutritionist' ? <NutritionistPage profile={profile} /> :
          <PatientPage profile={profile} />
        } />
      </Routes>
    </BrowserRouter>
  )
}