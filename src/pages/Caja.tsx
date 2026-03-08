import * as React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle,
  ChevronLeft, ChevronRight, Calendar, AlertTriangle, Clock
} from "lucide-react"
import { useCaja } from "@/hooks/useCaja"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useAuth } from "@/contexts/AuthContext"
import { isToday, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CierreCaja } from "@/types"

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMovimientosDeCaja(transacciones: any[], caja: CierreCaja) {
  const desde = new Date(caja.fecha_apertura).getTime()
  const hasta = caja.fecha_cierre
    ? new Date(caja.fecha_cierre).getTime()
    : Date.now()
  return transacciones.filter((t) => {
    const f = new Date(t.fecha).getTime()
    return f >= desde && f <= hasta
  })
}

function calcularResumen(movimientos: any[], saldoApertura: number) {
  const ingresosEfectivo = movimientos
    .filter((t) => t.tipo === "ingreso" && t.medio_pago === "efectivo")
    .reduce((s, t) => s + t.monto, 0)
  const gastosEfectivo = movimientos
    .filter((t) => t.tipo === "gasto" && t.medio_pago === "efectivo")
    .reduce((s, t) => s + t.monto, 0)
  const transferencias = movimientos
    .filter((t) => t.tipo === "ingreso" && t.medio_pago === "transferencia")
    .reduce((s, t) => s + t.monto, 0)
  const mercadoPago = movimientos
    .filter((t) => t.tipo === "ingreso" && t.medio_pago === "mercado_pago")
    .reduce((s, t) => s + t.monto, 0)
  const tarjetas = movimientos
    .filter((t) => t.tipo === "ingreso" && (t.medio_pago === "tarjeta_credito" || t.medio_pago === "tarjeta_debito"))
    .reduce((s, t) => s + t.monto, 0)
  const totalIngresos = movimientos.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + t.monto, 0)
  const totalGastos   = movimientos.filter((t) => t.tipo === "gasto").reduce((s, t) => s + t.monto, 0)
  const saldoTeorico  = saldoApertura + ingresosEfectivo - gastosEfectivo

  return { ingresosEfectivo, gastosEfectivo, transferencias, mercadoPago, tarjetas, totalIngresos, totalGastos, saldoTeorico }
}

// ─── Sub-componente: Detalle de una caja ────────────────────────────────────

function DetalleCaja({
  caja,
  movimientos,
  onCerrar,
  isReadOnly,
}: {
  caja: CierreCaja
  movimientos: any[]
  onCerrar?: (efectivo: number, obs: string) => Promise<void>
  isReadOnly: boolean
}) {
  const [efectivoContado, setEfectivoContado] = useState("")
  const [observaciones, setObservaciones]     = useState("")
  const [cerrando, setCerrando]               = useState(false)

  const r = calcularResumen(movimientos, caja.saldo_apertura)
  const abierta = caja.estado === "abierta"
  const diferencia = abierta
    ? null
    : (caja.efectivo_contado ?? 0) - r.saldoTeorico

  const handleCierre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCerrar) return
    setCerrando(true)
    await onCerrar(parseFloat(efectivoContado), observaciones)
    setCerrando(false)
  }

  return (
    <div className="space-y-6">
      {/* Estado de la caja */}
      <div className="flex items-center gap-3">
        {abierta ? (
          <Badge className="bg-emerald-900 text-emerald-300 border-emerald-700">
            <Clock className="mr-1 h-3 w-3" /> Abierta
          </Badge>
        ) : (
          <Badge className="bg-gray-800 text-gray-400 border-gray-700">
            Cerrada
          </Badge>
        )}
        <span className="text-sm text-gray-400">
          Apertura: {format(parseISO(caja.fecha_apertura), "dd/MM/yyyy HH:mm", { locale: es })}
        </span>
        {caja.fecha_cierre && (
          <span className="text-sm text-gray-500">
            — Cierre: {format(parseISO(caja.fecha_cierre), "HH:mm", { locale: es })}
          </span>
        )}
      </div>

      {/* Tarjetas resumen */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="rounded-full bg-gray-800 p-2">
              <Wallet className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Saldo Apertura</p>
              <p className="text-lg font-bold text-gray-100">{formatCurrency(caja.saldo_apertura)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="rounded-full bg-emerald-900/50 p-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ingresos Efectivo</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(r.ingresosEfectivo)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="rounded-full bg-rose-900/50 p-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Gastos Efectivo</p>
              <p className="text-lg font-bold text-rose-400">-{formatCurrency(r.gastosEfectivo)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-emerald-500/30 ${abierta ? "bg-emerald-500/5" : "bg-gray-900"}`}>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="rounded-full bg-emerald-900/50 p-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Saldo Teórico</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(r.saldoTeorico)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Otros medios */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base text-gray-100">Otros Medios de Cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Transferencias",          valor: r.transferencias },
              { label: "Mercado Pago",             valor: r.mercadoPago   },
              { label: "Tarjetas Cred./Déb.",      valor: r.tarjetas      },
            ].map(({ label, valor }) => (
              <div key={label} className="flex justify-between border-b border-gray-800 pb-2 text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="font-mono text-emerald-400">{formatCurrency(valor)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 text-sm font-semibold">
              <span className="text-gray-200">Total No Efectivo</span>
              <span className="font-mono text-emerald-400">
                {formatCurrency(r.transferencias + r.mercadoPago + r.tarjetas)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-3 text-sm font-bold">
              <span className="text-gray-100">Total del Día</span>
              <span className="font-mono text-white">{formatCurrency(r.totalIngresos)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Arqueo / resultado cierre */}
        {abierta && !isReadOnly && onCerrar ? (
          <Card className="border-gray-800 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-base text-gray-100">Arqueo y Cierre de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCierre} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="efectivo_real">Efectivo contado físicamente (ARS)</Label>
                  <Input
                    id="efectivo_real"
                    type="number"
                    step="0.01"
                    required
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                    placeholder={formatCurrency(r.saldoTeorico)}
                  />
                  {efectivoContado && (
                    <p className={`text-xs mt-1 ${
                      parseFloat(efectivoContado) - r.saldoTeorico >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}>
                      Diferencia: {formatCurrency(parseFloat(efectivoContado) - r.saldoTeorico)}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Faltan $500 por vuelto"
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={cerrando}>
                  {cerrando ? "Cerrando..." : "Realizar Cierre de Caja"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : !abierta ? (
          <Card className="border-gray-800 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-base text-gray-100">Resultado del Cierre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400">Saldo teórico</span>
                <span className="font-mono text-gray-200">{formatCurrency(r.saldoTeorico)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400">Efectivo contado</span>
                <span className="font-mono text-gray-200">{formatCurrency(caja.efectivo_contado ?? 0)}</span>
              </div>
              <div className="flex justify-between pt-1 font-semibold">
                <span className="text-gray-200">Diferencia</span>
                <span className={`font-mono ${diferencia === null ? "" : diferencia >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {diferencia !== null
                    ? `${diferencia >= 0 ? "+" : ""}${formatCurrency(diferencia)}`
                    : "—"}
                </span>
              </div>
              {diferencia !== null && Math.abs(diferencia) > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-rose-900/20 px-3 py-2 text-xs text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {diferencia > 0 ? "Sobrante en caja" : "Faltante en caja"}
                </div>
              )}
              {caja.observaciones && (
                <p className="rounded-md bg-gray-800 px-3 py-2 text-xs text-gray-400">
                  {caja.observaciones}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Movimientos de esta caja */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base text-gray-100">
            Movimientos ({movimientos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Sin movimientos registrados en esta caja.</p>
          ) : (
            <div className="rounded-md border border-gray-800">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Medio</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <tr key={mov.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                      <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                        {format(parseISO(mov.fecha), "HH:mm")}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-100">{mov.concepto}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">
                          {mov.tipo === "ingreso"
                            ? mov.categoria_ingreso?.nombre
                            : mov.categoria_gasto?.nombre || "Sin categoría"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {mov.medio_pago.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono ${
                        mov.tipo === "ingreso" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {mov.tipo === "ingreso" ? "+" : "-"}{formatCurrency(mov.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function Caja() {
  const { cajaActual, historial, loading: loadingCaja, abrirCaja, cerrarCaja } = useCaja()
  const { transacciones, loading: loadingTrans } = useTransacciones()
  const { profile } = useAuth()

  const [saldoApertura, setSaldoApertura] = useState("")
  const [cajaSeleccionadaIdx, setCajaSeleccionadaIdx] = useState(0)

  const isReadOnly = profile?.rol === "solo_lectura"

  // historial ordenado de más reciente a más antiguo
  const historialOrdenado = useMemo(
    () => [...historial].sort(
      (a, b) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime()
    ),
    [historial]
  )

  const cajaVista = historialOrdenado[cajaSeleccionadaIdx] ?? null

  const movimientosDeCaja = useMemo(
    () => cajaVista ? getMovimientosDeCaja(transacciones, cajaVista) : [],
    [transacciones, cajaVista]
  )

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    await abrirCaja(parseFloat(saldoApertura))
    setSaldoApertura("")
    setCajaSeleccionadaIdx(0)
  }

  const handleCerrarCaja = async (efectivo: number, obs: string) => {
    if (!cajaActual) return
    await cerrarCaja(cajaActual.id, efectivo, obs)
  }

  if (loadingCaja || loadingTrans) {
    return <div className="flex h-40 items-center justify-center text-gray-400">Cargando caja...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-100">Caja</h2>
          <p className="text-gray-400">Control de efectivo y movimientos por día.</p>
        </div>

        {/* Apertura rápida si no hay caja abierta */}
        {!cajaActual && !isReadOnly && (
          <Card className="border-gray-700 bg-gray-900 sm:w-80">
            <CardContent className="pt-4 pb-4">
              <form onSubmit={handleAbrirCaja} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={saldoApertura}
                    onChange={(e) => setSaldoApertura(e.target.value)}
                    placeholder="Saldo inicial (ARS)"
                  />
                </div>
                <Button type="submit">Abrir Caja</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {cajaActual && (
          <Badge className="self-start bg-emerald-900 text-emerald-300 border-emerald-700 px-3 py-1 text-sm">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Caja abierta desde {format(parseISO(cajaActual.fecha_apertura), "HH:mm")}
          </Badge>
        )}
      </div>

      {/* Selector de caja del historial */}
      {historialOrdenado.length > 0 && (
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center justify-between gap-4 py-3 px-4">
            <button
              onClick={() => setCajaSeleccionadaIdx((i) => Math.min(i + 1, historialOrdenado.length - 1))}
              disabled={cajaSeleccionadaIdx >= historialOrdenado.length - 1}
              className="rounded p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-3 text-center">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-100">
                  {cajaVista
                    ? format(parseISO(cajaVista.fecha_apertura), "EEEE d 'de' MMMM yyyy", { locale: es })
                    : "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {cajaSeleccionadaIdx === 0 ? "Caja actual" : `Hace ${cajaSeleccionadaIdx} ${cajaSeleccionadaIdx === 1 ? "día" : "días"}`}
                  {" · "}{historialOrdenado.length} cajas en total
                </p>
              </div>
            </div>

            <button
              onClick={() => setCajaSeleccionadaIdx((i) => Math.max(i - 1, 0))}
              disabled={cajaSeleccionadaIdx === 0}
              className="rounded p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </CardContent>

          {/* Mini historial de días */}
          {historialOrdenado.length > 1 && (
            <div className="border-t border-gray-800 px-4 pb-3 pt-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {historialOrdenado.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setCajaSeleccionadaIdx(i)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      i === cajaSeleccionadaIdx
                        ? "bg-violet-700 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {format(parseISO(c.fecha_apertura), "dd/MM")}
                    {c.estado === "abierta" && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sin historial */}
      {historialOrdenado.length === 0 && (
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="py-16 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No hay cajas registradas.</p>
            {!isReadOnly && (
              <p className="mt-1 text-sm text-gray-500">Abrí la primera caja ingresando el saldo inicial arriba.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detalle de la caja seleccionada */}
      {cajaVista && (
        <DetalleCaja
          caja={cajaVista}
          movimientos={movimientosDeCaja}
          onCerrar={
            cajaVista.estado === "abierta" && cajaSeleccionadaIdx === 0
              ? handleCerrarCaja
              : undefined
          }
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  )
}