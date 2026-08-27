export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Heslo musí mať aspoň 8 znakov.';
  if (!/[a-z]/.test(password)) return 'Heslo musí obsahovať aspoň jedno malé písmeno.';
  if (!/[A-Z]/.test(password)) return 'Heslo musí obsahovať aspoň jedno veľké písmeno.';
  if (!/[0-9]/.test(password)) return 'Heslo musí obsahovať aspoň jednu číslicu.';
  return null;
}

export function validateNickname(nickname: string): string | null {
  if (nickname.length < 3 || nickname.length > 20) return 'Prezývka musí mať 3 až 20 znakov.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(nickname)) return 'Prezývka môže obsahovať iba písmená, číslice, bodku, pomlčku a podčiarkovník.';
  return null;
}
