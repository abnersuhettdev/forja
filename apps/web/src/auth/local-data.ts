// Remoção dos dados locais do usuário na saída sem pendências (RN-052 a). A partir da
// TAR-009 inclui o banco local por usuário; preferências do aparelho (tema) permanecem.
const USER_KEY_PREFIX = "forja.u.";

export function clearUserLocalData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(USER_KEY_PREFIX)) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  } catch {
    // Armazenamento indisponível: nada a remover.
  }
}
