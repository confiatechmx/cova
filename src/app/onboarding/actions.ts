'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const empresaNombre = formData.get('empresa') as string
  const usuarioNombre = formData.get('nombre') as string

  if (!empresaNombre || !usuarioNombre) {
    redirect('/onboarding?message=Faltan+datos')
  }

  const { error } = await supabase.rpc('crear_empresa_y_perfil', {
    p_nombre_empresa: empresaNombre,
    p_nombre_usuario: usuarioNombre
  })

  if (error) {
    console.error(error)
    redirect('/onboarding?message=Error+al+crear+la+empresa')
  }

  revalidatePath('/', 'layout')
  redirect('/tablero')
}
