import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Reportes() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-100">Reportes</h2>
        <p className="text-gray-400">Análisis detallado de las finanzas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Esta sección está en desarrollo. Aquí podrás ver reportes avanzados, exportar a PDF y analizar tendencias a largo plazo.</p>
        </CardContent>
      </Card>
    </div>
  )
}
