import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Trash2 } from "lucide-react"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useCategorias } from "@/hooks/useCategorias"
import { useForm } from "react-hook-form"
import { useAuth } from "@/contexts/AuthContext"

export function Gastos() {
  const [showForm, setShowForm] = useState(false)
  const { transacciones, loading: loadingTrans, addTransaccion, deleteTransaccion } = useTransacciones('gasto')
  const { categorias, loading: loadingCat } = useCategorias('gasto')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()
  const { profile } = useAuth()

  const isReadOnly = profile?.rol === 'solo_lectura'
  const canDelete = profile?.rol === 'admin'

  const onSubmit = async (data: any) => {
    if (isReadOnly) return

    const categoriaSeleccionada = categorias.find(c => c.id === data.categoria)

    const newGasto = {
      tipo: 'gasto' as const,
      concepto: data.concepto,
      monto: parseFloat(data.monto),
      medio_pago: data.medio,
      categoria_gasto_id: data.categoria || null,
      categoria_gasto: categoriaSeleccionada ? { nombre: categoriaSeleccionada.nombre } : null,
      fecha: new Date().toISOString()
    }
    
    const { error } = await addTransaccion(newGasto)
    if (!error) {
      reset()
      setShowForm(false)
    } else {
      alert("Error al guardar: " + error)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-100">Gastos</h2>
          <p className="text-gray-400">Gestiona los gastos del negocio.</p>
        </div>
        {!isReadOnly && (
          <Button variant="destructive" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
          </Button>
        )}
      </div>

      {showForm && !isReadOnly && (
        <Card className="bg-gray-900 border-rose-500/20">
          <CardHeader>
            <CardTitle className="text-rose-400">Registrar Nuevo Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto</Label>
                <Input id="concepto" placeholder="Ej: Compra de insumos" {...register("concepto", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monto">Monto (ARS)</Label>
                <Input id="monto" type="number" step="0.01" placeholder="0.00" {...register("monto", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select id="categoria" {...register("categoria")}>
                  <option value="">Seleccionar...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medio">Medio de Pago</Label>
                <Select id="medio" {...register("medio", { required: true })}>
                  <option value="">Seleccionar...</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta_credito">Tarjeta Crédito</option>
                </Select>
              </div>
              <div className="col-span-2 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button variant="destructive" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar Gasto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Últimos Gastos</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="Buscar..." className="h-8" />
            <Button size="icon" variant="outline" className="h-8 w-8"><Search className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-800">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  {canDelete && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {loadingTrans ? (
                  <tr><td colSpan={canDelete ? 6 : 5} className="text-center py-4 text-gray-500">Cargando...</td></tr>
                ) : transacciones.length === 0 ? (
                  <tr><td colSpan={canDelete ? 6 : 5} className="text-center py-4 text-gray-500">No hay gastos registrados</td></tr>
                ) : (
                  transacciones.map((gasto: any) => (
                    <tr key={gasto.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">{formatDate(gasto.fecha)}</td>
                      <td className="px-4 py-3 font-medium text-gray-100">{gasto.concepto}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{gasto.categoria_gasto?.nombre || 'Sin categoría'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {gasto.medio_pago.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-400">
                        -{formatCurrency(gasto.monto)}
                      </td>
                      {canDelete && (
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10" onClick={() => deleteTransaccion(gasto.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
