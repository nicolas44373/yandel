import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, DollarSign, Banknote, CreditCard } from "lucide-react"
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

function useLineData(transacciones: any[]) {
  return useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const fecha = subMonths(new Date(), 5 - i)
      const mes   = transacciones.filter(t => isSameMonth(new Date(t.fecha), fecha))
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
  const { cajaActual, historial, loading: loadingCaja, isAdmin } = useCaja()

  const lineData = useLineData(transacciones)

  const stats = useMemo(() => {
    const lastMonth   = subMonths(new Date(), 1)
    const mesActual   = transacciones.filter(t => isThisMonth(new Date(t.fecha)))
    const mesAnterior = transacciones.filter(t => isSameMonth(new Date(t.fecha), lastMonth))

    const sum = (arr: any[], tipo: string) =>
      arr.filter(t => t.tipo === tipo).reduce((a, c) => a + c.monto, 0)

    // ── Mes actual / anterior ────────────────────────────────────────────────
    const ingresosMes    = sum(mesActual,   "ingreso")
    const gastosMes      = sum(mesActual,   "gasto")
    const ingresosMesAnt = sum(mesAnterior, "ingreso")
    const gastosMesAnt   = sum(mesAnterior, "gasto")

    const variacion = (actual: number, anterior: number) =>
      anterior === 0 ? 100 : ((actual - anterior) / anterior) * 100

    // ── Saldo acumulado por medio — calculado solo desde transacciones ────────
    // Así el resultado SIEMPRE coincide con el CSV exportado desde Movimientos,
    // ya que ambos leen exactamente las mismas filas de la base de datos.
    const sumarMedio = (medio: string | string[]) => {
      const medios = Array.isArray(medio) ? medio : [medio]
      return transacciones
        .filter(t => medios.includes(t.medio_pago))
        .reduce((acc, t) => t.tipo === "ingreso" ? acc + t.monto : acc - t.monto, 0)
    }

    const saldoEfectivo      = sumarMedio("efectivo")
    const saldoTransferencia = sumarMedio("transferencia")
    const saldoMercadoPago   = sumarMedio("mercado_pago")
    const saldoTarjetas      = sumarMedio(["tarjeta_credito", "tarjeta_debito"])
    const saldoDigital       = saldoTransferencia + saldoMercadoPago + saldoTarjetas
    const saldoTotal         = saldoEfectivo + saldoDigital

    const cajaMasReciente = historial.length > 0
      ? [...historial].sort(
          (a, b) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime()
        )[0]
      : null

    // ── Pie por categoría (mes actual) ──────────────────────────────────────
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
      ingresosMes, gastosMes,
      netoMes:           ingresosMes - gastosMes,
      variacionIngresos: variacion(ingresosMes, ingresosMesAnt),
      variacionGastos:   variacion(gastosMes,   gastosMesAnt),
      saldoEfectivo, saldoDigital, saldoTotal,
      saldoTransferencia, saldoMercadoPago, saldoTarjetas,
      cajaMasReciente,
      pieData,
    }
  }, [transacciones, historial])

  if (loadingTrans || loadingCaja) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        Cargando dashboard...
      </div>
    )
  }

  const {
    ingresosMes, gastosMes, netoMes,
    variacionIngresos, variacionGastos,
    saldoEfectivo, saldoDigital, saldoTotal,
    saldoTransferencia, saldoMercadoPago, saldoTarjetas,
    cajaMasReciente,
    pieData,
  } = stats

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100 md:text-3xl">Dashboard</h2>
        <p className="text-sm text-gray-400">Resumen general del negocio.</p>
      </div>

      {/* ── KPIs del mes ──────────────────────────────────────────────────── */}
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
            <CardTitle className="text-xs font-medium text-gray-400">Neto del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-xl font-bold md:text-2xl ${netoMes >= 0 ? "text-gray-100" : "text-rose-400"}`}>
              {netoMes >= 0 ? "+" : ""}{formatCurrency(netoMes)}
            </div>
            <p className="text-xs text-gray-500">Solo este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-400">
              {isAdmin ? "Cajas abiertas" : "Caja"}
            </CardTitle>
            <Wallet className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isAdmin ? (
              <>
                <div className="text-xl font-bold text-gray-100 md:text-2xl">
                  {historial.filter(c => c.estado === "abierta").length} abiertas
                </div>
                <p className="text-xs text-gray-500">Cajas activas ahora</p>
              </>
            ) : (
              <>
                <div className={`text-xl font-bold md:text-2xl ${cajaActual ? "text-emerald-400" : "text-gray-500"}`}>
                  {cajaActual ? "Abierta" : "Cerrada"}
                </div>
                <p className="text-xs text-gray-500">
                  {cajaActual
                    ? `Desde ${formatCurrency(cajaActual.saldo_apertura)}`
                    : "Sin caja activa"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Saldo acumulado total ─────────────────────────────────────────── */}
      <Card className="border-violet-500/20 bg-gray-900">
        <CardHeader className="pb-2 pt-5 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-gray-100 md:text-lg">
                Saldo Total Acumulado
              </CardTitle>
              <p className="mt-0.5 text-xs text-gray-500">
                Suma de todos los movimientos registrados · coincide con el CSV
              </p>
            </div>
            <div className={`text-2xl font-bold md:text-3xl ${saldoTotal >= 0 ? "text-violet-300" : "text-rose-400"}`}>
              {saldoTotal >= 0 ? "+" : ""}{formatCurrency(saldoTotal)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {/* Efectivo */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Efectivo</span>
              </div>
              <p className={`font-mono text-lg font-bold ${saldoEfectivo >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                {saldoEfectivo >= 0 ? "+" : ""}{formatCurrency(saldoEfectivo)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Dinero físico en caja</p>
            </div>

            {/* Transferencias */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-900/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">Transferencias</span>
              </div>
              <p className={`font-mono text-lg font-bold ${saldoTransferencia >= 0 ? "text-blue-300" : "text-rose-400"}`}>
                {saldoTransferencia >= 0 ? "+" : ""}{formatCurrency(saldoTransferencia)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">En cuenta bancaria</p>
            </div>

            {/* Mercado Pago */}
            <div className="rounded-lg border border-sky-500/20 bg-sky-900/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-sky-400" />
                <span className="text-xs text-sky-400 font-medium">Mercado Pago</span>
              </div>
              <p className={`font-mono text-lg font-bold ${saldoMercadoPago >= 0 ? "text-sky-300" : "text-rose-400"}`}>
                {saldoMercadoPago >= 0 ? "+" : ""}{formatCurrency(saldoMercadoPago)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">En cuenta MP</p>
            </div>

            {/* Tarjetas */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-900/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">Tarjetas</span>
              </div>
              <p className={`font-mono text-lg font-bold ${saldoTarjetas >= 0 ? "text-amber-300" : "text-rose-400"}`}>
                {saldoTarjetas >= 0 ? "+" : ""}{formatCurrency(saldoTarjetas)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Crédito y débito</p>
            </div>

          </div>

          {/* Barra proporcional */}
          {saldoTotal > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-gray-500">
                <span>Distribución del saldo total</span>
                <span>{saldoEfectivo >= 0 ? ((saldoEfectivo / saldoTotal) * 100).toFixed(0) : 0}% efectivo</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-800">
                {saldoEfectivo > 0 && (
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.max(0, (saldoEfectivo / saldoTotal) * 100)}%` }}
                  />
                )}
                {saldoTransferencia > 0 && (
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.max(0, (saldoTransferencia / saldoTotal) * 100)}%` }}
                  />
                )}
                {saldoMercadoPago > 0 && (
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${Math.max(0, (saldoMercadoPago / saldoTotal) * 100)}%` }}
                  />
                )}
                {saldoTarjetas > 0 && (
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.max(0, (saldoTarjetas / saldoTotal) * 100)}%` }}
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Efectivo</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />Transferencia</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" />Mercado Pago</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Tarjetas</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Gráficos ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-7">

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

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Distribución de Ingresos</CardTitle>
            <p className="text-xs text-gray-500">Por categoría este mes</p>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
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
