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
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from '@/hooks/useAuth'
import { useState } from "react"

export function BottomNav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)

  const mainItems = [
    { name: "Dashboard", href: "/",         icon: LayoutDashboard },
    { name: "Ingresos",  href: "/ingresos", icon: TrendingUp      },
    { name: "Gastos",    href: "/gastos",   icon: TrendingDown    },
    { name: "Caja",      href: "/caja",     icon: Wallet          },
  ]

  const moreItems = [
    ...(profile?.rol === "admin" || profile?.rol === "solo_lectura"
      ? [
          { name: "Movimientos", href: "/movimientos", icon: ListOrdered },
          { name: "Reportes",    href: "/reportes",    icon: BarChart3   },
        ]
      : []),
    ...(profile?.rol === "admin"
      ? [{ name: "Configuración", href: "/configuracion", icon: Settings }]
      : []),
  ]

  const handleLogout = async () => {
    setShowMore(false)
    await signOut()
    navigate("/login")
  }

  return (
    <>
      {/* Overlay del menú "Más" */}
      {showMore && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Panel "Más" */}
      {showMore && (
        <div className="fixed bottom-16 left-0 right-0 z-40 mx-3 mb-2 rounded-2xl border border-gray-700 bg-gray-900 p-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {moreItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-800 text-emerald-400"
                      : "text-gray-300 hover:bg-gray-800"
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-rose-400"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center justify-around px-2 py-1">
          {mainItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors min-w-0",
                  isActive
                    ? "text-emerald-400"
                    : "text-gray-500 hover:text-gray-300"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", isActive && "text-emerald-400")} />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Botón "Más" */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              showMore ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Más</span>
          </button>
        </div>
      </div>
    </>
  )
}