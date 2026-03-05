import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { Dashboard } from "./pages/Dashboard"
import { Ingresos } from "./pages/Ingresos"
import { Gastos } from "./pages/Gastos"
import { Caja } from "./pages/Caja"
import { Movimientos } from "./pages/Movimientos"
import { Reportes } from "./pages/Reportes"
import { Configuracion } from "./pages/Configuracion"
import { Login } from "./pages/Login"
import { AuthProvider } from "./contexts/AuthContext"
import { ProtectedRoute } from "./components/ProtectedRoute"

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="ingresos" element={<Ingresos />} />
              <Route path="gastos" element={<Gastos />} />
              <Route path="caja" element={<Caja />} />
              <Route path="movimientos" element={<Movimientos />} />
              <Route path="reportes" element={<Reportes />} />
              {/* Solo admin puede acceder a configuración */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="configuracion" element={<Configuracion />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}
