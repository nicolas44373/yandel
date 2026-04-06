import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Profile = {
  id: string
  nombre: string | null
  organizacion: string | null
  rol: string
  created_at: string
}

const ROLES = ["admin", "operador", "solo_lectura"]

export function GestionEmpleados() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: "",
    password: "",
    nombre: "",
    organizacion: "",
    rol: "operador",
  })

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) setProfiles(data)
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    // 1. Guardar sesión del admin actual
    const { data: sessionData } = await supabase.auth.getSession()
    const adminSession = sessionData.session

    // 2. Crear el nuevo usuario en Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || "Error al crear el usuario.")
      setSubmitting(false)
      return
    }

    const newUserId = signUpData.user.id

    // 3. Insertar perfil en la tabla profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: newUserId,
      nombre: form.nombre,
      organizacion: form.organizacion,
      rol: form.rol,
    })

    if (profileError) {
      setError("Usuario creado pero hubo un error al guardar el perfil: " + profileError.message)
    } else {
      setSuccess(`Empleado "${form.nombre}" creado correctamente.`)
      setForm({ email: "", password: "", nombre: "", organizacion: "", rol: "operador" })
      setShowForm(false)
      fetchProfiles()
    }

    // 4. Restaurar sesión del admin
    if (adminSession) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    }

    setSubmitting(false)
  }

  const handleDelete = async (id: string, nombre: string | null) => {
    if (!confirm(`¿Eliminar el perfil de "${nombre || id}"? Esto no elimina el usuario de Auth.`)) return

    const { error } = await supabase.from("profiles").delete().eq("id", id)
    if (error) {
      setError("Error al eliminar: " + error.message)
    } else {
      setProfiles((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const rolLabel: Record<string, string> = {
    admin: "Administrador",
    operador: "Operador",
    solo_lectura: "Solo Lectura",
  }

  const rolColor: Record<string, string> = {
    admin: "bg-violet-900 text-violet-300",
    operador: "bg-blue-900 text-blue-300",
    solo_lectura: "bg-gray-700 text-gray-300",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">Gestión de Empleados</h2>
        <Button onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null) }}>
          {showForm ? "Cancelar" : "+ Nuevo empleado"}
        </Button>
      </div>

      {success && (
        <p className="rounded-md bg-emerald-900 px-4 py-2 text-sm text-emerald-300">{success}</p>
      )}
      {error && (
        <p className="rounded-md bg-rose-900 px-4 py-2 text-sm text-rose-300">{error}</p>
      )}

      {showForm && (
        <Card className="border-gray-700 bg-gray-800">
          <CardHeader>
            <CardTitle className="text-base text-gray-100">Crear nuevo empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="empleado@ejemplo.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="organizacion">Organización</Label>
                <Input
                  id="organizacion"
                  name="organizacion"
                  value={form.organizacion}
                  onChange={handleChange}
                  placeholder="Nicem"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="rol">Rol</Label>
                <select
                  id="rol"
                  name="rol"
                  value={form.rol}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{rolLabel[r]}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Creando..." : "Crear empleado"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando perfiles...</p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-gray-500">No hay perfiles registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Organización</th>
                  <th className="pb-2 pr-4">Rol</th>
                  <th className="pb-2 pr-4">Creado</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800 text-gray-300">
                    <td className="py-2 pr-4">{p.nombre || <span className="text-gray-600">—</span>}</td>
                    <td className="py-2 pr-4">{p.organizacion || <span className="text-gray-600">—</span>}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rolColor[p.rol] ?? "bg-gray-700 text-gray-300"}`}>
                        {rolLabel[p.rol] ?? p.rol}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDelete(p.id, p.nombre)}
                        className="text-xs text-rose-500 hover:text-rose-400"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}