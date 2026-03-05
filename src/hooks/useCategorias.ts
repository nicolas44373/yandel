import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Categoria {
  id: string;
  nombre: string;
}

// Exportamos los mocks para poder usarlos si es necesario, o los manejamos internamente
export const MOCK_CATEGORIAS_INGRESO: Categoria[] = [
  { id: '1', nombre: 'Tatuaje' },
  { id: '2', nombre: 'Piercing' },
  { id: '3', nombre: 'Venta de productos' },
  { id: '4', nombre: 'Seña / Reserva' },
]

export const MOCK_CATEGORIAS_GASTO: Categoria[] = [
  { id: '1', nombre: 'Alquiler y servicios' },
  { id: '2', nombre: 'Insumos' },
  { id: '3', nombre: 'Porcentaje Tatuadores' },
  { id: '4', nombre: 'Publicidad y difusión' },
]

const getMockCategorias = (tipo: 'ingreso' | 'gasto'): Categoria[] => {
  const key = `mock_categorias_${tipo}`
  const stored = localStorage.getItem(key)
  if (stored) {
    return JSON.parse(stored)
  }
  const initialData = tipo === 'ingreso' ? MOCK_CATEGORIAS_INGRESO : MOCK_CATEGORIAS_GASTO
  localStorage.setItem(key, JSON.stringify(initialData))
  return initialData
}

const saveMockCategorias = (tipo: 'ingreso' | 'gasto', data: Categoria[]) => {
  const key = `mock_categorias_${tipo}`
  localStorage.setItem(key, JSON.stringify(data))
}

export function useCategorias(tipo: 'ingreso' | 'gasto') {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)

  const tabla = tipo === 'ingreso' ? 'categorias_ingreso' : 'categorias_gasto'

  const fetchCategorias = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from(tabla).select('*').order('nombre')
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          setIsMock(true)
          setCategorias(getMockCategorias(tipo))
          return
        }
        throw error
      }
      setCategorias(data as Categoria[])
      setIsMock(false)
    } catch (err) {
      console.error(`Error fetching ${tabla}:`, err)
      setIsMock(true)
      setCategorias(getMockCategorias(tipo))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategorias()
  }, [tipo])

  const addCategoria = async (nombre: string) => {
    if (isMock) {
      const newCat = { id: Math.random().toString(), nombre }
      const currentMockData = getMockCategorias(tipo)
      const updatedMockData = [...currentMockData, newCat].sort((a, b) => a.nombre.localeCompare(b.nombre))
      saveMockCategorias(tipo, updatedMockData)

      setCategorias(updatedMockData)
      return { data: newCat, error: null }
    }
    try {
      const { data, error } = await supabase.from(tabla).insert([{ nombre }]).select().single()
      if (error) throw error
      setCategorias(prev => [...prev, data as Categoria].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteCategoria = async (id: string) => {
    if (isMock) {
      const currentMockData = getMockCategorias(tipo)
      const updatedMockData = currentMockData.filter(c => c.id !== id)
      saveMockCategorias(tipo, updatedMockData)

      setCategorias(updatedMockData)
      return { error: null }
    }
    try {
      const { error } = await supabase.from(tabla).delete().eq('id', id)
      if (error) throw error
      setCategorias(prev => prev.filter(c => c.id !== id))
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { categorias, loading, addCategoria, deleteCategoria }
}
