import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Search, Download } from "lucide-react"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useState } from "react"

export function Movimientos() {
  const { transacciones, loading } = useTransacciones()
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroMedio, setFiltroMedio] = useState("")
  const [busqueda, setBusqueda] = useState("")

  const transaccionesFiltradas = transacciones.filter((mov: any) => {
    const matchTipo = filtroTipo ? mov.tipo === filtroTipo : true
    const matchMedio = filtroMedio ? mov.medio_pago === filtroMedio : true
    const matchBusqueda = busqueda ? mov.concepto.toLowerCase().includes(busqueda.toLowerCase()) : true
    return matchTipo && matchMedio && matchBusqueda
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-100">Movimientos</h2>
          <p className="text-gray-400">Historial completo de ingresos y gastos.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                type="text" 
                placeholder="Buscar por concepto..." 
                className="w-full"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select className="w-full md:w-[180px]" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </Select>
            <Select className="w-full md:w-[180px]" value={filtroMedio} onChange={(e) => setFiltroMedio(e.target.value)}>
              <option value="">Todos los medios</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercado_pago">Mercado Pago</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-800">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-500">Cargando...</td></tr>
                ) : transaccionesFiltradas.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-500">No hay movimientos</td></tr>
                ) : (
                  transaccionesFiltradas.map((mov: any) => (
                    <tr key={mov.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">{formatDate(mov.fecha)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={mov.tipo === 'ingreso' ? 'default' : 'destructive'}>
                          {mov.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-100">{mov.concepto}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {mov.tipo === 'ingreso' 
                            ? mov.categoria_ingreso?.nombre 
                            : mov.categoria_gasto?.nombre || 'Sin categoría'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {mov.medio_pago.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </td>
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
