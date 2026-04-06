import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { BottomNav } from "./Bottomnav"

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar — solo visible en desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {/* Header mobile */}
        <div className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-800 bg-gray-900 px-4 md:hidden">
          <h1 className="text-base font-bold tracking-tight text-gray-100">
            Nicem
          </h1>
        </div>

        <div className="mx-auto max-w-7xl p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — solo visible en mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}