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

  const tips = [
    '"Lo que no se mide, no mejora."',
    '"Un pequeño cambio diario = gran resultado."',
    '"Conocer lo que comes es el primer paso."',
  ]
  const tip = tips[new Date().getDay() % tips.length]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-700 to-emerald-600 px-6 pt-14 pb-16 text-center">
        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
          🥗
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">MeCuido</h1>
        <p className="text-emerald-100 text-sm mb-8">Nutrición inteligente con IA</p>

        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          {[
            { icon: '📸', text: 'Foto → calorías al instante' },
            { icon: '🎯', text: 'Plan personalizado por tu nutriólogo' },
            { icon: '🤖', text: 'IA nutricional con equivalentes SMAE' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
              <span className="text-lg">{f.icon}</span>
              <span className="text-sm text-white/90 font-medium text-left">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl -mt-5 px-6 pt-8 pb-10">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Inicia sesión</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm mb-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm mb-5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base rounded-xl shadow-md shadow-emerald-200 transition mb-4"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-gray-500 mb-8">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-emerald-700 font-bold">Regístrate gratis</a>
          </p>

          {/* Frase del día */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-center">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Frase del día</p>
            <p className="text-sm text-gray-600 italic leading-relaxed">{tip}</p>
          </div>
        </div>
      </div>

    </div>
  )
}