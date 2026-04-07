import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useCaja } from "@/hooks/useCaja"
import { isThisMonth, isSameMonth, subMonths, format } from "date-fns"
import { es } from "date-fns/locale"

const COLORS = ["#00d4aa", "#60a5fa", "#fbbf24", "#a78bfa", "#34d399", "#f472b6", "#94a3b8"]

// Genera los últimos 6 meses con datos reales en el último
function useLineData(transacciones: any[]) {
  return useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const fecha  = subMonths(new Date(), 5 - i)
      const mes    = transacciones.filter(t => isSameMonth(new Date(t.fecha), fecha))
      return {
        name:     format(fecha, "MMM", { locale: es }),
        ingresos: mes.filter(t => t.tipo === "ingreso").reduce((a, c) => a + c.monto, 0),
        gastos:   mes.filter(t => t.tipo === "gasto").reduce((a, c) => a + c.monto, 0),
      }
    })
  }, [transacciones])
}

export function Dashboard() {
  const { transacciones, loading: loadingTrans } = useTransacciones()
  const { cajaActual, loading: loadingCaja, totalCajasAbiertas, isAdmin } = useCaja()

  const lineData = useLineData(transacciones)

  const {
    ingresosMes, gastosMes, saldoNeto,
    variacionIngresos, variacionGastos,
    pieData,
  } = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1)

    const mesActual   = transacciones.filter(t => isThisMonth(new Date(t.fecha)))
    const mesAnterior = transacciones.filter(t => isSameMonth(new Date(t.fecha), lastMonth))

    const sum = (arr: any[], tipo: string) =>
      arr.filter(t => t.tipo === tipo).reduce((a, c) => a + c.monto, 0)

    const ingresosMes      = sum(mesActual,   "ingreso")
    const gastosMes        = sum(mesActual,   "gasto")
    const ingresosMesAnt   = sum(mesAnterior, "ingreso")
    const gastosMesAnt     = sum(mesAnterior, "gasto")

    const variacion = (actual: number, anterior: number) =>
      anterior === 0 ? 100 : ((actual - anterior) / anterior) * 100

    // Pie: ingresos del mes agrupados por categoría
    const porCategoria = mesActual
      .filter(t => t.tipo === "ingreso")
      .reduce((acc: Record<string, number>, t: any) => {
        const cat = t.categoria_ingreso?.nombre ?? "Sin categoría"
        acc[cat]  = (acc[cat] ?? 0) + t.monto
        return acc
      }, {})

    const pieData = Object.entries(porCategoria).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length],
    }))

    return {
      ingresosMes,
      gastosMes,
      saldoNeto:         ingresosMes - gastosMes,
      variacionIngresos: variacion(ingresosMes, ingresosMesAnt),
      variacionGastos:   variacion(gastosMes,   gastosMesAnt),
      pieData,
    }
  }, [transacciones])

  if (loadingTrans || loadingCaja) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        Cargando dashboard...
      </div>
    )
  }

  // KPI de caja: admin ve el total de todas las cajas abiertas
  const cajaLabel = isAdmin
    ? totalCajasAbiertas > 0 ? formatCurrency(totalCajasAbiertas) : "Sin cajas"
    : cajaActual ? formatCurrency(cajaActual.saldo_apertura) : "Cerrada"

  const cajaSubtitle = isAdmin ? "Suma de cajas abiertas" : "Saldo actual en caja"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100 md:text-3xl">Dashboard</h2>
        <p className="text-sm text-gray-400">Resumen general del negocio.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-400">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-gray-100 md:text-2xl">
              {formatCurrency(ingresosMes)}
            </div>
            <p className={`text-xs ${variacionIngresos >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {variacionIngresos >= 0 ? "+" : ""}{variacionIngresos.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-400">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-gray-100 md:text-2xl">
              {formatCurrency(gastosMes)}
            </div>
            <p className={`text-xs ${variacionGastos <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {variacionGastos > 0 ? "+" : ""}{variacionGastos.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-400">Saldo Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-gray-100 md:text-2xl">
              {formatCurrency(saldoNeto)}
            </div>
            <p className="text-xs text-gray-500">Ingresos − Gastos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-400">Caja Efectivo</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-gray-100 md:text-2xl">{cajaLabel}</div>
            <p className="text-xs text-gray-500">{cajaSubtitle}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-7">

        {/* Line chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Evolución Ingresos vs Gastos</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ left: 0, right: 8, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "#f3f4f6",
                    fontSize: 12,
                  }}
                  formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                />
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Ingresos"
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke="#fb7185"
                  strokeWidth={2}
                  dot={false}
                  name="Gastos"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Distribución de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        borderColor: "#374151",
                        color: "#f3f4f6",
                        fontSize: 12,
                      }}
                      formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Leyenda */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center text-sm text-gray-500" style={{ height: 260 }}>
                No hay datos suficientes
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}