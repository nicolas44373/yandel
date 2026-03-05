-- Habilitar RLS
-- Tabla de perfiles de usuario
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  nombre TEXT,
  organizacion TEXT,
  rol TEXT DEFAULT 'operador' CHECK (rol IN ('admin','operador','solo_lectura')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de ingresos
CREATE TABLE categorias_ingreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  color TEXT DEFAULT '#00d4aa',
  icono TEXT,
  activa BOOLEAN DEFAULT TRUE,
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de gastos
CREATE TABLE categorias_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  color TEXT DEFAULT '#ff6b4a',
  icono TEXT,
  activa BOOLEAN DEFAULT TRUE,
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacciones (ingresos y gastos unificados)
CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  concepto TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  medio_pago TEXT NOT NULL CHECK (medio_pago IN (
    'efectivo','transferencia','tarjeta_debito',
    'tarjeta_credito','mercado_pago','otro'
  )),
  categoria_id UUID REFERENCES categorias_ingreso(id) ON DELETE SET NULL,
  categoria_gasto_id UUID REFERENCES categorias_gasto(id) ON DELETE SET NULL,
  comprobante TEXT,
  nro_operacion TEXT,
  proveedor_cliente TEXT,
  notas TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cierres de caja
CREATE TABLE cierres_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_apertura TIMESTAMPTZ NOT NULL,
  fecha_cierre TIMESTAMPTZ,
  saldo_apertura NUMERIC(12,2) DEFAULT 0,
  saldo_cierre NUMERIC(12,2),
  total_ingresos NUMERIC(12,2),
  total_gastos NUMERIC(12,2),
  efectivo_contado NUMERIC(12,2),
  diferencia NUMERIC(12,2),
  observaciones TEXT,
  estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO categorias_ingreso (nombre, color, icono) VALUES
  ('Tatuaje','#00d4aa','PenTool'),
  ('Piercing','#60a5fa','Circle'),
  ('Venta de productos (Cremas, etc.)','#fbbf24','ShoppingBag'),
  ('Seña / Reserva','#a78bfa','Calendar'),
  ('Otro','#94a3b8','MoreHorizontal');

INSERT INTO categorias_gasto (nombre, color, icono) VALUES
  ('Alquiler y servicios','#ff6b4a','Home'),
  ('Insumos (Agujas, Tintas, etc.)','#fb923c','Package'),
  ('Porcentaje Tatuadores','#f87171','UserCheck'),
  ('Publicidad y difusión','#e879f9','Megaphone'),
  ('Mantenimiento','#4ade80','Wrench'),
  ('Equipamiento','#facc15','Monitor'),
  ('Impuestos y tasas','#f43f5e','FileText'),
  ('Gastos bancarios','#818cf8','CreditCard'),
  ('Otro','#94a3b8','MoreHorizontal');

-- Row Level Security
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto ENABLE ROW LEVEL SECURITY;

-- Políticas (Simplificadas para el MVP, en producción ajustar según org_id)
CREATE POLICY "usuarios_ven_sus_datos" ON transacciones FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuarios_ven_sus_cierres" ON cierres_caja FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "lectura_publica_categorias_ingreso" ON categorias_ingreso FOR SELECT USING (true);
CREATE POLICY "lectura_publica_categorias_gasto" ON categorias_gasto FOR SELECT USING (true);
CREATE POLICY "lectura_perfiles" ON profiles FOR SELECT USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
