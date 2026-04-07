import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useCategorias } from "@/hooks/useCategorias"
import { useForm } from "react-hook-form"
import { useAuth } from "@/hooks/useAuth"

export function Gastos() {
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const { transacciones, loading: loadingTrans, addTransaccion, deleteTransaccion } = useTransacciones("gasto")
  const { categorias } = useCategorias("gasto")
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()
  const { profile } = useAuth()

  const isReadOnly = profile?.rol === "solo_lectura"
  const canDelete  = profile?.rol === "admin"
  const isAdmin    = profile?.rol === "admin"

  const transaccionesFiltradas = transacciones.filter((t) =>
    t.concepto.toLowerCase().includes(busqueda.toLowerCase())
  )

  const onSubmit = async (data: any) => {
    if (isReadOnly) return

    const { error } = await addTransaccion({
      tipo:               "gasto",
      concepto:           data.concepto,
      monto:              parseFloat(data.monto),
      medio_pago:         data.medio,
      categoria_gasto_id: data.categoria || null,
      fecha:              new Date().toISOString(),
    })

    if (!error) {
      reset()
      setShowForm(false)
    } else {
      alert("Error al guardar: " + error)
    }
  }

  return (
    <div className="space-y-6 px-1">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100 md:text-3xl">Gastos</h2>
          <p className="text-sm text-gray-400">Gestiona los gastos del negocio.</p>
        </div>
        {!isReadOnly && (
          <Button
            variant="destructive"
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Cancelar" : "Nuevo Gasto"}
          </Button>
        )}
      </div>

      {/* ── Formulario ──────────────────────────────────────────────────── */}
      {showForm && !isReadOnly && (
        <Card className="border-rose-500/20 bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-rose-400 md:text-lg">
              Registrar Nuevo Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="concepto">Concepto</Label>
                <Input
                  id="concepto"
                  placeholder="Ej: Compra de insumos"
                  {...register("concepto", { required: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="monto">Monto (ARS)</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("monto", { required: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoria">Categoría</Label>
                <Select id="categoria" {...register("categoria")}>
                  <option value="">Seleccionar...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="medio">Medio de Pago</Label>
                <Select id="medio" {...register("medio", { required: true })}>
                  <option value="">Seleccionar...</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta_credito">Tarjeta Crédito</option>
                </Select>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => { setShowForm(false); reset() }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Gasto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Tabla / Cards ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base md:text-lg">Últimos Gastos</CardTitle>
          <Input
            type="text"
            placeholder="Buscar por concepto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 w-full sm:max-w-xs"
          />
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-0">

          {/* ── Vista mobile: cards ─────────────────────────────────────── */}
          <div className="block sm:hidden">
            {loadingTrans ? (
              <p className="py-8 text-center text-sm text-gray-500">Cargando...</p>
            ) : transaccionesFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No hay gastos registrados</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {transaccionesFiltradas.map((gasto: any) => (
                  <div key={gasto.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium text-gray-100">{gasto.concepto}</p>
                      <p className="text-xs text-gray-500">{formatDate(gasto.fecha)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {gasto.categoria_gasto?.nombre ?? "Sin categoría"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {gasto.medio_pago.replace(/_/g, " ")}
                        </Badge>
                        {isAdmin && gasto.empleado_nombre && (
                          <Badge className="border-violet-700 bg-violet-900/50 text-xs text-violet-300">
                            {gasto.empleado_nombre}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-mono text-sm font-semibold text-rose-400">
                        -{formatCurrency(gasto.monto)}
                      </span>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
                          onClick={() => deleteTransaccion(gasto.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Vista desktop: tabla ────────────────────────────────────── */}
          <div className="hidden sm:block">
            <div className="overflow-x-auto rounded-md border border-gray-800">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="border-b border-gray-800 bg-gray-900/50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Medio</th>
                    {isAdmin && <th className="px-4 py-3">Empleado</th>}
                    <th className="px-4 py-3 text-right">Monto</th>
                    {canDelete && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {loadingTrans ? (
                    <tr>
                      <td colSpan={canDelete ? 7 : 6} className="py-8 text-center text-gray-500">
                        Cargando...
                      </td>
                    </tr>
                  ) : transaccionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 7 : 6} className="py-8 text-center text-gray-500">
                        No hay gastos registrados
                      </td>
                    </tr>
                  ) : (
                    transaccionesFiltradas.map((gasto: any) => (
                      <tr key={gasto.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-gray-400">{formatDate(gasto.fecha)}</td>
                        <td className="px-4 py-3 font-medium text-gray-100">{gasto.concepto}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {gasto.categoria_gasto?.nombre ?? "Sin categoría"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {gasto.medio_pago.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {gasto.empleado_nombre ?? "—"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-mono text-rose-400">
                          -{formatCurrency(gasto.monto)}
                        </td>
                        {canDelete && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
                              onClick={() => deleteTransaccion(gasto.id)}
                            >
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
          </div>

        </CardContent>
      </Card>
    </div>
  )
}