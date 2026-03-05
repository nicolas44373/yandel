export type MedioPago = 
  'efectivo' | 'transferencia' | 'tarjeta_debito' | 
  'tarjeta_credito' | 'mercado_pago' | 'otro';

export type TipoTransaccion = 'ingreso' | 'gasto';

export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  fecha: string;
  concepto: string;
  monto: number;
  medio_pago: MedioPago;
  categoria_id?: string;
  categoria_gasto_id?: string;
  comprobante?: string;
  nro_operacion?: string;
  proveedor_cliente?: string;
  notas?: string;
  user_id: string;
  created_at: string;
}

export interface CierreCaja {
  id: string;
  fecha_apertura: string;
  fecha_cierre?: string;
  saldo_apertura: number;
  saldo_cierre?: number;
  total_ingresos?: number;
  total_gastos?: number;
  efectivo_contado?: number;
  diferencia?: number;
  observaciones?: string;
  estado: 'abierta' | 'cerrada';
}

export interface Categoria {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  activa: boolean;
}
