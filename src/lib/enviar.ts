import { startTransition } from "react";

/**
 * onSubmit que envía el formulario a una acción sin que React 19 lo reinicie al terminar
 * (con `action={...}` los campos sin control vuelven a su valor inicial y se pierde lo escrito).
 */
export function enviar(despachar: (datos: FormData) => void) {
  return (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    startTransition(() => despachar(datos));
  };
}
