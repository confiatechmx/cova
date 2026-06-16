'use client';

import { useState, useEffect } from 'react';

export type UserRole = 'Administrador' | 'Vendedor' | 'Mecánico';

export interface UserSession {
  id: string;
  nombre: string;
  rol: UserRole;
}

export function useRoleAccess() {
  const [currentRole, setCurrentRole] = useState<UserRole>('Administrador');
  const [sessionUser, setSessionUser] = useState<UserSession>({
    id: 'admin-demo-id',
    nombre: 'Administrador Demo',
    rol: 'Administrador'
  });

  useEffect(() => {
    const savedRole = localStorage.getItem('cova_demo_role') as UserRole;
    if (savedRole && ['Administrador', 'Vendedor', 'Mecánico'].includes(savedRole)) {
      updateSession(savedRole);
    }
  }, []);

  const updateSession = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('cova_demo_role', role);

    if (role === 'Administrador') {
      setSessionUser({
        id: 'admin-demo-id',
        nombre: 'Administrador Demo',
        rol: 'Administrador'
      });
    } else if (role === 'Vendedor') {
      setSessionUser({
        id: 'b001bc99-9c0b-4ef8-bb6d-6bb9bd380e51', // Sofía
        nombre: 'Sofía (Ventas)',
        rol: 'Vendedor'
      });
    } else if (role === 'Mecánico') {
      setSessionUser({
        id: 'b001bc99-9c0b-4ef8-bb6d-6bb9bd380e53', // Carlos
        nombre: 'Carlos (Mecánico)',
        rol: 'Mecánico'
      });
    }
  };

  const changeRoleForDemo = (role: UserRole) => {
    updateSession(role);
    // Reload page to reset supabase connection headers if necessary (or just let react state propagate)
    window.location.reload();
  };

  return {
    role: currentRole,
    user: sessionUser,
    changeRoleForDemo,
    isAdmin: currentRole === 'Administrador',
    isSales: currentRole === 'Vendedor',
    isMechanic: currentRole === 'Mecánico'
  };
}
