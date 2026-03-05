import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("admin") // Para el entorno mock
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      navigate("/")
    }
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Simular login para el entorno de desarrollo si no hay credenciales de Supabase
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')) {
      setTimeout(() => {
        localStorage.setItem('mock_user', 'true')
        localStorage.setItem('mock_role', role)
        // Recargar para que el AuthProvider detecte los cambios
        window.location.reload()
      }, 500)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate("/")
    }
  }

  const isMockEnv = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-md border-gray-800 bg-gray-900">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-100">
            Malas Influencias
          </CardTitle>
          <p className="text-sm text-gray-400">
            Ingresa tus credenciales para acceder al sistema de caja.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rol (Modo Demo)</Label>
              <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Administrador</option>
                <option value="operador">Operador (Caja y Transacciones)</option>
                <option value="solo_lectura">Solo Lectura</option>
              </Select>
              <p className="text-xs text-gray-500">
                Selecciona un rol y haz clic en "Entrar en Modo Demo" para probar.
              </p>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}
            
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar Sesión (Supabase)"}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                className="w-full" 
                onClick={(e) => {
                  e.preventDefault()
                  setLoading(true)
                  setTimeout(() => {
                    localStorage.setItem('mock_user', 'true')
                    localStorage.setItem('mock_role', role)
                    window.location.reload()
                  }, 500)
                }} 
                disabled={loading}
              >
                Entrar en Modo Demo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
