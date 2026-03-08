import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { useTransacciones } from "@/hooks/useTransacciones"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react"

const COLORS_INGRESO = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"]
const COLORS_GASTO   = ["#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#fff1f2"]

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm shadow-xl">
      <p className="mb-1 font-semibold text-gray-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm shadow-xl">
      <p className="font-semibold text-gray-200">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function Reportes() {
  const { transacciones, loading } = useTransacciones()
  const [periodoMeses, setPeriodoMeses] = useState(6)

  const ingresos = useMemo(() => transacciones.filter((t: any) => t.tipo === "ingreso"), [transacciones])
  const gastos   = useMemo(() => transacciones.filter((t: any) => t.tipo === "gasto"),   [transacciones])

  const totalIngresos = useMemo(() => ingresos.reduce((s: number, t: any) => s + t.monto, 0), [ingresos])
  const totalGastos   = useMemo(() => gastos.reduce((s: number, t: any) => s + t.monto, 0),   [gastos])
  const balance       = totalIngresos - totalGastos

  // Datos por mes para el gráfico de barras/línea
  const datosPorMes = useMemo(() => {
    const ahora = new Date()
    const mapa: Record<string, { mes: string; Ingresos: number; Gastos: number }> = {}

    for (let i = periodoMeses - 1; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      mapa[key] = { mes: `${MESES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`, Ingresos: 0, Gastos: 0 }
    }

    transacciones.forEach((t: any) => {
      const d = new Date(t.fecha)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!mapa[key]) return
      if (t.tipo === "ingreso") mapa[key].Ingresos += t.monto
      else mapa[key].Gastos += t.monto
    })

    return Object.values(mapa)
  }, [transacciones, periodoMeses])

  // Gastos por categoría
  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {}
    gastos.forEach((t: any) => {
      const nombre = t.categoria_gasto?.nombre || "Sin categoría"
      mapa[nombre] = (mapa[nombre] || 0) + t.monto
    })
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [gastos])

  // Ingresos por categoría
  const ingresosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {}
    ingresos.forEach((t: any) => {
      const nombre = t.categoria_ingreso?.nombre || "Sin categoría"
      mapa[nombre] = (mapa[nombre] || 0) + t.monto
    })
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [ingresos])

  // Por medio de pago
  const porMedioPago = useMemo(() => {
    const mapa: Record<string, { medio: string; Ingresos: number; Gastos: number }> = {}
    transacciones.forEach((t: any) => {
      const medio = t.medio_pago?.replace(/_/g, " ") || "otro"
      if (!mapa[medio]) mapa[medio] = { medio, Ingresos: 0, Gastos: 0 }
      if (t.tipo === "ingreso") mapa[medio].Ingresos += t.monto
      else mapa[medio].Gastos += t.monto
    })
    return Object.values(mapa).sort((a, b) => (b.Ingresos + b.Gastos) - (a.Ingresos + a.Gastos))
  }, [transacciones])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Cargando reportes...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-100">Reportes</h2>
        <p className="text-gray-400">Análisis detallado de las finanzas.</p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-emerald-900/50 p-3">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Ingresos</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalIngresos)}</p>
              <p className="text-xs text-gray-500">{ingresos.length} transacciones</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-rose-900/50 p-3">
              <TrendingDown className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Gastos</p>
              <p className="text-xl font-bold text-rose-400">{formatCurrency(totalGastos)}</p>
              <p className="text-xs text-gray-500">{gastos.length} transacciones</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`rounded-full p-3 ${balance >= 0 ? "bg-emerald-900/50" : "bg-rose-900/50"}`}>
              <DollarSign className={`h-5 w-5 ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Balance Neto</p>
              <p className={`text-xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {balance >= 0 ? "+" : ""}{formatCurrency(balance)}
              </p>
              <p className="text-xs text-gray-500">
                {totalIngresos > 0 ? `${((balance / totalIngresos) * 100).toFixed(1)}% margen` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-violet-900/50 p-3">
              <BarChart2 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Ticket Promedio</p>
              <p className="text-xl font-bold text-violet-400">
                {ingresos.length > 0 ? formatCurrency(totalIngresos / ingresos.length) : "—"}
              </p>
              <p className="text-xs text-gray-500">por ingreso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de evolución mensual */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-100">Evolución Mensual</CardTitle>
          <div className="flex gap-2">
            {[3, 6, 12].map(m => (
              <button
                key={m}
                onClick={() => setPeriodoMeses(m)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  periodoMeses === m
                    ? "bg-violet-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosPorMes} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos"   fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Línea de balance acumulado */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-gray-100">Balance por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={datosPorMes.map(d => ({ ...d, Balance: d.Ingresos - d.Gastos }))}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="Balance"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: "#a78bfa", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie charts por categoría */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gastos por categoría */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-rose-400">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPorCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Sin datos</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={gastosPorCategoria}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {gastosPorCategoria.map((_, i) => (
                        <Cell key={i} fill={COLORS_GASTO[i % COLORS_GASTO.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-2">
                  {gastosPorCategoria.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS_GASTO[i % COLORS_GASTO.length] }} />
                        <span className="text-gray-300">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs">
                          {totalGastos > 0 ? `${((item.value / totalGastos) * 100).toFixed(1)}%` : "—"}
                        </span>
                        <span className="font-mono text-rose-400">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ingresos por categoría */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-emerald-400">Ingresos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {ingresosPorCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Sin datos</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={ingresosPorCategoria}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {ingresosPorCategoria.map((_, i) => (
                        <Cell key={i} fill={COLORS_INGRESO[i % COLORS_INGRESO.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-2">
                  {ingresosPorCategoria.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS_INGRESO[i % COLORS_INGRESO.length] }} />
                        <span className="text-gray-300">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs">
                          {totalIngresos > 0 ? `${((item.value / totalIngresos) * 100).toFixed(1)}%` : "—"}
                        </span>
                        <span className="font-mono text-emerald-400">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Por medio de pago */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-gray-100">Por Medio de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {porMedioPago.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porMedioPago} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="medio" tick={{ fill: "#9ca3af", fontSize: 12 }} width={75} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Gastos"   fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}