export function calculateAge(birthDate: Date, deathDate: Date | null): number {
  const end = deathDate || new Date();
  let age = end.getFullYear() - birthDate.getFullYear();
  const m = end.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birthDate.getDate())) age--;
  return age;
}
