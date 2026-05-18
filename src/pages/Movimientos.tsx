import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Download } from "lucide-react"
import { useTransacciones } from "@/hooks/useTransacciones"
import ExcelJS from "exceljs"

export function Movimientos() {
  const { transacciones, loading, isAdmin } = useTransacciones()

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

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator  = "Malas Influencias"
    wb.created  = new Date()

    // ── Paleta ─────────────────────────────────────────────────────────────
    const C = {
      headerBg:    "FF17375E",  // azul oscuro
      headerFont:  "FFFFFFFF",  // blanco
      ingresoBg:   "FFE8F5E9",  // verde muy claro
      ingresoFont: "FF1B5E20",  // verde oscuro
      gastoBg:     "FFFDECEA",  // rojo muy claro
      gastoFont:   "FFB71C1C",  // rojo oscuro
      totalBg:     "FFF5F5F5",  // gris claro
      titleFont:   "FF17375E",
      borderColor: "FFBDBDBD",
    }

    const borderThin = (color = C.borderColor): Partial<ExcelJS.Border> =>
      ({ style: "thin", color: { argb: color } })

    const allBorders = (color?: string): Partial<ExcelJS.Borders> => ({
      top: borderThin(color), bottom: borderThin(color),
      left: borderThin(color), right: borderThin(color),
    })

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 1 — MOVIMIENTOS
    // ══════════════════════════════════════════════════════════════════════
    const ws = wb.addWorksheet("Movimientos", {
      views: [{ state: "frozen", ySplit: 4 }],
    })

    const columnas = [
      { header: "Fecha",        key: "fecha",    width: 22 },
      { header: "Tipo",         key: "tipo",     width: 12 },
      { header: "Concepto",     key: "concepto", width: 36 },
      { header: "Categoría",    key: "cat",      width: 26 },
      { header: "Medio de Pago",key: "medio",    width: 20 },
      { header: "Monto (ARS)",  key: "monto",    width: 18 },
      ...(isAdmin ? [{ header: "Empleado", key: "empleado", width: 20 }] : []),
    ]
    ws.columns = columnas

    const colCount = columnas.length

    // Fila 1: título
    ws.mergeCells(1, 1, 1, colCount)
    const titleCell = ws.getCell("A1")
    titleCell.value = "Malas Influencias — Reporte de Movimientos"
    titleCell.font  = { bold: true, size: 14, color: { argb: C.titleFont } }
    titleCell.alignment = { horizontal: "center", vertical: "middle" }
    ws.getRow(1).height = 28

    // Fila 2: rango de fechas y totales filtrados
    ws.mergeCells(2, 1, 2, colCount)
    const subtitleCell = ws.getCell("A2")
    const fechas = transaccionesFiltradas.map((m: any) => new Date(m.fecha).getTime())
    const desde  = fechas.length ? new Date(Math.min(...fechas)) : new Date()
    const hasta  = fechas.length ? new Date(Math.max(...fechas)) : new Date()
    subtitleCell.value = `Período: ${desde.toLocaleDateString("es-AR")} – ${hasta.toLocaleDateString("es-AR")}  |  ${transaccionesFiltradas.length} movimientos`
    subtitleCell.font  = { italic: true, size: 10, color: { argb: "FF757575" } }
    subtitleCell.alignment = { horizontal: "center" }
    ws.getRow(2).height = 18

    // Fila 3: vacía (separador visual)
    ws.getRow(3).height = 6

    // Fila 4: encabezados
    const headerRow = ws.getRow(4)
    headerRow.values = columnas.map(c => c.header)
    headerRow.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: C.headerFont }, size: 11 }
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } }
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false }
      cell.border    = allBorders(C.headerBg)
    })
    headerRow.height = 22
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colCount } }

    // Filas de datos
    let totalIngresos = 0
    let totalGastos   = 0

    transaccionesFiltradas.forEach((m: any) => {
      const esIngreso = m.tipo === "ingreso"
      const monto     = esIngreso ? m.monto : -m.monto
      if (esIngreso) totalIngresos += m.monto
      else           totalGastos   += m.monto

      const values: (string | number)[] = [
        formatDate(m.fecha),
        esIngreso ? "Ingreso" : "Gasto",
        m.concepto,
        esIngreso
          ? (m.categoria_ingreso?.nombre ?? "Sin categoría")
          : (m.categoria_gasto?.nombre  ?? "Sin categoría"),
        m.medio_pago.replace(/_/g, " "),
        monto,
        ...(isAdmin ? [m.empleado_nombre ?? "—"] : []),
      ]

      const row = ws.addRow(values)
      row.eachCell((cell, colIdx) => {
        cell.fill   = { type: "pattern", pattern: "solid",
          fgColor: { argb: esIngreso ? C.ingresoBg : C.gastoBg } }
        cell.font   = { color: { argb: esIngreso ? C.ingresoFont : C.gastoFont }, size: 10 }
        cell.border = allBorders()
        cell.alignment = { vertical: "middle" }
        if (colIdx === 6) {  // columna Monto
          cell.numFmt    = "#,##0.00"
          cell.alignment = { horizontal: "right", vertical: "middle" }
        }
      })
    })

    // Fila de totales
    const totalRow = ws.addRow([
      "", "TOTALES", "", "", "",
      totalIngresos - totalGastos,
      ...(isAdmin ? [""] : []),
    ])
    totalRow.eachCell((cell, colIdx) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } }
      cell.font   = { bold: true, size: 11, color: { argb: C.titleFont } }
      cell.border = allBorders("FF9E9E9E")
      if (colIdx === 6) {
        cell.numFmt    = "#,##0.00"
        cell.alignment = { horizontal: "right", vertical: "middle" }
        cell.font = {
          bold: true, size: 11,
          color: { argb: totalIngresos - totalGastos >= 0 ? C.ingresoFont : C.gastoFont },
        }
      }
    })
    totalRow.height = 20

    // ══════════════════════════════════════════════════════════════════════
    // HOJA 2 — RESUMEN
    // ══════════════════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet("Resumen")
    ws2.columns = [
      { key: "a", width: 30 },
      { key: "b", width: 20 },
    ]

    const addTitle2 = (text: string) => {
      ws2.mergeCells(ws2.rowCount + 1, 1, ws2.rowCount, 2)
      const r = ws2.lastRow!
      r.getCell(1).value = text
      r.getCell(1).font  = { bold: true, size: 13, color: { argb: C.titleFont } }
      r.height = 24
    }
    const addKpi = (label: string, value: number, positive = true) => {
      const r = ws2.addRow([label, value])
      r.getCell(1).font = { size: 11, color: { argb: "FF424242" } }
      r.getCell(2).numFmt    = "#,##0.00"
      r.getCell(2).alignment = { horizontal: "right" }
      r.getCell(2).font = {
        bold: true, size: 11,
        color: { argb: positive ? C.ingresoFont : C.gastoFont },
      }
      r.getCell(1).border = allBorders()
      r.getCell(2).border = allBorders()
      r.height = 20
    }
    const addBlank = () => { ws2.addRow([]) }

    addTitle2("Resumen de Movimientos")
    addBlank()

    ws2.addRow(["Período analizado",
      `${desde.toLocaleDateString("es-AR")} – ${hasta.toLocaleDateString("es-AR")}`])
    ws2.addRow(["Total de registros", transaccionesFiltradas.length])
    addBlank()

    addTitle2("Resultados")
    addKpi("Total Ingresos", totalIngresos, true)
    addKpi("Total Gastos",  -totalGastos,   false)
    const neto = totalIngresos - totalGastos
    addKpi("Saldo Neto", neto, neto >= 0)
    addBlank()

    // Por medio de pago
    addTitle2("Desglose por Medio de Pago")
    const medios: Record<string, { ing: number; gas: number }> = {}
    transaccionesFiltradas.forEach((m: any) => {
      const k = m.medio_pago.replace(/_/g, " ")
      if (!medios[k]) medios[k] = { ing: 0, gas: 0 }
      if (m.tipo === "ingreso") medios[k].ing += m.monto
      else                       medios[k].gas += m.monto
    })

    const medioHeader = ws2.addRow(["Medio", "Ingresos", "Gastos", "Neto"])
    medioHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: C.headerFont } }
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } }
      c.alignment = { horizontal: "center" }
      c.border = allBorders(C.headerBg)
    })
    ws2.getColumn(3).width = 18
    ws2.getColumn(4).width = 18

    Object.entries(medios).forEach(([medio, { ing, gas }]) => {
      const r = ws2.addRow([medio, ing, gas, ing - gas])
      r.getCell(2).numFmt = "#,##0.00"
      r.getCell(3).numFmt = "#,##0.00"
      r.getCell(4).numFmt = "#,##0.00"
      r.eachCell(c => { c.border = allBorders() })
      r.getCell(4).font = { bold: true,
        color: { argb: ing - gas >= 0 ? C.ingresoFont : C.gastoFont } }
    })

    // ── Descarga ────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a   = document.createElement("a")
    a.href     = url
    a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.xlsx`
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
        <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Exportar Excel
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