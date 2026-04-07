import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Download } from "lucide-react"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useAuth } from "@/hooks/useAuth"

export function Movimientos() {
  const { transacciones, loading, isAdmin } = useTransacciones()
  const { profile } = useAuth()

  const [filtroTipo,  setFiltroTipo]  = useState("")
  const [filtroMedio, setFiltroMedio] = useState("")
  const [busqueda,    setBusqueda]    = useState("")

  const transaccionesFiltradas = useMemo(() =>
    transacciones.filter((mov: any) => {
      const matchTipo    = filtroTipo   ? mov.tipo      === filtroTipo   : true
      const matchMedio   = filtroMedio  ? mov.medio_pago === filtroMedio : true
      const matchBusqueda = busqueda
        ? mov.concepto.toLowerCase().includes(busqueda.toLowerCase())
        : true
      return matchTipo && matchMedio && matchBusqueda
    }),
    [transacciones, filtroTipo, filtroMedio, busqueda]
  )

  // Totales del filtro activo
  const totales = useMemo(() => ({
    ingresos: transaccionesFiltradas
      .filter(m => m.tipo === "ingreso")
      .reduce((s, m) => s + m.monto, 0),
    gastos: transaccionesFiltradas
      .filter(m => m.tipo === "gasto")
      .reduce((s, m) => s + m.monto, 0),
  }), [transaccionesFiltradas])

  const handleExportCSV = () => {
    const headers = ["Fecha", "Tipo", "Concepto", "Categoría", "Medio", "Monto"]
    const rows = transaccionesFiltradas.map((m: any) => [
      formatDate(m.fecha),
      m.tipo,
      m.concepto,
      m.tipo === "ingreso"
        ? (m.categoria_ingreso?.nombre ?? "Sin categoría")
        : (m.categoria_gasto?.nombre  ?? "Sin categoría"),
      m.medio_pago.replace(/_/g, " "),
      m.tipo === "ingreso" ? m.monto : -m.monto,
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 px-1">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100 md:text-3xl">Movimientos</h2>
          <p className="text-sm text-gray-400">Historial completo de ingresos y gastos.</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* ── Totales rápidos ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500">Ingresos filtrados</p>
          <p className="mt-0.5 font-mono text-base font-bold text-emerald-400">
            +{formatCurrency(totales.ingresos)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500">Gastos filtrados</p>
          <p className="mt-0.5 font-mono text-base font-bold text-rose-400">
            -{formatCurrency(totales.gastos)}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 sm:col-span-1">
          <p className="text-xs text-gray-500">Neto filtrado</p>
          <p className={`mt-0.5 font-mono text-base font-bold ${
            totales.ingresos - totales.gastos >= 0 ? "text-gray-100" : "text-rose-400"
          }`}>
            {totales.ingresos - totales.gastos >= 0 ? "+" : ""}
            {formatCurrency(totales.ingresos - totales.gastos)}
          </p>
        </div>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              type="text"
              placeholder="Buscar por concepto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="sm:col-span-1"
            />
            <Select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </Select>
            <Select
              value={filtroMedio}
              onChange={(e) => setFiltroMedio(e.target.value)}
            >
              <option value="">Todos los medios</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercado_pago">Mercado Pago</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-0">

          {/* ── Vista mobile: cards ─────────────────────────────────────── */}
          <div className="block sm:hidden">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-500">Cargando...</p>
            ) : transaccionesFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No hay movimientos</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {transaccionesFiltradas.map((mov: any) => (
                  <div key={mov.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={mov.tipo === "ingreso" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {mov.tipo}
                        </Badge>
                        <p className="truncate text-sm font-medium text-gray-100">
                          {mov.concepto}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(mov.fecha)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {mov.tipo === "ingreso"
                            ? (mov.categoria_ingreso?.nombre ?? "Sin categoría")
                            : (mov.categoria_gasto?.nombre  ?? "Sin categoría")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {mov.medio_pago.replace(/_/g, " ")}
                        </Badge>
                        {isAdmin && mov.empleado_nombre && (
                          <Badge className="border-violet-700 bg-violet-900/50 text-xs text-violet-300">
                            {mov.empleado_nombre}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 font-mono text-sm font-semibold ${
                      mov.tipo === "ingreso" ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {mov.tipo === "ingreso" ? "+" : "-"}{formatCurrency(mov.monto)}
                    </span>
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
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Medio</th>
                    {isAdmin && <th className="px-4 py-3">Empleado</th>}
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-gray-500">
                        Cargando...
                      </td>
                    </tr>
                  ) : transaccionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-gray-500">
                        No hay movimientos
                      </td>
                    </tr>
                  ) : (
                    transaccionesFiltradas.map((mov: any) => (
                      <tr key={mov.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-gray-400">{formatDate(mov.fecha)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={mov.tipo === "ingreso" ? "default" : "destructive"}>
                            {mov.tipo}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-100">{mov.concepto}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {mov.tipo === "ingreso"
                              ? (mov.categoria_ingreso?.nombre ?? "Sin categoría")
                              : (mov.categoria_gasto?.nombre  ?? "Sin categoría")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {mov.medio_pago.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {mov.empleado_nombre ?? "—"}
                          </td>
                        )}
                        <td className={`px-4 py-3 text-right font-mono ${
                          mov.tipo === "ingreso" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {mov.tipo === "ingreso" ? "+" : "-"}{formatCurrency(mov.monto)}
                        </td>
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