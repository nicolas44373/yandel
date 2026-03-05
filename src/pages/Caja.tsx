import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle } from "lucide-react"
import { useCaja } from "@/hooks/useCaja"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useState } from "react"
import { isToday } from "date-fns"
import { useAuth } from "@/contexts/AuthContext"

export function Caja() {
  const { cajaActual, abrirCaja, cerrarCaja, loading: loadingCaja } = useCaja()
  const { transacciones, loading: loadingTrans } = useTransacciones()
  const { profile } = useAuth()
  const [saldoApertura, setSaldoApertura] = useState("")
  const [efectivoContado, setEfectivoContado] = useState("")
  const [observaciones, setObservaciones] = useState("")

  const isReadOnly = profile?.rol === 'solo_lectura'

  const transaccionesHoy = transacciones.filter(t => isToday(new Date(t.fecha)))
  
  const ingresosEfectivo = transaccionesHoy
    .filter(t => t.tipo === 'ingreso' && t.medio_pago === 'efectivo')
    .reduce((acc, curr) => acc + curr.monto, 0)

  const gastosEfectivo = transaccionesHoy
    .filter(t => t.tipo === 'gasto' && t.medio_pago === 'efectivo')
    .reduce((acc, curr) => acc + curr.monto, 0)

  const saldoTeorico = (cajaActual?.saldo_apertura || 0) + ingresosEfectivo - gastosEfectivo

  const transferencias = transaccionesHoy
    .filter(t => t.tipo === 'ingreso' && t.medio_pago === 'transferencia')
    .reduce((acc, curr) => acc + curr.monto, 0)

  const mercadoPago = transaccionesHoy
    .filter(t => t.tipo === 'ingreso' && t.medio_pago === 'mercado_pago')
    .reduce((acc, curr) => acc + curr.monto, 0)

  const tarjetas = transaccionesHoy
    .filter(t => t.tipo === 'ingreso' && (t.medio_pago === 'tarjeta_credito' || t.medio_pago === 'tarjeta_debito'))
    .reduce((acc, curr) => acc + curr.monto, 0)

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    await abrirCaja(parseFloat(saldoApertura))
  }

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (cajaActual) {
      await cerrarCaja(cajaActual.id, parseFloat(efectivoContado), observaciones)
    }
  }

  if (loadingCaja || loadingTrans) {
    return <div className="text-gray-400">Cargando caja...</div>
  }

  if (!cajaActual) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-100">Caja Cerrada</h2>
          <p className="text-gray-400">Abre la caja para comenzar a operar.</p>
        </div>
        {!isReadOnly && (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Apertura de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAbrirCaja} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="saldo_apertura">Saldo Inicial (Efectivo en caja)</Label>
                  <Input 
                    id="saldo_apertura" 
                    type="number" 
                    step="0.01"
                    required
                    value={saldoApertura}
                    onChange={(e) => setSaldoApertura(e.target.value)}
                    placeholder="0.00" 
                  />
                </div>
                <Button type="submit" className="w-full">Abrir Caja</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-100">Caja Actual</h2>
          <p className="text-gray-400">Control de efectivo en el local.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Saldo Apertura</CardTitle>
            <Wallet className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">{formatCurrency(cajaActual.saldo_apertura)}</div>
            <p className="text-xs text-gray-500">Hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Ingresos Efectivo</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(ingresosEfectivo)}</div>
            <p className="text-xs text-gray-500">Hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Gastos Efectivo</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">-{formatCurrency(gastosEfectivo)}</div>
            <p className="text-xs text-gray-500">Hoy</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Saldo Teórico</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(saldoTeorico)}</div>
            <p className="text-xs text-emerald-400/80">Apertura + Ingresos - Gastos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {!isReadOnly && (
          <Card>
            <CardHeader>
              <CardTitle>Arqueo de Caja (Cierre)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCerrarCaja} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="efectivo_real">Efectivo Contado Físicamente (ARS)</Label>
                  <Input 
                    id="efectivo_real" 
                    type="number" 
                    step="0.01"
                    required
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                    placeholder="Ingrese el monto exacto en caja" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input 
                    id="observaciones" 
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Faltan $500 por vuelto" 
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full" variant="outline">Realizar Cierre de Caja</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Resumen Otros Medios (Hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-400">Transferencias</span>
                <span className="font-mono text-emerald-400">{formatCurrency(transferencias)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-400">Mercado Pago</span>
                <span className="font-mono text-emerald-400">{formatCurrency(mercadoPago)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-400">Tarjetas de Crédito/Débito</span>
                <span className="font-mono text-emerald-400">{formatCurrency(tarjetas)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-medium text-gray-100">Total No Efectivo</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(transferencias + mercadoPago + tarjetas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
