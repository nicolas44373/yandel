import { NavLink, useNavigate } from "react-router-dom"
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ListOrdered, 
  BarChart3, 
  Settings,
  LogOut,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Ingresos", href: "/ingresos", icon: TrendingUp },
    { name: "Gastos", href: "/gastos", icon: TrendingDown },
    { name: "Caja", href: "/caja", icon: Wallet },
    ...(profile?.rol === 'admin' || profile?.rol === 'solo_lectura' ? [
      { name: "Movimientos", href: "/movimientos", icon: ListOrdered },
      { name: "Reportes", href: "/reportes", icon: BarChart3 },
    ] : []),
    ...(profile?.rol === 'admin' ? [{ name: "Configuración", href: "/configuracion", icon: Settings }] : []),
  ]

  const handleLogout = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 border-r border-gray-800">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-lg font-bold text-gray-100 tracking-tight">
          Malas Influencias
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-emerald-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              )
            }
          >
            <item.icon
              className={cn("mr-3 h-5 w-5 flex-shrink-0")}
              aria-hidden="true"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800 space-y-4">
        {profile && (
          <div className="flex items-center px-3 py-2 text-sm text-gray-300">
            <User className="mr-3 h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-100">{profile.nombre}</p>
              <p className="text-xs text-gray-500 capitalize">{profile.rol.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-rose-400"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
