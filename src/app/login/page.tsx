import { login } from './actions'
import { Landmark } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolvedParams = await searchParams;
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
      <div className="flex flex-col items-center justify-center mb-8 gap-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
          <Landmark size={32} strokeWidth={2} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Sistema Cova</h1>
          <p className="text-sm text-zinc-500 font-medium">Inicia sesión para acceder</p>
        </div>
      </div>

      <form className="flex-1 flex flex-col w-full justify-center gap-4 text-foreground bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
        <label className="text-sm font-semibold text-zinc-700 mb-1" htmlFor="email">
          Correo Electrónico
        </label>
        <input
          className="border border-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-zinc-50 text-base p-3 w-full transition-all text-zinc-900 outline-none mb-2"
          name="email"
          placeholder="tu@correo.com"
          required
        />
        <label className="text-sm font-semibold text-zinc-700 mb-1" htmlFor="password">
          Contraseña
        </label>
        <input
          className="border border-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-zinc-50 text-base p-3 w-full transition-all text-zinc-900 outline-none mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        
        <button
          formAction={login}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-3 text-base font-bold transition-colors shadow-sm mb-2"
        >
          Iniciar Sesión
        </button>

        {resolvedParams?.message && (
          <p className="mt-4 p-4 bg-rose-50 text-rose-600 text-center text-sm font-semibold rounded-lg border border-rose-100">
            {resolvedParams.message}
          </p>
        )}
      </form>
    </div>
  )
}
