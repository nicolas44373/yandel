import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { useCategorias } from "@/hooks/useCategorias"

function CategoriaManager({ tipo }: { tipo: 'ingreso' | 'gasto' }) {
  const { categorias, loading, addCategoria, deleteCategoria } = useCategorias(tipo)
  const [nuevaCategoria, setNuevaCategoria] = useState("")

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaCategoria.trim()) return
    const { error } = await addCategoria(nuevaCategoria.trim())
    if (!error) {
      setNuevaCategoria("")
    } else {
      alert("Error al agregar categoría: " + error)
    }
  }

  return (
    <Card className={`bg-gray-900 border-${tipo === 'ingreso' ? 'emerald' : 'rose'}-500/20`}>
      <CardHeader>
        <CardTitle className={`text-${tipo === 'ingreso' ? 'emerald' : 'rose'}-400`}>
          Categorías de {tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input 
            placeholder="Nueva categoría..." 
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant={tipo === 'ingreso' ? 'default' : 'destructive'}>
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        </form>

        <div className="rounded-md border border-gray-800">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="text-center py-4 text-gray-500">Cargando...</td></tr>
              ) : categorias.length === 0 ? (
                <tr><td colSpan={2} className="text-center py-4 text-gray-500">No hay categorías</td></tr>
              ) : (
                categorias.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-100">{cat.nombre}</td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10"
                        onClick={() => deleteCategoria(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function Configuracion() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-100">Configuración</h2>
        <p className="text-gray-400">Ajustes del sistema y categorías.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <CategoriaManager tipo="ingreso" />
        <CategoriaManager tipo="gasto" />
      </div>
    </div>
  )
}
