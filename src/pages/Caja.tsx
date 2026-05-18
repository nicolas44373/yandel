import * as React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle,
  ChevronLeft, ChevronRight, Calendar, AlertTriangle, Clock, Users
} from "lucide-react"
import { useCaja, CierreCajaConEmpleado } from "@/hooks/useCaja"
import { useTransacciones } from "@/hooks/useTransacciones"
import { useAuth } from "@/hooks/useAuth"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMovimientosDeCaja(transacciones: any[], caja: CierreCajaConEmpleado) {
  const desde = new Date(caja.fecha_apertura).getTime()
  const hasta = caja.fecha_cierre
    ? new Date(caja.fecha_cierre).getTime()
    : Date.now()

  return transacciones.filter((t) => {
    const f            = new Date(t.fecha).getTime()
    const mismoUsuario = caja.user_id ? t.user_id === caja.user_id : true
    return f >= desde && f <= hasta && mismoUsuario
  })
}

function calcularResumen(movimientos: any[], saldoApertura: number) {
  const sumar = (tipo: string, medio?: string) =>
    movimientos
      .filter((t) => t.tipo === tipo && (medio ? t.medio_pago === medio : true))
      .reduce((s, t) => s + t.monto, 0)

  const ingresosEfectivo = sumar("ingreso", "efectivo")
  const gastosEfectivo   = sumar("gasto",   "efectivo")
  const transferencias   = sumar("ingreso", "transferencia")
  const mercadoPago      = sumar("ingreso", "mercado_pago")
  const tarjetas         = movimientos
    .filter((t) => t.tipo === "ingreso" && ["tarjeta_credito", "tarjeta_debito"].includes(t.medio_pago))
    .reduce((s, t) => s + t.monto, 0)
  const totalIngresos = sumar("ingreso")
  const totalGastos   = sumar("gasto")
  const saldoTeorico  = saldoApertura + ingresosEfectivo - gastosEfectivo

  return {
    ingresosEfectivo, gastosEfectivo,
    transferencias, mercadoPago, tarjetas,
    totalIngresos, totalGastos, saldoTeorico,
  }
}

// ─── Helpers de diferencia ────────────────────────────────────────────────────

function colorDiferencia(diff: number) {
  if (diff === 0) return "text-emerald-400"
  if (diff > 0)   return "text-amber-400"
  return "text-rose-400"
}

function bgDiferencia(diff: number) {
  if (diff === 0) return "bg-emerald-900/20 text-emerald-400"
  if (diff > 0)   return "bg-amber-900/20 text-amber-400"
  return "bg-rose-900/20 text-rose-400"
}

function labelDiferencia(diff: number) {
  if (diff === 0) return "✓ Cuadra exacto"
  if (diff > 0)   return "Sobrante — hay más efectivo del esperado"
  return "Faltante — hay menos efectivo del esperado"
}

// ─── DetalleCaja ─────────────────────────────────────────────────────────────

function DetalleCaja({
  caja,
  movimientos,
  onCerrar,
  isReadOnly,
}: {
  caja:       CierreCajaConEmpleado
  movimientos: any[]
  onCerrar?:  (efectivo: number, obs: string) => Promise<void>
  isReadOnly: boolean
}) {
  const [efectivoContado, setEfectivoContado] = useState("")
  const [observaciones, setObservaciones]     = useState("")
  const [cerrando, setCerrando]               = useState(false)

  const r        = calcularResumen(movimientos, caja.saldo_apertura)
  const abierta  = caja.estado === "abierta"

  // Diferencia al cierre (caja ya cerrada)
  const diferencia = !abierta
    ? (caja.efectivo_contado ?? 0) - r.saldoTeorico
    : null

  // Diferencia en tiempo real mientras se tipea el arqueo
  const diffPreview = efectivoContado !== ""
    ? parseFloat(efectivoContado) - r.saldoTeorico
    : null

  const handleCierre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCerrar) return
    setCerrando(true)
    await onCerrar(parseFloat(efectivoContado), observaciones)
    setCerrando(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Header estado ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {abierta ? (
          <Badge className="bg-emerald-900 text-emerald-300 border-emerald-700">
            <Clock className="mr-1 h-3 w-3" /> Abierta
          </Badge>
        ) : (
          <Badge className="bg-gray-800 text-gray-400 border-gray-700">Cerrada</Badge>
        )}

        {caja.profiles?.nombre && (
          <Badge className="bg-violet-900/50 text-violet-300 border-violet-700">
            <Users className="mr-1 h-3 w-3" />
            {caja.profiles.nombre}
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

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon:  <Wallet className="h-4 w-4 text-gray-400" />,
            bg:    "bg-gray-800",
            label: "Saldo Apertura",
            value: formatCurrency(caja.saldo_apertura),
            color: "text-gray-100",
          },
          {
            icon:  <ArrowUpCircle className="h-4 w-4 text-emerald-400" />,
            bg:    "bg-emerald-900/50",
            label: "Ingresos Efectivo",
            value: formatCurrency(r.ingresosEfectivo),
            color: "text-emerald-400",
          },
          {
            icon:  <ArrowDownCircle className="h-4 w-4 text-rose-400" />,
            bg:    "bg-rose-900/50",
            label: "Gastos Efectivo",
            value: `-${formatCurrency(r.gastosEfectivo)}`,
            color: "text-rose-400",
          },
          {
            icon:  <CheckCircle className="h-4 w-4 text-emerald-400" />,
            bg:    "bg-emerald-900/50",
            label: "Saldo Teórico",
            value: formatCurrency(r.saldoTeorico),
            color: "text-emerald-400",
          },
        ].map(({ icon, bg, label, value, color }) => (
          <Card key={label} className="border-gray-800 bg-gray-900">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className={`rounded-full p-2 ${bg}`}>{icon}</div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Otros medios ────────────────────────────────────────────────── */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base text-gray-100">Otros Medios de Cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Transferencias",      valor: r.transferencias },
              { label: "Mercado Pago",         valor: r.mercadoPago   },
              { label: "Tarjetas Cred./Déb.",  valor: r.tarjetas      },
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

        {/* ── Arqueo / resultado cierre ────────────────────────────────────── */}
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

                  {/* Preview de diferencia en tiempo real */}
                  {diffPreview !== null && (
                    <div className={`mt-1 flex items-center justify-between rounded-md px-3 py-2 text-xs ${bgDiferencia(diffPreview)}`}>
                      <span className="flex items-center gap-1.5">
                        {diffPreview !== 0 && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        {labelDiferencia(diffPreview)}
                      </span>
                      <span className="font-mono font-semibold">
                        {diffPreview > 0 ? "+" : ""}{formatCurrency(diffPreview)}
                      </span>
                    </div>
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
              {[
                { label: "Saldo teórico",    value: formatCurrency(r.saldoTeorico)              },
                { label: "Efectivo contado", value: formatCurrency(caja.efectivo_contado ?? 0)  },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-mono text-gray-200">{value}</span>
                </div>
              ))}

              {/* Diferencia con color correcto */}
              <div className="flex justify-between pt-1 font-semibold">
                <span className="text-gray-200">Diferencia</span>
                <span className={`font-mono ${diferencia !== null ? colorDiferencia(diferencia) : ""}`}>
                  {diferencia !== null
                    ? `${diferencia > 0 ? "+" : ""}${formatCurrency(diferencia)}`
                    : "—"}
                </span>
              </div>

              {/* Alerta con color correcto: amarillo = sobrante, rojo = faltante */}
              {diferencia !== null && diferencia !== 0 && (
                <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${bgDiferencia(diferencia)}`}>
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {diferencia > 0 ? "Sobrante en caja" : "Faltante en caja"}
                    </p>
                    <p className="opacity-75">
                      {diferencia > 0
                        ? "Hay más efectivo del esperado según el registro."
                        : "Hay menos efectivo del esperado según el registro."}
                    </p>
                  </div>
                </div>
              )}

              {diferencia === 0 && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-900/20 px-3 py-2 text-xs text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Cierre exacto — el efectivo cuadra perfectamente.
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

      {/* ── Movimientos ───────────────────────────────────────────────────── */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base text-gray-100">
            Movimientos ({movimientos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Sin movimientos registrados en esta caja.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-800">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="border-b border-gray-800 bg-gray-900/50 text-xs uppercase text-gray-400">
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
                      <td className="px-4 py-2.5 tabular-nums text-gray-500">
                        {format(parseISO(mov.fecha), "HH:mm")}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-100">{mov.concepto}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">
                          {mov.tipo === "ingreso"
                            ? (mov.categoria_ingreso?.nombre ?? "Sin categoría")
                            : (mov.categoria_gasto?.nombre  ?? "Sin categoría")}
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

// ─── Componente principal ─────────────────────────────────────────────────────

export function Caja() {
  const {
    cajaActual,
    historial,
    loading:  loadingCaja,
    abrirCaja,
    cerrarCaja,
    isAdmin,
  } = useCaja()

  const { transacciones, loading: loadingTrans } = useTransacciones()
  const { profile } = useAuth()

  const [saldoApertura, setSaldoApertura]             = useState("")
  const [cajaSeleccionadaIdx, setCajaSeleccionadaIdx] = useState(0)

  const isReadOnly = profile?.rol === "solo_lectura"

  // Saldo teórico real: apertura + ingresos efectivo - gastos efectivo por cada caja abierta
  const totalCajasAbiertas = useMemo(
    () =>
      historial
        .filter(c => c.estado === "abierta")
        .reduce((sum, caja) => {
          const movs = getMovimientosDeCaja(transacciones, caja)
          const { saldoTeorico } = calcularResumen(movs, caja.saldo_apertura)
          return sum + saldoTeorico
        }, 0),
    [historial, transacciones]
  )

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
    const movs = getMovimientosDeCaja(transacciones, cajaActual)
    const r    = calcularResumen(movs, cajaActual.saldo_apertura)
    await cerrarCaja(cajaActual.id, efectivo, obs, {
      totalIngresos: r.totalIngresos,
      totalGastos:   r.totalGastos,
      saldoTeorico:  r.saldoTeorico,
    })
  }

  const puedesCerrarEstaVista =
    cajaVista?.estado === "abierta" &&
    cajaSeleccionadaIdx === 0 &&
    (!isAdmin || cajaVista?.user_id === cajaActual?.user_id)

  if (loadingCaja || loadingTrans) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        Cargando caja...
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-100">Caja</h2>
          <p className="text-gray-400">Control de efectivo y movimientos por día.</p>
        </div>

        {isAdmin && historial.filter(c => c.estado === "abierta").length > 0 && (
          <Card className="border-violet-500/20 bg-violet-900/10 sm:w-auto">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <Users className="h-4 w-4 text-violet-400" />
              <div>
                <p className="text-xs text-gray-400">Cajas abiertas</p>
                <p className="text-sm font-bold text-violet-300">
                  {historial.filter(c => c.estado === "abierta").length} empleados
                  {" · "}{formatCurrency(totalCajasAbiertas)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!cajaActual && !isReadOnly && (
          <Card className="border-gray-700 bg-gray-900 sm:w-80">
            <CardContent className="pb-4 pt-4">
              <form onSubmit={handleAbrirCaja} className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={saldoApertura}
                  onChange={(e) => setSaldoApertura(e.target.value)}
                  placeholder="Saldo inicial (ARS)"
                  className="flex-1"
                />
                <Button type="submit">Abrir Caja</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {cajaActual && (
          <Badge className="self-start border-emerald-700 bg-emerald-900 px-3 py-1 text-sm text-emerald-300">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Caja abierta desde {format(parseISO(cajaActual.fecha_apertura), "HH:mm")}
          </Badge>
        )}
      </div>

      {/* ── Selector historial ───────────────────────────────────────────── */}
      {historialOrdenado.length > 0 && (
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
            <button
              onClick={() => setCajaSeleccionadaIdx(i => Math.min(i + 1, historialOrdenado.length - 1))}
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
                  {cajaSeleccionadaIdx === 0
                    ? "Caja actual"
                    : `Hace ${cajaSeleccionadaIdx} ${cajaSeleccionadaIdx === 1 ? "día" : "días"}`}
                  {" · "}{historialOrdenado.length} cajas en total
                  {isAdmin && cajaVista?.profiles?.nombre && (
                    <span className="ml-1 text-violet-400">· {cajaVista.profiles.nombre}</span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => setCajaSeleccionadaIdx(i => Math.max(i - 1, 0))}
              disabled={cajaSeleccionadaIdx === 0}
              className="rounded p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </CardContent>

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
                    {isAdmin && c.profiles?.nombre && (
                      <span className="ml-1 opacity-60">
                        {c.profiles.nombre.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    )}
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

      {/* ── Sin historial ────────────────────────────────────────────────── */}
      {historialOrdenado.length === 0 && (
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="py-16 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No hay cajas registradas.</p>
            {!isReadOnly && (
              <p className="mt-1 text-sm text-gray-500">
                Abrí la primera caja ingresando el saldo inicial arriba.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Detalle ──────────────────────────────────────────────────────── */}
      {cajaVista && (
        <DetalleCaja
          caja={cajaVista}
          movimientos={movimientosDeCaja}
          onCerrar={puedesCerrarEstaVista ? handleCerrarCaja : undefined}
          isReadOnly={isReadOnly}
        />
      )}

    </div>
  )
}