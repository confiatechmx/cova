import { createCompany } from './actions'
import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Si ya tiene perfil, lo mandamos al dashboard
  const { data: perfil } = await supabase.from('perfiles').select('id').eq('id', user.id).single()
  if (perfil) {
    redirect('/tablero')
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen bg-zinc-50">
      <div className="flex flex-col items-center justify-center mb-8 gap-4 mt-12">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
          <Building2 size={32} strokeWidth={2} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Bienvenido a Cova</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">Configura tu taller para empezar</p>
        </div>
      </div>

      <form className="flex-1 flex flex-col w-full gap-4 text-foreground bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block" htmlFor="nombre">
            Tu Nombre Completo
          </label>
          <input
            className="border border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-zinc-50 text-sm p-3 w-full transition-all text-zinc-900 outline-none font-medium"
            name="nombre"
            placeholder="Ej. Juan Pérez"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block" htmlFor="empresa">
            Nombre de tu Taller / Empresa
          </label>
          <input
            className="border border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-zinc-50 text-sm p-3 w-full transition-all text-zinc-900 outline-none font-medium"
            name="empresa"
            placeholder="Ej. AutoService Cova"
            required
          />
        </div>
        
        <button
          formAction={createCompany}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 text-sm font-bold transition-colors shadow-sm w-full"
        >
          Crear mi Espacio de Trabajo
        </button>

        {resolvedParams?.message && (
          <p className="mt-2 p-3 bg-rose-50 text-rose-600 text-center text-xs font-semibold rounded-lg border border-rose-100">
            {resolvedParams.message}
          </p>
        )}
      </form>
    </div>
  )
}
