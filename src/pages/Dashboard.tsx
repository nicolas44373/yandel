import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useTransacciones } from "@/hooks/useTransacciones"
import { useCaja } from "@/hooks/useCaja"
import { isThisMonth, isSameMonth, subMonths } from "date-fns"

const COLORS = ['#00d4aa', '#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#94a3b8'];

export function Dashboard() {
  const { transacciones, loading: loadingTrans } = useTransacciones()
  const { cajaActual, loading: loadingCaja } = useCaja()

  if (loadingTrans || loadingCaja) {
    return <div className="text-gray-400">Cargando dashboard...</div>
  }

  const lastMonth = subMonths(new Date(), 1)
  const transaccionesMesActual = transacciones.filter(t => isThisMonth(new Date(t.fecha)))
  const transaccionesMesAnterior = transacciones.filter(t => isSameMonth(new Date(t.fecha), lastMonth))

  const ingresosMes = transaccionesMesActual.filter(t => t.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0)
  const gastosMes = transaccionesMesActual.filter(t => t.tipo === 'gasto').reduce((acc, curr) => acc + curr.monto, 0)
  const saldoNeto = ingresosMes - gastosMes

  const ingresosMesAnterior = transaccionesMesAnterior.filter(t => t.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0)
  const gastosMesAnterior = transaccionesMesAnterior.filter(t => t.tipo === 'gasto').reduce((acc, curr) => acc + curr.monto, 0)

  const variacionIngresos = ingresosMesAnterior === 0 ? 100 : ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100
  const variacionGastos = gastosMesAnterior === 0 ? 100 : ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100

  // Agrupar ingresos por categoría para el gráfico de torta
  const ingresosPorCategoria = transaccionesMesActual
    .filter(t => t.tipo === 'ingreso')
    .reduce((acc: any, curr: any) => {
      const cat = curr.categoria_ingreso?.nombre || 'Sin categoría'
      acc[cat] = (acc[cat] || 0) + curr.monto
      return acc
    }, {})

  const pieData = Object.keys(ingresosPorCategoria).map((key, index) => ({
    name: key,
    value: ingresosPorCategoria[key],
    color: COLORS[index % COLORS.length]
  }))

  // Datos mockeados para el gráfico de línea (idealmente agrupar por mes real)
  const data = [
    { name: 'Ene', ingresos: 400000, gastos: 240000 },
    { name: 'Feb', ingresos: 300000, gastos: 139800 },
    { name: 'Mar', ingresos: 200000, gastos: 980000 },
    { name: 'Abr', ingresos: 278000, gastos: 390800 },
    { name: 'May', ingresos: 189000, gastos: 480000 },
    { name: 'Jun', ingresos: ingresosMes, gastos: gastosMes },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-100">Dashboard</h2>
        <p className="text-gray-400">Resumen general del negocio.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">{formatCurrency(ingresosMes)}</div>
            <p className={`text-xs ${variacionIngresos >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {variacionIngresos >= 0 ? '+' : ''}{variacionIngresos.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">{formatCurrency(gastosMes)}</div>
            <p className={`text-xs ${variacionGastos <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {variacionGastos > 0 ? '+' : ''}{variacionGastos.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Saldo Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">{formatCurrency(saldoNeto)}</div>
            <p className="text-xs text-gray-500">Ingresos - Gastos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Caja Efectivo</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">
              {cajaActual ? formatCurrency(cajaActual.saldo_apertura) : 'Cerrada'}
            </div>
            <p className="text-xs text-gray-500">Saldo actual en caja</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Evolución Ingresos vs Gastos</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }} />
                  <Line type="monotone" dataKey="ingresos" stroke="#34d399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gastos" stroke="#fb7185" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribución de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
