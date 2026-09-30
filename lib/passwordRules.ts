export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Heslo musí mít alespoň 8 znaků.';
  if (!/[a-z]/.test(password)) return 'Heslo musí obsahovat alespoň jedno malé písmeno.';
  if (!/[A-Z]/.test(password)) return 'Heslo musí obsahovat alespoň jedno velké písmeno.';
  if (!/[0-9]/.test(password)) return 'Heslo musí obsahovat alespoň jednu číslici.';
  return null;
}

export function validateNickname(nickname: string): string | null {
  if (nickname.length < 3 || nickname.length > 20) return 'Prezývka musí mať 3 až 20 znakov.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(nickname)) return 'Přezdívka může obsahovat jen písmena, číslice, tečku, pomlčku a podtržítko.';
  return null;
}
